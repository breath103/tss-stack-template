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
        env: { account: "123456789012", region: "ap-northeast-2" },
      })
    );
    template.resourceCountIs("AWS::Events::Rule", 0);
    template.resourceCountIs("AWS::Lambda::Function", 1);
    template.resourceCountIs("AWS::Logs::LogGroup", 1);
    template.hasResourceProperties("AWS::Lambda::Function", { FunctionName: `tsss-backend-${name}-handler` });
    for (const logGroup of Object.values(template.findResources("AWS::Logs::LogGroup"))) {
      assert.equal(logGroup.DeletionPolicy, name === "main" ? "Retain" : "Delete");
    }
  });
}
