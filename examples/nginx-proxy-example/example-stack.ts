import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery';
import { Construct } from 'constructs';
import { CloudFrontProxy } from '@trucoit/cdk-cloudfront-proxy';

export class NginxProxyExample extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create VPC with private subnets
    const vpc = new ec2.Vpc(this, 'VPC', {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
      ],
    });

    // Create ECS cluster
    const cluster = new ecs.Cluster(this, 'Cluster', { vpc });

    // Create CloudMap namespace for service discovery
    const namespace = new servicediscovery.PrivateDnsNamespace(this, 'Namespace', {
      name: 'internal.local',
      vpc,
    });

    // Create log group
    const logGroup = new logs.LogGroup(this, 'NginxLogs', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create Fargate task definition
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      memoryLimitMiB: 512,
      cpu: 256,
    });

    taskDefinition.addContainer('nginx', {
      image: ecs.ContainerImage.fromRegistry('nginx:alpine'),
      portMappings: [{ containerPort: 80 }],
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'nginx',
        logGroup,
      }),
    });

    // Create security group for ECS service
    const ecsSecurityGroup = new ec2.SecurityGroup(this, 'EcsSecurityGroup', {
      vpc,
      description: 'Security group for ECS service',
    });

    // Create security group for Lambda
    const lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
      vpc,
      description: 'Security group for Lambda proxy',
    });

    // Allow Lambda to reach ECS on port 80
    ecsSecurityGroup.addIngressRule(
      lambdaSecurityGroup,
      ec2.Port.tcp(80),
      'Allow Lambda proxy to reach ECS'
    );

    // Create Fargate service with CloudMap
    const service = new ecs.FargateService(this, 'Service', {
      cluster,
      taskDefinition,
      desiredCount: 2,
      securityGroups: [ecsSecurityGroup],
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      cloudMapOptions: {
        name: 'nginx',
        dnsRecordType: servicediscovery.DnsRecordType.A,
        dnsTtl: cdk.Duration.seconds(10),
        cloudMapNamespace: namespace,
      },
    });

    // Create CloudFront proxy
    const proxy = new CloudFrontProxy(this, 'Proxy', {
      routingRules: {
        '*': {
          target: `nginx.${namespace.namespaceName}`,
          port: 80,
          protocol: 'http',
        },
      },
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [lambdaSecurityGroup],
    });

    // Outputs
    new cdk.CfnOutput(this, 'CloudFrontUrl', {
      value: `https://${proxy.distribution.distributionDomainName}`,
      description: 'CloudFront URL to access NGINX service',
    });

    new cdk.CfnOutput(this, 'ServiceDiscoveryName', {
      value: `nginx.${namespace.namespaceName}`,
      description: 'Service discovery DNS name',
    });
  }
}
