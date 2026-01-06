export function backendUrlName({ project, sanitizedBranchName }: { project: string, sanitizedBranchName: string }) {
  return `/${project}/backend/${sanitizedBranchName}`;
}