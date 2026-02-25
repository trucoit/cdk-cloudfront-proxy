# Examples

This directory contains example CDK applications demonstrating how to use the `cdk-cloudfront-proxy` construct.

## Running Examples Locally

To test local changes to the construct:

### 1. Build the construct

From the root of the repository:

```bash
cd /path/to/cdk-cloudfront-proxy
npm run build
```

### 2. Navigate to an example

```bash
cd examples/nginx-proxy-example
```

### 3. Install dependencies

This will install the local construct via `file:../..` reference:

```bash
npm install
```

### 4. Bootstrap CDK (first time only)

```bash
npm run cdk bootstrap
```

### 5. Deploy the example

```bash
npm run cdk deploy
```

### 6. Test the deployment

Use the CloudFront URL from the output:

```bash
curl https://<cloudfront-domain>.cloudfront.net
```

You should see the NGINX welcome page.

### 7. Clean up

```bash
npm run cdk destroy
```

---

## Available Examples

### nginx-proxy-example

Complete example showing CloudFront → Lambda → ECS Fargate with NGINX.

**Architecture:**
```
Internet → CloudFront → Lambda (VPC) → ECS Fargate (2 tasks, NGINX)
```

**Features:**
- Creates a new VPC with private subnets and NAT Gateway
- ECS Fargate service with 2 NGINX tasks
- CloudMap private DNS (`nginx.internal.local`)
- Security groups: Lambda can only reach ECS
- ECS only accepts traffic from Lambda
- Wildcard routing rule to forward all traffic to ECS

**Note:** This example creates a VPC with a NAT Gateway for private subnet internet access. To reduce costs, you can use an existing VPC with private subnets.

---

## Usage Samples

### Wildcard Domains

```typescript
import { CloudFrontProxy } from '@trucoit/cdk-cloudfront-proxy';

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
import { CloudFrontProxy } from '@trucoit/cdk-cloudfront-proxy';
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
import { CloudFrontProxy } from '@trucoit/cdk-cloudfront-proxy';
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

---

## Developing with Local Changes

When making changes to the construct:

1. Make changes in `/src`
2. Rebuild: `npm run build` (from root)
3. The example will automatically use the updated local version
4. Redeploy: `npm run cdk deploy` (from example directory)

**Note:** The `package.json` uses `"@trucoit/cdk-cloudfront-proxy": "file:../.."` to reference the local construct.
