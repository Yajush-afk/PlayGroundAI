const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";

export function apiUrl(path: string): string {
  if (!configuredBaseUrl) {
    return path;
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return `${configuredBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
