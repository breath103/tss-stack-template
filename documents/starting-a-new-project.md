# Starting a new project from this template

A checklist for turning `breath103/tss-stack-template` into a new project repo.
Work through it top to bottom. Every step is here because skipping it has
already bitten a real project.

Throughout, `<owner>/<name>` is the new GitHub repo and `<name>` is also the
local directory name.

## 1. Create the repo and wire up remotes

- [ ] Create an **empty** GitHub repo: `gh repo create <owner>/<name> --private`.
      Don't let GitHub add a README, license, or `.gitignore`. That creates an
      initial commit with no history in common with the template.
- [ ] Clone the template into the new project's directory, then re-point the
      remotes:
      ```bash
      git clone git@github.com:breath103/tss-stack-template.git <name>
      cd <name>
      git remote rename origin template
      git remote add origin git@github.com:<owner>/<name>.git
      ```
- [ ] Confirm the remote names. `template` **must** be called `template`,
      because the `tss-update-template` skill looks for it by that name. `origin`
      must point at the new repo:
      ```bash
      git remote -v
      ```
- [ ] **If the new repo already has commits**, don't merge them in. If the only
      commit is a GitHub-generated README or license, overwrite it with
      `git push --force -u origin main`. If it has work you want to keep, rebase
      that work onto the template (expect add/add conflicts on files both sides
      created):
      ```bash
      git fetch origin
      git checkout -B main origin/main
      git rebase template/main        # replays your commits onto the template
      git push --force-with-lease -u origin main
      ```
      Avoid `git merge template/main --allow-unrelated-histories`. It works,
      but it leaves the repo with two root commits, and every later
      `git log template/main..main` includes that unrelated first commit.
      With rebase (or the clean clone above), `main` is simply the template plus
      your commits. That is also the shape `tss-update-template`'s
      `git merge template/main` works best against.
- [ ] Verify: `git log --oneline template/main..main` shows only
      project-specific commits (nothing yet, on a fresh clone).

## 2. Rename and configure

- [ ] Choose a **short** project name (lowercase, `a-z0-9-`). Backend Lambda
      names are `<project>-backend-<branch>-handler`, and AWS caps them at 64
      characters, so a long project name leaves less room for branch names.
- [ ] Run `./scripts/setup.ts` (after `npm install`). It asks for the project
      name, repo, region, and domain, looks up the Route53 hosted zone,
      rewrites `tss.json`, and copies each package's `.env.sample` to
      `.env.development`. The domain's hosted zone must already exist in
      Route53. Alternatively, edit `tss.json` by hand: `project`, `repo`,
      `backend.region`, `ssm.region`, `domain`, `hostedZoneId`, `subdomainMap`.
- [ ] If the S3 bucket name `<project>-frontend` is already taken globally, set
      `frontend.bucketSuffix` in `tss.json`.
- [ ] Add any optional add-ons you adopt to `uses` in `tss.json` (e.g.
      `"supabase"`). This switches on their guideline and lint checks.
- [ ] Rename the root package: `"name"` in `package.json`. Then run
      `npm install` so `package-lock.json` picks up the new name too. It is easy
      to miss the lockfile.
- [ ] Replace the remaining template-specific values:
  - [ ] `README.md`: the "Live Demo" links (`tsss.cloud`). Rewrite the intro for
        your project, but keep a link to this doc.
  - [ ] `.github/workflows/deploy.yml`:
    - [ ] Update the frontend's `SITE_URL`.
    - [ ] Replace the backend's `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and
          `BETTER_AUTH_SECRET`. These values are the template's, hardcoded in
          plain text. Put yours in GitHub Actions secrets and reference them as
          `${{ secrets.… }}`.
  - [ ] `.github/scripts/backend-stack.test.mjs`: the `tsss` project name in the
        fixture. It's cosmetic; the test passes either way.
  - [ ] `github-project.json`: it points at the template's project board, which
        `/do-task` would then drive. Either create a GitHub Project for the new
        repo (with a Status field containing `Backlog`, `Ready`, `In progress`,
        `In review`, `Done`) and regenerate the file with
        `.claude/skills/do-task/scripts/cli.ts setup --project <project-url> --repo <owner>/<name>`,
        or delete the file until you want one. `gh` needs the `project` scope:
        `gh auth refresh -s project`.
- [ ] Sweep for leftovers. Expect only the lines that deliberately point at the
      template (the `template` remote in the `tss-update-template` skill, and the
      `tss-upstream-change` skill):
      ```bash
      grep -rnI "tsss\|tss-stack-template" . \
        --exclude-dir={node_modules,.git,dist,cdk.out,.tmp} --exclude=package-lock.json
      ```

## 3. Environment and secrets

- [ ] Local env files are gitignored. Dev reads `packages/<pkg>/.env.development`
      (`./scripts/dev.ts` defaults to `--env=development`). If `setup.ts` didn't
      create them, copy `packages/backend/.env.sample` and
      `packages/frontend/.env.sample` to `.env.development`, and fill them in.
      Create a `.env.production` only if you plan to run a manual deploy with
      `--env=production`. CI deploys take their env from `deploy.yml`.
- [ ] Generate a fresh `BETTER_AUTH_SECRET` (e.g. `openssl rand -base64 32`). Never
      reuse the template's.
- [ ] Create a new Google OAuth client in
      [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
      Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in
      `packages/backend/.env.development`. Then add these redirect URIs:
      - [ ] Dev: `http://<name>.localhost:3000/api/auth/callback/google`. The dev
            host is `<checkout-dir-basename>.localhost`, so it follows the
            directory name. Other worktrees get their own host and aren't
            covered by this URI.
      - [ ] Prod: `https://<domain>/api/auth/callback/google`, and the `www.`
            variant if `subdomainMap` serves it.
- [ ] Make AWS credentials available to your shell, e.g.
      `export AWS_PROFILE=<profile>`. The deploy scripts use the standard AWS
      SDK/CDK credential chain.

## 4. Run locally, push, and deploy

- [ ] `npm install`, then `./scripts/dev.ts start`. The app is served at
      `http://<name>.localhost:3000`. Sign in with Google to confirm the OAuth
      setup.
- [ ] `./scripts/lint` passes.
- [ ] Commit (`chore: rename project to <name>`) and `git push -u origin main`.
      CI runs on this first push, but the deploy job fails until the steps
      below are done. That's expected.
- [ ] Deploy the edge stack once, by hand:
      `./packages/edge/scripts/deploy.ts deploy`. It creates CloudFront,
      Lambda@Edge, the wildcard certificate, the frontend bucket, and, with
      `edge.githubActionsIamRole: true`, the GitHub OIDC provider and the
      `<project>-github-actions` IAM role.
      - An AWS account can hold only one GitHub OIDC provider. If the account
        already has one (e.g. from another project made from this template),
        this deploy fails. In that case, set `githubActionsIamRole` to `false`
        and create the role by hand, trusting `repo:<owner>/<name>:*`.
- [ ] Copy the `RoleArn` stack output into the repo's Actions secrets as
      `AWS_ROLE_ARN` (Settings → Secrets and variables → Actions), along with
      any secrets you moved out of `deploy.yml` in step 2.
- [ ] Re-run the failed deploy workflow, or push again. From then on, CI deploys
      backend + frontend for every branch push, and deleting a branch tears its
      deployment down (see [deployment.md](deployment.md)). Don't deploy
      backend or frontend by hand.
- [ ] Open `https://<domain>` and sign in.

## 5. Keep it in sync with the template

- [ ] Pull template updates with the `tss-update-template` skill. It runs
      `git fetch template && git merge --no-ff template/main` and resolves
      conflicts: project-specific values like `tss.json` and the package name
      stay; template improvements come in.
- [ ] When a change belongs in the template itself (shared config, lint rules,
      scripts, reusable patterns), use the `tss-upstream-change` skill. It makes
      the change in the template repo, lands it there, and pulls it back down.
