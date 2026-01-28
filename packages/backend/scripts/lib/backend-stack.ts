import path from "node:path";

import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
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

    const fn = new lambda.Function(this, "Handler", {
      functionName: BackendStack.functionName({ project: props.project, name: props.name }),
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(path.join(ROOT, "dist")),
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      environment: {
        NODE_ENV: "production",
        ...props.envVars,
      },
    });

    const fnUrl = fn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      invokeMode: lambda.InvokeMode.RESPONSE_STREAM,
    });

    new cdk.CfnOutput(this, "FunctionUrl", {
      value: fnUrl.url,
    });
  }
}
