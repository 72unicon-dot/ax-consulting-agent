// Quick local probe: does the current ANTHROPIC_API_KEY + optional
// ANTHROPIC_WORKSPACE_ID actually reach Claude Opus 5?
import { readFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const workspaceId = env.ANTHROPIC_WORKSPACE_ID;
const client = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
  ...(workspaceId
    ? { defaultHeaders: { "anthropic-workspace-id": workspaceId } }
    : {}),
});

try {
  const r = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 100,
    messages: [{ role: "user", content: "reply with one word: pong" }],
  });
  const text = r.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  console.log("OK:", text);
  console.log(
    "model:",
    r.model,
    "input:",
    r.usage.input_tokens,
    "output:",
    r.usage.output_tokens,
  );
} catch (e) {
  console.error("ERR:", e.status, e.message);
  if (e.error) console.error("body:", JSON.stringify(e.error));
  process.exit(1);
}
