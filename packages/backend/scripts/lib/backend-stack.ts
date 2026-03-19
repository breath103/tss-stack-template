import path from "node:path";

import * as cdk from "aws-cdk-lib";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

const ROOT = path.resolve(import.meta.dirname, "../..");

interface BackendStackId {
  project: string;
  name: string;
}

interface BackendStackProps extends cdk.StackProps {
  project: string;
  name: string;
  envVars: Record<string, string>;
  prewarmLambda?: boolean;
}

export class BackendStack extends cdk.Stack {
  static id({ project, name }: BackendStackId): string {
    return `${project}-backend-${name}`;
  }

  static functionName({ project, name }: BackendStackId): string {
    return `${project}-backend-${name}-handler`;
  }

  constructor(scope: Construct, props: BackendStackProps) {
    const id = BackendStack.id({ project: props.project, name: props.name });
    super(scope, id, props);

    const functionName = BackendStack.functionName({ project: props.project, name: props.name });

    const fn = new lambda.Function(this, "Handler", {
      functionName,
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: "lambda.handler",
      code: lambda.Code.fromAsset(path.join(ROOT, "dist")),
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      logGroup: new logs.LogGroup(this, "HandlerLogGroup", {
        logGroupName: `/aws/lambda/${functionName}`,
        retention: logs.RetentionDays.TWO_MONTHS,
      }),
      environment: {
        NODE_ENV: "production",
        ...props.envVars,
      },
    });

    const fnUrl = fn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      invokeMode: lambda.InvokeMode.RESPONSE_STREAM,
    });

    if (props.prewarmLambda) {
      new events.Rule(this, "WarmerSchedule", {
        schedule: events.Schedule.rate(cdk.Duration.minutes(5)),
        targets: [new targets.LambdaFunction(fn, {
          event: events.RuleTargetInput.fromObject({ source: "warmer" }),
        })],
      });
    }

    new cdk.CfnOutput(this, "FunctionUrl", {
      value: fnUrl.url,
    });
  }
}
