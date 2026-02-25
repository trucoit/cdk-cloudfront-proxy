import * as cdk from 'aws-cdk-lib';

/**
 * Upstream target configuration for routing.
 */
export interface UpstreamConfig {
  /**
   * Target hostname or IP address.
   * @example "internal.domain1.internal"
   */
  readonly target: string;

  /**
   * Target port.
   * @default 443 for https, 80 for http
   */
  readonly port?: number;

  /**
   * Protocol to use for upstream connection.
   * @default 'https'
   */
  readonly protocol?: 'http' | 'https';
}

/**
 * Configuration properties for the CloudFrontProxy construct.
 */
export interface CloudFrontProxyProps {
  /**
   * Routing rules mapping incoming domains to upstream targets.
   * Supports wildcard domains (e.g., "*.example.com").
   * 
   * @example
   * {
   *   "api.example.com": {
   *     target: "internal.api.local",
   *     port: 8080,
   *     protocol: "http"
   *   },
   *   "*.cdn.example.com": {
   *     target: "internal.cdn.local",
   *     port: 443,
   *     protocol: "https"
   *   }
   * }
   */
  readonly routingRules: Record<string, UpstreamConfig>;

  /**
   * VPC to deploy the Lambda proxy function into.
   * Required for accessing private resources.
   */
  readonly vpc: cdk.aws_ec2.IVpc;

  /**
   * VPC subnets for the Lambda function.
   * @default PRIVATE_WITH_EGRESS
   */
  readonly vpcSubnets?: cdk.aws_ec2.SubnetSelection;

  /**
   * Security groups for the Lambda function.
   * @default A new security group is created
   */
  readonly securityGroups?: cdk.aws_ec2.ISecurityGroup[];

  /**
   * Lambda function memory in MB.
   * @default 512
   */
  readonly lambdaMemory?: number;

  /**
   * Lambda function timeout.
   * @default 30 seconds
   */
  readonly lambdaTimeout?: cdk.Duration;

  /**
   * Lambda function architecture.
   * @default ARM_64 (Graviton2 - cheaper)
   */
  readonly lambdaArchitecture?: cdk.aws_lambda.Architecture;

  /**
   * Lambda function log level.
   * @default 'INFO'
   */
  readonly logLevel?: 'DEBUG' | 'INFO' | 'ERROR';

  /**
   * CloudFront price class.
   * @default PRICE_CLASS_100 (North America, Europe - cheapest)
   */
  readonly priceClass?: cdk.aws_cloudfront.PriceClass;

  /**
   * Enable CloudFront caching.
   * @default false
   */
  readonly enableCaching?: boolean;

  /**
   * Cache TTL when caching is enabled.
   * @default 0 seconds (no caching)
   */
  readonly cacheTtl?: cdk.Duration;

  /**
   * CloudFront distribution comment.
   * @default undefined
   */
  readonly comment?: string;

  /**
   * Enable CloudFront access logs to S3.
   * @default false
   */
  readonly enableAccessLogs?: boolean;

  /**
   * S3 bucket for CloudFront access logs.
   * Required if enableAccessLogs is true.
   */
  readonly logBucket?: cdk.aws_s3.IBucket;

  /**
   * Prefix for CloudFront access logs in S3.
   * @default 'cloudfront-logs/'
   */
  readonly logPrefix?: string;

  /**
   * Enable AWS WAF for the CloudFront distribution.
   * @default false
   */
  readonly enableWaf?: boolean;

  /**
   * AWS WAF Web ACL to associate with CloudFront.
   * Required if enableWaf is true.
   */
  readonly wafWebAcl?: cdk.aws_wafv2.CfnWebACL;
}
