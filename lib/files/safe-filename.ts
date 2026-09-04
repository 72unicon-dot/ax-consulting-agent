/**
 * Sanitize a user-supplied filename for use as part of a storage object path.
 * Keeps Unicode letters and digits (Korean, Japanese, ...) plus `._-`,
 * collapses whitespace to `_`, strips path separators and special chars,
 * and caps the length at 80 characters. Returns `"file"` when nothing
 * usable remains.
 */
export function safeFilename(name: string): string {
  const trimmed = name.replace(/[/\\]/g, "_").trim();
  const collapsed = trimmed.replace(/\s+/g, "_");
  const kept = collapsed.replace(/[^\p{L}\p{N}._-]/gu, "");
  return kept.slice(0, 80) || "file";
}
