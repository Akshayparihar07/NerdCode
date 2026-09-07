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
