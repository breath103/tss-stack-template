---
topic: Repositories and services
order: 70
---

# When logic touches two or more tables or decides a business rule, put it in a Service that composes single-table repositories.

A repository owns **one table** and holds **simple queries against it**: get, list, insert,
update, delete. A repository method never touches another table and never decides anything:
no "if the user exists do X, else do Y", no multi-step flow.

Anything that combines more than one repository, or carries a business rule, is a **Service**
class (`WorkspaceInvitationService`, `BillingAccountMembers`, `WorkspaceOnboardingFlow`). The
service takes the repositories it needs as constructor params and calls their methods. It never
re-writes their queries.

The tell: a repository method that inlines another table's insert, or copies a query a sibling
method already has (along with that method's private helpers), so it can "do it all in one place".
That is a service written in the wrong file.

```ts
// ✅ Correct — each repository is one table, the flow lives in a service
// workspaces/workspaces-repository.ts
class WorkspacesRepository {
  async create(input: { name: string; slug: string; billingAccountId: string | null }): Promise<WorkspaceRow> { … }
}

// workspaces/workspace-invitations-repository.ts
class WorkspaceInvitationsRepository {
  async create(input: { workspaceId: string; email: string; role: WorkspaceRole; invitedBy: string }): Promise<WorkspaceInvitationRow | null> { … }
}

// workspaces/workspace-invitation-service.ts
class WorkspaceInvitationService {
  constructor(
    private readonly users: UsersRepository,
    private readonly workspaces: WorkspacesRepository,
    private readonly memberships: WorkspaceMembershipsRepository,
    private readonly invitations: WorkspaceInvitationsRepository
  ) {}

  /** A workspace for `email`: they join as admin if they have an account, else get an invitation. */
  async createFor(input: { billingAccountId: string; email: string; name: string; invitedBy: string }) {
    const workspace = await this.workspaces.create({ … });
    const user = await this.users.findByEmail(input.email);
    if (user) return { workspace, membership: await this.memberships.create({ workspaceId: workspace.id, userId: user.id, role: "admin" }) };
    return { workspace, invitation: await this.invitations.create({ workspaceId: workspace.id, email: input.email, role: "admin", invitedBy: input.invitedBy }) };
  }
}

export const workspaceInvitationService = new WorkspaceInvitationService(usersRepo, workspacesRepo, workspaceMembershipsRepo, workspaceInvitationsRepo);
```

```ts
// ❌ Wrong — one "repository" method that writes three tables and branches on a business rule,
// re-implementing queries that `findUserByEmail`, `addMember` and `createInvitation` already have
class WorkspacesRepository {
  async provision(input: { … }) {
    const email = WorkspacesRepository.normalizeEmail(input.email); // copied from createInvitation
    return await db.get().transaction().execute(async trx => {
      const workspace = await trx.insertInto("workspaces")…;
      const user = await trx.selectFrom("better_auth.user")…;                  // another table
      if (user) return { membership: await trx.insertInto("user_workspace_memberships")… }; // another table
      return { invitation: await trx.insertInto("workspace_invitations")… };   // another table
    });
  }
}
```

Routes call the service. A route that strings several repository calls together with
branching between them is the same mistake one layer up: move it into a service.
