import { execSync } from "node:child_process";
import path from "node:path";

import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

import { loadConfig } from "@app/shared/config";

const config = loadConfig();

const ROOT = path.resolve(import.meta.dirname, "..");

class BootstrapStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    // GitHub OIDC Provider
    const provider = new iam.OpenIdConnectProvider(this, "GitHubOIDC", {
      url: "https://token.actions.githubusercontent.com",
      clientIds: ["sts.amazonaws.com"],
    });

    // IAM Role for GitHub Actions
    const role = new iam.Role(this, "GitHubActionsRole", {
      roleName: `${config.project}-github-actions`,
      assumedBy: new iam.FederatedPrincipal(
        provider.openIdConnectProviderArn,
        {
          StringEquals: {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          },
          StringLike: {
            "token.actions.githubusercontent.com:sub": `repo:${config.repo}:*`,
          },
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
    });

    // Permissions for CDK deploy
    role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess"));

    new cdk.CfnOutput(this, "RoleArn", {
      value: role.roleArn,
      description: "Add this to GitHub secrets as AWS_ROLE_ARN",
    });
  }
}

console.log(`\nBootstrapping GitHub Actions for repo: ${config.repo}`);
console.log(`Project: ${config.project}`);

const app = new cdk.App({ outdir: path.join(ROOT, "cdk.out") });

const stack = new BootstrapStack(app, `${config.project}-bootstrap`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: config.backend.region,
  },
});

cdk.Tags.of(stack).add("project", config.project);

app.synth();

execSync(
  `npx cdk deploy ${config.project}-bootstrap --app ./cdk.out --require-approval never`,
  { stdio: "inherit", cwd: ROOT }
);

console.log(`
Next steps:
1. Copy the RoleArn output above
2. Go to GitHub repo → Settings → Secrets and variables → Actions
3. Add secret: AWS_ROLE_ARN = <the role ARN>
`);
