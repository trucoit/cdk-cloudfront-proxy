import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as path from 'path';
import { CloudFrontProxyProps, UpstreamConfig } from './types';

/**
 * A serverless CloudFront reverse proxy construct.
 *
 * Creates a CloudFront distribution backed by a Lambda Function URL,
 * which proxies requests to private origins based on routing rules.
 *
 * @example
 * new CloudFrontProxy(this, 'Proxy', {
 *   routingRules: {
 *     'api.example.com': {
 *       target: 'internal.api.local',
 *       port: 8080,
 *       protocol: 'http'
 *     }
 *   },
 *   vpc: myVpc,
 * });
 */
export class CloudFrontProxy extends Construct {
  /** The CloudFront distribution. */
  public readonly distribution: cloudfront.Distribution;

  /** The Lambda function acting as the proxy. */
  public readonly proxyFunction: lambda.Function;

  /** The Lambda Function URL used as CloudFront origin. */
  public readonly functionUrl: lambda.FunctionUrl;

  constructor(scope: Construct, id: string, props: CloudFrontProxyProps) {
    super(scope, id);

    // Validate props
    if (Object.keys(props.routingRules).length === 0) {
      throw new Error('At least one routing rule must be provided');
    }

    if (props.enableAccessLogs && !props.logBucket) {
      throw new Error('logBucket is required when enableAccessLogs is true');
    }

    if (props.enableWaf && !props.wafWebAcl) {
      throw new Error('wafWebAcl is required when enableWaf is true');
    }

    // Normalize routing rules with defaults
    const normalizedRules: Record<string, UpstreamConfig> = {};
    for (const [domain, config] of Object.entries(props.routingRules)) {
      const protocol = config.protocol || 'https';
      normalizedRules[domain] = {
        target: config.target,
        port: config.port || (protocol === 'https' ? 443 : 80),
        protocol,
      };
    }

    // Create Lambda function
    this.proxyFunction = new nodejs.NodejsFunction(this, 'ProxyFunction', {
      entry: path.join(__dirname, '../lambda/proxy/index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: props.lambdaArchitecture || lambda.Architecture.ARM_64,
      memorySize: props.lambdaMemory || 512,
      timeout: props.lambdaTimeout || cdk.Duration.seconds(30),
      vpc: props.vpc,
      vpcSubnets: props.vpcSubnets || {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: props.securityGroups,
      environment: {
        ROUTING_RULES: JSON.stringify(normalizedRules),
        LOG_LEVEL: props.logLevel || 'INFO',
      },
      logGroup: new logs.LogGroup(this, 'ProxyFunctionLogs', {
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      bundling: {
        minify: true,
        sourceMap: false,
        forceDockerBundling: false,
      },
    });

    // Create Lambda Function URL with IAM auth
    this.functionUrl = this.proxyFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.AWS_IAM,
    });

    // Create CloudFront Origin Access Control
    const oac = new cloudfront.CfnOriginAccessControl(this, 'OAC', {
      originAccessControlConfig: {
        name: `${id}-OAC`,
        originAccessControlOriginType: 'lambda',
        signingBehavior: 'always',
        signingProtocol: 'sigv4',
      },
    });

    // Create CloudFront distribution
    const cachePolicy = props.enableCaching
      ? new cloudfront.CachePolicy(this, 'CachePolicy', {
          defaultTtl: props.cacheTtl || cdk.Duration.seconds(0),
          minTtl: cdk.Duration.seconds(0),
          maxTtl: props.cacheTtl || cdk.Duration.days(1),
        })
      : cloudfront.CachePolicy.CACHING_DISABLED;

    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.HttpOrigin(cdk.Fn.select(2, cdk.Fn.split('/', this.functionUrl.url)), {
          protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      },
      priceClass: props.priceClass || cloudfront.PriceClass.PRICE_CLASS_100,
      comment: props.comment,
      enableLogging: props.enableAccessLogs,
      logBucket: props.logBucket,
      logFilePrefix: props.logPrefix || 'cloudfront-logs/',
      webAclId: props.enableWaf ? props.wafWebAcl?.attrArn : undefined,
    });

    // Attach OAC to CloudFront distribution
    const cfnDistribution = this.distribution.node.defaultChild as cloudfront.CfnDistribution;
    cfnDistribution.addPropertyOverride(
      'DistributionConfig.Origins.0.OriginAccessControlId',
      oac.attrId
    );

    // Grant CloudFront permission to invoke Lambda Function URL (restricted to this distribution)
    // Both permissions are required for Function URLs with IAM auth
    this.proxyFunction.addPermission('AllowCloudFrontServicePrincipal', {
      principal: new iam.ServicePrincipal('cloudfront.amazonaws.com'),
      action: 'lambda:InvokeFunctionUrl',
      sourceArn: `arn:aws:cloudfront::${cdk.Stack.of(this).account}:distribution/${this.distribution.distributionId}`,
    });
    
    this.proxyFunction.addPermission('AllowCloudFrontServicePrincipalInvokeFunction', {
      principal: new iam.ServicePrincipal('cloudfront.amazonaws.com'),
      action: 'lambda:InvokeFunction',
      sourceArn: `arn:aws:cloudfront::${cdk.Stack.of(this).account}:distribution/${this.distribution.distributionId}`,
    });

    // Outputs
    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: this.distribution.distributionDomainName,
      description: 'CloudFront distribution domain name',
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront distribution ID',
    });
  }
}
