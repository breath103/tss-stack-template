export function backendUrlName({ project, sanitizedBranchName }: { project: string, sanitizedBranchName: string }) {
  return `/${project}/backend/${sanitizedBranchName}`;
}

export function frontendBucketName({ project }: { project: string }) {
  return `/${project}/frontend/bucket`;
}