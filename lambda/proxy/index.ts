import { Handler } from 'aws-lambda';
import * as http from 'http';
import * as https from 'https';

interface UpstreamConfig {
  target: string;
  port?: number;
  protocol?: 'http' | 'https';
}

type RoutingRules = Record<string, UpstreamConfig>;

const ROUTING_RULES: RoutingRules = JSON.parse(process.env.ROUTING_RULES || '{}');
const LOG_LEVEL = process.env.LOG_LEVEL || 'INFO'; // DEBUG, INFO, ERROR

function log(level: string, ...args: any[]) {
  const levels = { DEBUG: 0, INFO: 1, ERROR: 2 };
  const currentLevel = levels[LOG_LEVEL as keyof typeof levels] ?? 1;
  const messageLevel = levels[level as keyof typeof levels] ?? 1;
  
  if (messageLevel >= currentLevel) {
    console.log(`[${level}]`, ...args);
  }
}

function matchDomain(host: string, rules: RoutingRules): UpstreamConfig | null {
  log('DEBUG', 'Matching host:', host);
  log('DEBUG', 'Available rules:', Object.keys(rules));
  
  // Exact match first
  if (rules[host]) {
    log('INFO', 'Exact match found:', host);
    return rules[host];
  }

  // Wildcard match
  for (const [pattern, config] of Object.entries(rules)) {
    // Match '*' (catch-all)
    if (pattern === '*') {
      log('INFO', 'Catch-all match found');
      return config;
    }
    
    // Match '*.domain.com'
    if (pattern.startsWith('*.')) {
      const suffix = pattern.slice(1); // Remove *
      if (host.endsWith(suffix)) {
        log('INFO', 'Wildcard match found:', pattern);
        return config;
      }
    }
  }

  log('INFO', 'No match found for host:', host);
  return null;
}

export const handler: Handler = async (event) => {
  log('DEBUG', 'Incoming request:', JSON.stringify(event, null, 2));
  
  const host = event.headers?.host || event.headers?.Host;
  const method = event.requestContext?.http?.method || 'GET';
  const path = event.rawPath || '/';

  if (!host) {
    log('ERROR', 'Missing Host header');
    return {
      statusCode: 400,
      body: 'Bad Request: Missing Host header',
    };
  }

  const upstream = matchDomain(host, ROUTING_RULES);

  if (!upstream) {
    log('ERROR', 'No upstream found for host:', host);
    return {
      statusCode: 502,
      body: 'Bad Gateway: No upstream configured for this domain',
    };
  }

  const protocol = upstream.protocol || 'https';
  const port = upstream.port || (protocol === 'https' ? 443 : 80);
  const client = protocol === 'https' ? https : http;
  
  log('INFO', `${method} ${host}${path} -> ${protocol}://${upstream.target}:${port}${path}`);
  log('INFO', 'Upstream config:', upstream);

  return new Promise((resolve) => {
    const options = {
      hostname: upstream.target,
      port,
      path: event.rawPath || '/',
      method: event.requestContext?.http?.method || 'GET',
      headers: {
        ...event.headers,
        host: upstream.target,
        'x-forwarded-for': event.requestContext?.http?.sourceIp || '',
        'x-forwarded-proto': 'https',
        'x-forwarded-host': host,
      },
    };

    const req = client.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode || 200,
          headers: res.headers as Record<string, string>,
          body,
        });
      });
    });

    req.on('error', (error) => {
      log('ERROR', 'Upstream request failed:', error.message);
      log('DEBUG', error);
      resolve({
        statusCode: 503,
        body: 'Service Unavailable: Upstream connection failed',
      });
    });

    req.setTimeout(25000, () => {
      req.destroy();
      resolve({
        statusCode: 504,
        body: 'Gateway Timeout: Upstream request timed out',
      });
    });

    if (event.body) {
      req.write(event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body);
    }

    req.end();
  });
};
