import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

interface GitHubActionsIamProps {
  project: string;
  repo: string;
}

export class GitHubActionsIam extends Construct {
  public readonly role: iam.Role;

  constructor(scope: Construct, id: string, props: GitHubActionsIamProps) {
    super(scope, id);

    const provider = new iam.OpenIdConnectProvider(this, "GitHubOIDC", {
      url: "https://token.actions.githubusercontent.com",
      clientIds: ["sts.amazonaws.com"],
    });

    this.role = new iam.Role(this, "Role", {
      roleName: `${props.project}-github-actions`,
      assumedBy: new iam.FederatedPrincipal(
        provider.openIdConnectProviderArn,
        {
          StringEquals: {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          },
          // Branch pushes only (deploy on push, cleanup on delete run as a branch ref). A bare `repo:…:*` would
          // also trust `pull_request` and `environment:` subjects, which matter once the repo is public.
          StringLike: {
            "token.actions.githubusercontent.com:sub": `repo:${props.repo}:ref:refs/heads/*`,
          },
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
    });

    this.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess"));

    new cdk.CfnOutput(this, "RoleArn", {
      value: this.role.roleArn,
      description: "Add this to GitHub secrets as AWS_ROLE_ARN",
    });
  }
}
