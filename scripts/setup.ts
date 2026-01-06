import * as readline from "readline";
import fs from "fs";
import path from "path";
import { Route53Client, ListHostedZonesByNameCommand, GetHostedZoneCommand } from "@aws-sdk/client-route-53";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

async function main() {
  console.log("\n🚀 TSS Stack Setup\n");

  // Project name
  const project = await ask("Project name (lowercase, no spaces): ");
  if (!/^[a-z][a-z0-9-]*$/.test(project)) {
    console.error("Error: Project name must be lowercase, start with letter, only contain a-z, 0-9, -");
    process.exit(1);
  }

  // GitHub repo
  const repo = await ask("GitHub repo (org/repo): ");
  if (!/^[^/]+\/[^/]+$/.test(repo)) {
    console.error("Error: Repo must be in format org/repo");
    process.exit(1);
  }

  // AWS Region
  const defaultRegion = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
  const region = (await ask(`AWS region for backend [${defaultRegion}]: `)) || defaultRegion;

  // Domain
  const domain = await ask("Domain (e.g., myapp.com): ");
  if (!domain || !domain.includes(".")) {
    console.error("Error: Invalid domain");
    process.exit(1);
  }

  // Hosted Zone - try to find it
  console.log("\nLooking up Route53 hosted zone...");
  const route53 = new Route53Client({ region: "us-east-1" }); // Route53 is global, use us-east-1

  let hostedZoneId = "";
  try {
    const listResult = await route53.send(
      new ListHostedZonesByNameCommand({ DNSName: domain, MaxItems: 1 })
    );
    const zone = listResult.HostedZones?.find((z) => z.Name === `${domain}.`);
    if (zone?.Id) {
      hostedZoneId = zone.Id.replace("/hostedzone/", "");
      console.log(`Found hosted zone: ${hostedZoneId}`);
    }
  } catch (err) {
    console.log("Could not auto-detect hosted zone (check AWS credentials)");
  }

  if (!hostedZoneId) {
    hostedZoneId = await ask("Enter Route53 Hosted Zone ID manually: ");
  }

  if (!hostedZoneId) {
    console.error("Error: Hosted Zone ID is required");
    process.exit(1);
  }

  // Verify hosted zone
  try {
    const zoneResult = await route53.send(new GetHostedZoneCommand({ Id: hostedZoneId }));
    console.log(`Verified hosted zone: ${zoneResult.HostedZone?.Name}`);
  } catch {
    console.error("Error: Could not verify hosted zone. Check your AWS credentials and zone ID.");
    process.exit(1);
  }

  // Build config
  const config = {
    project,
    repo,
    backend: { region },
    ssm: { region },
    domain,
    hostedZoneId,
    subdomainMap: {
      "": "main",
      "www": "main",
      "main": null,
    },
  };

  // Show summary
  console.log("\n📋 Configuration:\n");
  console.log(JSON.stringify(config, null, 2));

  const confirm = await ask("\nWrite to tss.json? [y/N]: ");
  if (confirm.toLowerCase() !== "y") {
    console.log("Aborted.");
    process.exit(0);
  }

  // Write config
  const configPath = path.resolve(import.meta.dirname, "../tss.json");
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
  console.log(`\n✅ Wrote ${configPath}`);

  console.log("\nNext steps:");
  console.log("  1. npm run bootstrap     # Set up GitHub Actions");
  console.log("  2. npm run deploy:edge   # Deploy CloudFront + Lambda@Edge");
  console.log("  3. npm run deploy:backend -- --name=main");
  console.log("  4. npm run deploy:frontend -- --name=main");

  rl.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
