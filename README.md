# cdk-cloudfront-proxy

An AWS CDK construct that creates a serverless reverse proxy using CloudFront and Lambda, routing traffic to a private origin (e.g., an ECS container in a VPC) — without requiring a load balancer.

## Architecture

```
Internet → CloudFront (WAF + DDoS) → Lambda Function URL → VPC → Private endpoint (can be ECS, EC2, etc)
```

- CloudFront handles SSL termination, WAF, DDoS protection, and caching (if needed)
- Lambda runs inside your VPC and proxies requests to private resources
- Origin Access Control (OAC) ensures Lambda is only reachable via CloudFront
- No Application Load Balancer required

## Installation

Requires a GitHub token with `read:packages` permission and the following `.npmrc` in your project:

```
@trucoit:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

Then install:

```bash
npm install @trucoit/cdk-cloudfront-proxy
```

## Usage

```typescript
import { CloudFrontProxy } from '@trucoit/cdk-cloudfront-proxy';

const proxy = new CloudFrontProxy(this, 'Proxy', {
  originDomain: '10.0.1.50:8080',  // Private ECS container
  vpc: myVpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
});

// Access the CloudFront distribution URL
new CfnOutput(this, 'ProxyUrl', {
  value: proxy.distribution.distributionDomainName,
});
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `originDomain` | `string` | ✅ | Origin host:port to proxy to (e.g., `10.0.1.50:8080`) |
| `vpc` | `IVpc` | ❌ | VPC for Lambda. Required for private origin access |
| `vpcSubnets` | `SubnetSelection` | ❌ | Subnet selection for Lambda within the VPC |

## Outputs

| Property | Type | Description |
|----------|------|-------------|
| `distribution` | `cloudfront.Distribution` | The CloudFront distribution |
| `proxyFunction` | `lambda.Function` | The Lambda proxy function |
| `functionUrl` | `lambda.FunctionUrl` | The Lambda Function URL (locked to CloudFront via OAC) |

## Security

- Lambda Function URL is locked to CloudFront via **Origin Access Control (OAC)**, via IAM — direct access returns `403`
- CloudFront includes **AWS WAF** and **AWS Shield Standard** by default
- Lambda runs inside your **VPC**

## Contributing

Contributions and feedback are welcome! See [CONTRIBUTING](./CONTRIBUTING.md) for details.

## Code of Conduct

Please review the [Code of Conduct](./CODE_OF_CONDUCT.MD).

## License

Distributed under the [MIT License](./LICENSE).
