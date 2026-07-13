// Maps Supabase auth errors to friendly, user-facing messages so the UI never
// surfaces raw errors like "AuthRetryableFetchError: Network request failed".
export function authErrorMessage(err: any, fallback: string): string {
  const name = String(err?.name ?? "");
  const msg = String(err?.message ?? "");

  // Network-layer failure: the request never reached the server. supabase-js
  // surfaces this as AuthRetryableFetchError / "Network request failed".
  if (name === "AuthRetryableFetchError" || /network request failed|failed to fetch/i.test(msg)) {
    return "Network problem. Check your connection and try again.";
  }
  // Wrong email/password — Supabase returns 400 invalid_credentials.
  if (err?.code === "invalid_credentials" || /invalid login credentials/i.test(msg)) {
    return "Incorrect email or password.";
  }
  // Email already registered on sign-up.
  if (err?.code === "user_already_exists" || /already registered|user already exists/i.test(msg)) {
    return "An account with this email already exists.";
  }
  return msg || fallback;
}
