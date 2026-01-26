import * as readline from "readline";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Route53Client, ListHostedZonesByNameCommand, GetHostedZoneCommand } from "@aws-sdk/client-route-53";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

async function askProject(): Promise<string> {
  const project = await ask("Project name (lowercase, no spaces): ");
  if (!/^[a-z][a-z0-9-]*$/.test(project)) {
    console.error("Error: Project name must be lowercase, start with letter, only contain a-z, 0-9, -");
    process.exit(1);
  }
  return project;
}

async function askRepo(): Promise<string> {
  const repo = await ask("GitHub repo (org/repo): ");
  if (!/^[^/]+\/[^/]+$/.test(repo)) {
    console.error("Error: Repo must be in format org/repo");
    process.exit(1);
  }
  return repo;
}

async function askRegion(): Promise<string> {
  const defaultRegion = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
  return (await ask(`AWS region for backend [${defaultRegion}]: `)) || defaultRegion;
}

async function askDomain(): Promise<string> {
  const domain = await ask("Domain (e.g., myapp.com): ");
  if (!domain || !domain.includes(".")) {
    console.error("Error: Invalid domain");
    process.exit(1);
  }
  return domain;
}

async function findHostedZone(domain: string): Promise<string> {
  console.log("\nLooking up Route53 hosted zone...");
  const route53 = new Route53Client({ region: "us-east-1" });

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
  } catch {
    console.log("Could not auto-detect hosted zone (check AWS credentials)");
  }

  if (!hostedZoneId) {
    hostedZoneId = await ask("Enter Route53 Hosted Zone ID manually: ");
  }

  if (!hostedZoneId) {
    console.error("Error: Hosted Zone ID is required");
    process.exit(1);
  }

  // Verify
  try {
    const zoneResult = await route53.send(new GetHostedZoneCommand({ Id: hostedZoneId }));
    console.log(`Verified hosted zone: ${zoneResult.HostedZone?.Name}`);
  } catch {
    console.error("Error: Could not verify hosted zone. Check your AWS credentials and zone ID.");
    process.exit(1);
  }

  return hostedZoneId;
}

function buildConfig(project: string, repo: string, region: string, domain: string, hostedZoneId: string) {
  return {
    $schema: "./tss.schema.json",
    project,
    repo,
    edge: { devPort: 3000 },
    backend: { region, devPort: 3001 },
    frontend: { bucketSuffix: "", devPort: 3002 },
    ssm: { region },
    domain,
    hostedZoneId,
    subdomainMap: {
      "": "main",
      "www": "main",
      "main": null,
    },
  };
}

function writeConfig(config: ReturnType<typeof buildConfig>) {
  const configPath = path.join(ROOT, "tss.json");
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
  console.log(`Wrote ${configPath}`);
}

function copyEnvSamples() {
  const packages = ["backend", "frontend"];
  for (const pkg of packages) {
    const samplePath = path.join(ROOT, "packages", pkg, ".env.sample");
    const envPath = path.join(ROOT, "packages", pkg, ".env");
    if (fs.existsSync(samplePath) && !fs.existsSync(envPath)) {
      fs.copyFileSync(samplePath, envPath);
      console.log(`Copied ${pkg}/.env.sample → ${pkg}/.env`);
    }
  }
}

async function main() {
  console.log("\n🚀 TSS Stack Setup\n");

  const project = await askProject();
  const repo = await askRepo();
  const region = await askRegion();
  const domain = await askDomain();
  const hostedZoneId = await findHostedZone(domain);

  const config = buildConfig(project, repo, region, domain, hostedZoneId);

  console.log("\n📋 Configuration:\n");
  console.log(JSON.stringify(config, null, 2));

  const confirm = await ask("\nWrite to tss.json? [y/N]: ");
  if (confirm.toLowerCase() !== "y") {
    console.log("Aborted.");
    process.exit(0);
  }

  writeConfig(config);
  copyEnvSamples();

  console.log("\nNext steps:");
  console.log("  1. Edit packages/backend/.env with your secrets");
  console.log("  2. npm run bootstrap     # Set up GitHub Actions");
  console.log("  3. npm run deploy:edge   # Deploy CloudFront + Lambda@Edge");
  console.log("  4. npm run deploy:backend -- --name=main");
  console.log("  5. npm run deploy:frontend -- --name=main");

  rl.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
