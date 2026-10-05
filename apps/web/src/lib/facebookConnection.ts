export function facebookLoginFeedback(result: string | null): { title: string; description: string; color: "success" | "danger" } | null {
  if (result === "choose_page") return { title: "Facebook authorized", description: "Choose a Page below to connect its official insights.", color: "success" };
  const messages: Record<string, string> = {
    cancelled: "Facebook login was cancelled. You can connect again when ready.",
    invalid_state: "This connection link expired or was already used. Connect Facebook again.",
    no_pages: "No eligible Facebook Pages were returned. Sign in with an account that can analyze your Page and allow Page access.",
    permission_required: "Facebook Page insights access was not granted. Connect again and allow Page list, engagement and insights permissions.",
    connection_failed: "Facebook could not be connected. Check the app configuration and Page permissions, then try again.",
  };
  return result && Object.hasOwn(messages, result) ? { title: "Facebook connection", description: messages[result], color: "danger" } : null;
}
