export function instagramLoginFeedback(result: string | null): { title: string; description: string; color: "success" | "danger" } | null {
  if (result === "connected") return { title: "Instagram connected", description: "Your official insights are being updated.", color: "success" };
  const messages: Record<string, string> = {
    cancelled: "Instagram login was cancelled. You can connect again when ready.",
    invalid_state: "This connection link has expired or was already used. Start a new connection from Accounts.",
    account_mismatch: "Sign in to the Instagram account matching the selected account card.",
    connection_failed: "Instagram could not be connected. Check the app configuration and account access, then try again.",
  };
  return result && Object.hasOwn(messages, result) ? { title: "Instagram connection", description: messages[result], color: "danger" } : null;
}
