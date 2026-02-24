import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * Configuration properties for the CloudFrontProxy construct.
 */
export interface CloudFrontProxyProps {
  /**
   * The origin domain to proxy traffic to (e.g., private ECS container).
   * @example "10.0.1.50:8080"
   */
  readonly originDomain: string;

  /**
   * Optional VPC to deploy the Lambda proxy function into.
   * Required for accessing private resources.
   */
  readonly vpc?: cdk.aws_ec2.IVpc;

  /**
   * Optional VPC subnets for the Lambda function.
   */
  readonly vpcSubnets?: cdk.aws_ec2.SubnetSelection;
}

/**
 * A serverless CloudFront reverse proxy construct.
 *
 * Creates a CloudFront distribution backed by a Lambda Function URL,
 * which proxies requests to a private origin (e.g., ECS container in VPC).
 *
 * @example
 * new CloudFrontProxy(this, 'Proxy', {
 *   originDomain: '10.0.1.50:8080',
 *   vpc: myVpc,
 * });
 */
export class CloudFrontProxy extends Construct {
  /** The CloudFront distribution. */
  public readonly distribution: cdk.aws_cloudfront.Distribution;

  /** The Lambda function acting as the proxy. */
  public readonly proxyFunction: cdk.aws_lambda.Function;

  /** The Lambda Function URL used as CloudFront origin. */
  public readonly functionUrl: cdk.aws_lambda.FunctionUrl;

  constructor(scope: Construct, id: string, _props: CloudFrontProxyProps) {
    super(scope, id);

    // TODO: Implement Lambda proxy function
    // TODO: Implement Lambda Function URL
    // TODO: Implement CloudFront distribution with OAC
    // TODO: Implement security group for VPC access

    throw new Error('CloudFrontProxy is not yet implemented');
  }
}
