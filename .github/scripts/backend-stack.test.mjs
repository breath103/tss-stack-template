import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";

import { BackendStack } from "../../packages/backend/scripts/lib/backend-stack.ts";

for (const name of ["main", "feature-x"]) {
  test(`${name} owns only its intended resources and cleanup policies`, t => {
    const outdir = mkdtempSync(join(tmpdir(), "backend-stack-test-"));
    t.after(() => rmSync(outdir, { recursive: true, force: true }));
    const app = new App({ outdir, context: { "aws:cdk:asset-staging": false } });
    const template = Template.fromStack(
      new BackendStack(app, {
        project: "tsss",
        name,
        envVars: {},
        env: { account: "123456789012", region: "us-west-2" },
      })
    );
    template.resourceCountIs("AWS::Lambda::WebFunction", 1);
    template.resourceCountIs("AWS::Lambda::WebFunctionRevision", 1);
    template.resourceCountIs("AWS::Logs::LogGroup", 2);
    template.hasResourceProperties("AWS::Lambda::WebFunction", { FunctionName: `tsss-backend-${name}-handler` });
    template.hasResourceProperties("AWS::Lambda::WebFunctionEndpoint", {
      EndpointType: "HomeRegion",
      AuthType: "ApplicationManaged",
    });
    for (const type of ["AWS::Logs::LogGroup", "AWS::S3::Bucket"]) {
      for (const resource of Object.values(template.findResources(type))) {
        assert.equal(resource.DeletionPolicy, name === "main" ? "Retain" : "Delete");
      }
    }
  });
}
