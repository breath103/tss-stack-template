# Starting a new project from this template

A checklist for turning `breath103/tss-stack-template` into a new project repo.
Work through it top to bottom. Every step is here because skipping it has
already bitten a real project.

Placeholders used throughout:

- `<owner>/<repo>`: the new GitHub repo. `<repo>` is also the local directory
  name, so it sets the dev host: `<repo>.localhost`.
- `<project>`: the `project` value in `tss.json`, which prefixes every AWS
  resource. It can differ from `<repo>`: repo `4fbc` uses project `ffbc`.
- `<domain>`: the production domain, if the project has one.

## 1. Create the repo and wire up remotes

- [ ] Create an **empty** GitHub repo: `gh repo create <owner>/<repo> --private`.
      Don't pass `--add-readme`, `--license`, or `--gitignore`, and don't add
      them in the web UI. They create an initial commit with no history in
      common with the template. Skip `--clone` too; the next step clones.
- [ ] Clone the template into the project directory, then re-point the
      remotes:
      ```bash
      git clone git@github.com:breath103/tss-stack-template.git <repo>
      cd <repo>
      git remote rename origin template
      git remote add origin git@github.com:<owner>/<repo>.git
      ```
      Until the first `git push -u origin main` (section 4), local `main` still
      tracks `template/main`. A bare `git pull` or `git push` in between talks
      to the template.
- [ ] Confirm the remote names with `git remote -v`. The template remote
      **must** be called `template`, because the `tss-update-template` skill
      looks for it by that name. `origin` must point at the new repo.
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

- [ ] Install dependencies: `nvm use` (`.nvmrc` pins the Node version), then
      `npm install`.
- [ ] Choose `<project>`:
      - It must match `^[a-z][a-z0-9-]*$`, so it **must start with a letter**.
        CloudFormation stack names (`<project>-edge`, `<project>-backend-main`)
        can't start with a digit. `tss.schema.json` and `setup.ts` both reject
        a name like `4fbc`.
      - Keep it short. Backend Lambda names are
        `<project>-backend-<branch>-handler`, and AWS caps them at 64
        characters, so every character of `<project>` comes out of the room
        left for branch names.
- [ ] Check that the domain has a Route53 hosted zone:
      `aws route53 list-hosted-zones-by-name --dns-name <domain> --max-items 1`.
      The call returns the *nearest* zone, so confirm its `Name` is exactly
      `<domain>.`. If there's no zone, you have three options:
      - create one for a domain registered elsewhere, and point the
        registrar's nameservers at it;
      - register the domain through Route53 Domains, which creates the zone;
      - start without a domain (see the `tss.json` step below).
- [ ] Write `tss.json`, using either of these:
      - **`./scripts/setup.ts`**. It asks for the project name, repo, region,
        and domain, and looks up the hosted zone. It rewrites `tss.json` and
        copies each package's `.env.sample` to `.env.development`. It needs a
        real terminal: piping all the answers in at once drops everything
        after the first. Agents and scripts should use the hand edit instead.
      - **By hand.** Set `project`, `repo`, `backend.region`, and
        `ssm.region`, then:
        - With a domain: set `domain` and `hostedZoneId`. The template's
          `subdomainMap` (apex redirects to `www`, `www` serves `main`, and
          `main.<domain>` is blocked) is a good default. `setup.ts` writes
          `{"": "main", "www": "main", "main": null}` instead, which serves
          the apex directly.
        - Without a domain: remove `domain` and `hostedZoneId`, and set
          `subdomainMap` to `{"": "main"}`. The site is then reached through
          the generated CloudFront domain, and `SITE_URL` and the prod OAuth
          redirect URI below use that domain.
- [ ] Check that the frontend bucket name is free:
      `aws s3api head-bucket --bucket <project>-frontend`. A 404 means it's
      free. A 403 means someone else owns it, so set `frontend.bucketSuffix`
      in `tss.json`.
- [ ] Add any optional add-ons you adopt to `uses` in `tss.json` (e.g.
      `"supabase"`). This switches on their guideline and lint checks.
- [ ] Rename the root package: `"name"` in `package.json`. Then run
      `npm install` so `package-lock.json` picks up the new name too. It is easy
      to miss the lockfile.
- [ ] Replace the remaining template-specific values:
  - [ ] `README.md`: the title, intro, and "Live Demo" links (`tsss.cloud`).
        Keep a link to this doc.
  - [ ] `packages/frontend/index.html`: the `<title>` and `og:title`.
  - [ ] `packages/frontend/src/routes/index.tsx` (the h1) and
        `packages/frontend/src/routes/about.tsx`: the "TSS Stack Template"
        text.
  - [ ] `.github/workflows/deploy.yml`:
    - [ ] Set the frontend's `SITE_URL` to the production origin:
          `https://www.<domain>` if the apex redirects to `www`, otherwise
          `https://<domain>`. It only feeds the OG/Twitter meta tags in
          `index.html`.
    - [ ] Change the backend's `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and
          `BETTER_AUTH_SECRET` to `${{ secrets.GOOGLE_CLIENT_ID }}`,
          `${{ secrets.GOOGLE_CLIENT_SECRET }}`, and
          `${{ secrets.BETTER_AUTH_SECRET }}`. The current values are the
          template's own, hardcoded in plain text. You set these secrets in
          section 4.
    - [ ] Keep `REQUIRED_FOO`/`OPTIONAL_FOO` in step with section 3. If you
          remove them from `env.d.ts`, remove them here too.
    - [ ] Delete the commented-out Telegram `notify` job. Its `chat_id` is the
          template author's.
  - [ ] `.github/scripts/backend-stack.test.mjs`: set the fixture's `tsss` to
        `<project>`. The test synthesizes the real backend stack, so it also
        checks that the project name is valid.
  - [ ] `github-project.json`: it points at the template's project board, which
        `/do-task` would then drive. You have two options:
        - Create a GitHub Project for the new repo, with a Status field
          containing `Backlog`, `Ready`, `In progress`, `In review`, and
          `Done`. Then regenerate the file with
          `.claude/skills/do-task/scripts/cli.ts setup --project <project-url> --repo <owner>/<repo>`.
          `gh` needs the `project` scope: `gh auth refresh -s project`.
        - Delete the file until you want a board.
- [ ] Sweep for leftovers:
      ```bash
      grep -rnIi "tsss\|tss-stack\|tss stack\|647533447" . \
        --exclude-dir={node_modules,.git,dist,cdk.out,.tmp} --exclude=package-lock.json
      ```
      Only these lines should remain, because they point at the template on
      purpose:
      - the `template` remote in the `tss-update-template` skill;
      - the `tss-upstream-change` skill;
      - `tss.schema.json`'s title and `setup.ts`'s banner;
      - this checklist, and any README link back to the template.

## 3. Environment and secrets

- [ ] Create the local env files. They're gitignored, and dev reads
      `packages/<pkg>/.env.development` (`./scripts/dev.ts` defaults to
      `--env=development`). If `setup.ts` didn't create them, copy
      `packages/backend/.env.sample` and `packages/frontend/.env.sample` to
      `.env.development`. Create a `.env.production` only if you plan to run a
      manual deploy with `--env=production`. CI deploys take their env from
      `deploy.yml`.
- [ ] Fill in the values:
  - [ ] Frontend `SITE_URL`: `http://<repo>.localhost:<edge.devPort>`.
  - [ ] `REQUIRED_FOO` / `OPTIONAL_FOO` (both packages): demo variables. They
        show how `src/env.d.ts` validation works. Keep any value, or remove
        them from `env.d.ts`, the `.env` files, and `deploy.yml` together.
  - [ ] Backend `BETTER_AUTH_SECRET`: a fresh value from
        `openssl rand -base64 32`. Never reuse the template's. CI gets its own,
        separate value in section 4.
- [ ] Create a new Google OAuth client in
      [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
      Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in
      `packages/backend/.env.development`, and add these redirect URIs:
  - [ ] Dev: `http://<repo>.localhost:<edge.devPort>/api/auth/callback/google`.
        The dev host follows the checkout directory's name, so other
        worktrees and custom ports need their own entries.
  - [ ] Prod: `https://<domain>/api/auth/callback/google`, and the `www.`
        variant if `subdomainMap` serves it.
- [ ] Make AWS credentials available to your shell, e.g.
      `export AWS_PROFILE=<profile>`. The deploy scripts use the standard AWS
      SDK/CDK credential chain.

## 4. Run locally, push, and deploy

- [ ] Start dev: `./scripts/dev.ts start`. Every project made from this template
      defaults to ports 3000–3002, so it fails with "port 3000 already in use"
      if another one is running. Stop that one, or give this checkout its own
      ports in a gitignored `tss.override.json`:
      ```json
      { "edge": { "devPort": 3100 }, "backend": { "devPort": 3101 }, "frontend": { "devPort": 3102 } }
      ```
      With an override, the dev URL, `SITE_URL`, and the Google dev redirect
      URI all use the new edge port.
- [ ] Smoke-check dev without OAuth:
      `curl -sf http://<repo>.localhost:<edge.devPort>/` returns HTML, and
      `curl -sf http://<repo>.localhost:<edge.devPort>/api/auth/ok` returns
      `{"ok":true}`. If Google credentials are set, also sign in through the
      browser. Then run `./scripts/dev.ts stop`.
- [ ] Run the checks that CI runs:
      - [ ] `./scripts/lint`.
      - [ ] `npm run -w @modules/ui lint` and `npm run -w @modules/ui typecheck`.
            `./scripts/lint` skips `modules/ui`.
      - [ ] `node --import tsx --test .github/scripts/backend-stack.test.mjs`.
            This catches an invalid project name before CI does.
- [ ] Commit (`chore: rename project to <project>`) and
      `git push -u origin main`. CI runs on this push, but the deploy job
      fails until the steps below are done. That's expected.
- [ ] Deploy the edge stack once, by hand:
      `./packages/edge/scripts/deploy.ts deploy`. It creates CloudFront,
      Lambda@Edge, the wildcard certificate, the frontend bucket, and, with
      `edge.githubActionsIamRole: true`, the GitHub OIDC provider and the
      `<project>-github-actions` IAM role.
      - An AWS account can hold only one GitHub OIDC provider. If the account
        already has one (e.g. from another project made from this template),
        this deploy fails. In that case, set `githubActionsIamRole` to `false`
        and create the role by hand, trusting `repo:<owner>/<repo>:*`.
- [ ] Add these repository secrets (Settings → Secrets and variables → Actions):
  - [ ] `AWS_ROLE_ARN`: the edge stack's `RoleArn` output.
  - [ ] `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: the OAuth client from
        section 3.
  - [ ] `BETTER_AUTH_SECRET`: a new `openssl rand -base64 32`, not the dev one.

      The backend deploy validates its env against `src/env.d.ts`, so a missing
      secret fails the deploy even once `AWS_ROLE_ARN` is set.
- [ ] Re-run the failed deploy workflow, or push again. From then on:
  - CI deploys the backend and frontend on every push to `main`; other
    branches run checks only (see [deployment.md](deployment.md)).
  - Don't deploy the backend or frontend by hand.
- [ ] Open the production URL and sign in.

## 5. Keep it in sync with the template

- [ ] Pull template updates with the `tss-update-template` skill. It runs
      `git fetch template && git merge --no-ff template/main` and resolves
      conflicts: project-specific values like `tss.json` and the package name
      stay; template improvements come in.
- [ ] When a change belongs in the template itself (shared config, lint rules,
      scripts, reusable patterns), use the `tss-upstream-change` skill. It makes
      the change in the template repo, lands it there, and pulls it back down.
