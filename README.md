# cdk-cloudfront-proxy

An AWS CDK construct that creates a serverless reverse proxy using CloudFront and Lambda, routing traffic to private origins (e.g., ECS containers in a VPC) — without requiring a load balancer.

## Architecture

```
Internet → CloudFront (WAF + DDoS) → Lambda Function URL → VPC → Private endpoints
```

- CloudFront handles SSL termination, WAF, DDoS protection, and caching (optional)
- Lambda runs inside your VPC and proxies requests to private resources based on domain routing rules
- Origin Access Control (OAC) ensures Lambda is only reachable via CloudFront
- No Application Load Balancer required
- Supports wildcard domain matching

## Installation

Requires a GitHub token with `read:packages` permission and the following `.npmrc` in your project:

*<to-be-completed>*

## Usage

### Basic Example

```typescript
import { CloudFrontProxy } from '@trucoit/cdk-cloudfront-proxy';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

const proxy = new CloudFrontProxy(this, 'Proxy', {
  routingRules: {
    'api.example.com': {
      target: 'internal.api.local',
      port: 8080,
      protocol: 'http'
    },
    'www.example.com': {
      target: 'internal.web.local',
      port: 443,
      protocol: 'https'
    }
  },
  vpc: myVpc,
});

// Access the CloudFront distribution URL
new CfnOutput(this, 'ProxyUrl', {
  value: proxy.distribution.distributionDomainName,
});
```

### Wildcard Domains

```typescript
const proxy = new CloudFrontProxy(this, 'Proxy', {
  routingRules: {
    '*.cdn.example.com': {
      target: 'internal.cdn.local',
      port: 443,
      protocol: 'https'
    }
  },
  vpc: myVpc,
});
```

### With Caching Enabled

```typescript
import { Duration } from 'aws-cdk-lib';

const proxy = new CloudFrontProxy(this, 'Proxy', {
  routingRules: {
    'static.example.com': {
      target: 'internal.static.local'
    }
  },
  vpc: myVpc,
  enableCaching: true,
  cacheTtl: Duration.hours(1),
});
```

### With Access Logs

```typescript
import * as s3 from 'aws-cdk-lib/aws-s3';

const logBucket = new s3.Bucket(this, 'LogBucket');

const proxy = new CloudFrontProxy(this, 'Proxy', {
  routingRules: { /* ... */ },
  vpc: myVpc,
  enableAccessLogs: true,
  logBucket,
  logPrefix: 'my-proxy-logs/',
});
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `routingRules` | `Record<string, UpstreamConfig>` | Yes | - | Domain-to-upstream mapping (supports wildcards) |
| `vpc` | `IVpc` | Yes | - | VPC for Lambda function |
| `vpcSubnets` | `SubnetSelection` | No | `PRIVATE_WITH_EGRESS` | Subnet selection for Lambda |
| `securityGroups` | `ISecurityGroup[]` | No | New SG created | Security groups for Lambda |
| `lambdaMemory` | `number` | No | `512` | Lambda memory in MB |
| `lambdaTimeout` | `Duration` | No | `30 seconds` | Lambda timeout |
| `lambdaArchitecture` | `Architecture` | No | `ARM_64` | Lambda architecture |
| `priceClass` | `PriceClass` | No | `PRICE_CLASS_100` | CloudFront price class |
| `enableCaching` | `boolean` | No | `false` | Enable CloudFront caching |
| `cacheTtl` | `Duration` | No | `0 seconds` | Cache TTL when caching enabled |
| `comment` | `string` | No | - | CloudFront distribution comment |
| `enableAccessLogs` | `boolean` | No | `false` | Enable S3 access logs |
| `logBucket` | `IBucket` | No | - | S3 bucket for logs (required if `enableAccessLogs=true`) |
| `logPrefix` | `string` | No | `cloudfront-logs/` | S3 prefix for logs |
| `enableWaf` | `boolean` | No | `false` | Enable AWS WAF |
| `wafWebAcl` | `CfnWebACL` | No | - | WAF Web ACL (required if `enableWaf=true`) |

### UpstreamConfig

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `target` | `string` | Yes | - | Upstream hostname or IP |
| `port` | `number` | No | `443` (https) / `80` (http) | Upstream port |
| `protocol` | `'http' \| 'https'` | No | `https` | Upstream protocol |

## Outputs

| Property | Type | Description |
|----------|------|-------------|
| `distribution` | `cloudfront.Distribution` | The CloudFront distribution |
| `proxyFunction` | `lambda.Function` | The Lambda proxy function |
| `functionUrl` | `lambda.FunctionUrl` | The Lambda Function URL (locked to CloudFront via OAC) |

## How It Works

The construct creates a complete serverless reverse proxy:

1. **CloudFront Distribution**: Handles SSL termination, caching (optional), and DDoS protection via AWS Shield Standard
2. **Lambda Function URL**: Provides an HTTPS endpoint with IAM authentication
3. **Origin Access Control (OAC)**: Locks the Lambda Function URL to CloudFront only — direct access returns `403`
4. **Lambda Proxy**: Runs in your VPC with configurable memory (default 512 MB) and timeout (default 30 seconds)
5. **Domain Routing**: Routes requests based on the Host header to different upstream targets
6. **Wildcard Support**: Match multiple subdomains with patterns like `*.cdn.example.com`

## Security

- Lambda Function URL is locked to CloudFront via Origin Access Control (OAC) using IAM — direct access returns `403`
- CloudFront includes AWS Shield Standard for DDoS protection
- Lambda runs inside your VPC for private resource access
- HTTPS enforced between CloudFront and Lambda (always)
- HTTP to HTTPS redirect enabled by default
- IAM authentication required for all CloudFront to Lambda communication

## Limitations

- **Maximum request/response size**: 6 MB (Lambda limit)
- **Maximum request duration**: 60 seconds (CloudFront origin timeout)
- **No WebSocket support**: Lambda Function URLs don't support WebSockets
- **Cold starts**: 1-3 seconds for first request after idle period
- **Not recommended for**: >50M requests/month (consider ALB for very high traffic)
- **No connection pooling**: Each Lambda invocation creates new upstream connections

## Cost Optimization

- Uses **CloudFront Free Tier**: 1TB data transfer + 10M requests/month (first 12 months)
- Uses **CloudFront Free Plan**: $0/month for basic usage (permanent)
- **ARM64 Lambda**: ~20% cheaper than x86_64
- **Price Class 100**: Cheapest CloudFront option (North America + Europe)
- **No ALB**: Saves ~$16-20/month

## Contributing

Contributions and feedback are welcome! See [CONTRIBUTING](./CONTRIBUTING.md) for details.

## Code of Conduct

Please review the [Code of Conduct](./CODE_OF_CONDUCT.md).

## License

Distributed under the [MIT License](./LICENSE).
