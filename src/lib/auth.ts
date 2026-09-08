interface AuthMessage {
  message: string;
  longMessage?: string | undefined;
}

export function clerkErrorMessage(
  error: AuthMessage | null,
): string | undefined {
  if (error === null) {
    return undefined;
  }

  return error.longMessage ?? error.message;
}

export function firstGlobalErrorMessage(
  errors: AuthMessage[] | null,
): string | undefined {
  const first = errors?.at(0);
  if (first === undefined) {
    return undefined;
  }

  return first.longMessage ?? first.message;
}

export function goToAppHome(url = "/"): void {
  window.location.assign(url);
}

export function safeRedirectPath(
  value: string | string[] | null | undefined,
  fallback = "/",
): string {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (
    candidate === undefined ||
    candidate === null ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//")
  ) {
    return fallback;
  }

  try {
    const url = new URL(candidate, "https://nerdcode.local");
    return url.origin === "https://nerdcode.local"
      ? `${url.pathname}${url.search}${url.hash}`
      : fallback;
  } catch {
    return fallback;
  }
}
