import { execSync } from "child_process";
import path from "path";
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import config from "../../../tss.json" with { type: "json" };
import { sanitizeBranchName } from "@app/shared/branch";
import * as SSMParameters from "@app/shared/ssm-parameters";

const ROOT = path.resolve(import.meta.dirname, "..");

// Parse CLI args
const args = process.argv.slice(2);
let name: string | undefined;

for (const arg of args) {
  if (arg.startsWith("--name=")) {
    name = arg.split("=")[1];
  }
}

if (!name) {
  console.error("Error: --name is required (e.g., --name=main)");
  process.exit(1);
}

const sanitizedBranchName = sanitizeBranchName(name);
if (!sanitizedBranchName) {
  console.error(`Error: branch name "${name}" sanitizes to empty string`);
  process.exit(1);
}

if (sanitizedBranchName !== name) {
  console.log(`Branch name sanitized: "${name}" → "${sanitizedBranchName}"`);
}

// Build
console.log("Building...");
execSync("npm run build", { stdio: "inherit", cwd: ROOT });

// CDK Stack
class BackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps & { aliasName: string }) {
    super(scope, id, props);

    const fn = new lambda.Function(this, "Handler", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(path.join(ROOT, "dist")),
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      environment: {
        NODE_ENV: "production",
      },
    });

    const alias = fn.addAlias(props.aliasName);
    const aliasUrl = alias.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });

    new cdk.CfnOutput(this, "FunctionUrl", {
      value: aliasUrl.url,
      description: `Function URL for alias: ${props.aliasName}`,
    });
  }
}

// Synthesize
console.log(`\nDeploying ${sanitizedBranchName} to ${config.backendRegion} (project: ${config.project})...`);

const app = new cdk.App({ outdir: path.join(ROOT, "cdk.out") });

const stackName = `${config.project}-backend-${sanitizedBranchName}`;
const stack = new BackendStack(app, stackName, {
  aliasName: sanitizedBranchName,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: config.backendRegion,
  },
});

cdk.Tags.of(stack).add("project", config.project);
cdk.Tags.of(stack).add("environment", sanitizedBranchName);

app.synth();

// Deploy
execSync(
  `npx cdk deploy ${stackName} --app ./cdk.out --require-approval never`,
  { stdio: "inherit", cwd: ROOT }
);

// Get Function URL and store in SSM
const functionUrl = execSync(
  `aws cloudformation describe-stacks --stack-name ${stackName} --query 'Stacks[0].Outputs[?OutputKey==\`FunctionUrl\`].OutputValue' --output text --region ${config.backendRegion}`,
  { encoding: "utf-8" }
).trim();

const ssmPath = SSMParameters.backendUrlName({ project: config.project, sanitizedBranchName });

console.log(`\nStoring Function URL in SSM: ${ssmPath}`);
execSync(
  `aws ssm put-parameter --name "${ssmPath}" --value "${functionUrl}" --type String --overwrite --region ${config.backendRegion}`,
  { stdio: "inherit" }
);

console.log(`\n✅ Deployed: ${functionUrl}`);
