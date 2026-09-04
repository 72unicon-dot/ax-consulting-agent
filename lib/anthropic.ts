import "server-only";
import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getAnthropicClient() {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    // Identity-linked API keys (issued from an Anthropic Console user
    // account rather than scoped to a workspace) require an explicit
    // anthropic-workspace-id header on every request. Provide the header
    // whenever the env var is set — workspace-scoped keys can ignore it.
    const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID;
    client = new Anthropic({
      apiKey,
      ...(workspaceId
        ? { defaultHeaders: { "anthropic-workspace-id": workspaceId } }
        : {}),
    });
  }
  return client;
}

export const DEFAULT_MODEL = "claude-opus-5";
