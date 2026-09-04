import React from "react";

/**
 * Minimal markdown renderer for server-generated reports.
 * Supports: h1/h2/h3, paragraphs, unordered/ordered lists, bold, italic, tables, hr.
 * NOT a general markdown engine — only handles the shapes produced by lib/reports/generate.ts.
 */

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let idx = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index));
    }
    const tok = match[0];
    if (tok.startsWith("**")) {
      nodes.push(
        <strong key={`${keyPrefix}-b-${idx++}`} className="font-semibold">
          {tok.slice(2, -2)}
        </strong>,
      );
    } else if (tok.startsWith("_")) {
      nodes.push(
        <em key={`${keyPrefix}-i-${idx++}`}>{tok.slice(1, -1)}</em>,
      );
    } else if (tok.startsWith("`")) {
      nodes.push(
        <code
          key={`${keyPrefix}-c-${idx++}`}
          className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[0.9em] dark:bg-zinc-800"
        >
          {tok.slice(1, -1)}
        </code>,
      );
    }
    last = regex.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function RenderMarkdown({ source }: { source: string }) {
  const lines = source.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    if (line.startsWith("# ")) {
      blocks.push(
        <h1
          key={key++}
          className="mt-8 border-b border-zinc-200 pb-3 text-3xl font-bold text-zinc-900 first:mt-0 dark:border-zinc-800 dark:text-zinc-50"
        >
          {renderInline(line.slice(2), `k${key}`)}
        </h1>,
      );
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push(
        <h2
          key={key++}
          className="mt-8 text-xl font-semibold text-zinc-900 dark:text-zinc-50"
        >
          {renderInline(line.slice(3), `k${key}`)}
        </h2>,
      );
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push(
        <h3
          key={key++}
          className="mt-6 text-base font-semibold text-zinc-800 dark:text-zinc-200"
        >
          {renderInline(line.slice(4), `k${key}`)}
        </h3>,
      );
      i++;
      continue;
    }
    if (line.trim() === "---") {
      blocks.push(
        <hr
          key={key++}
          className="my-6 border-zinc-200 dark:border-zinc-800"
        />,
      );
      i++;
      continue;
    }
    // Tables (very simple: header row + separator + body rows)
    if (line.startsWith("|") && lines[i + 1]?.match(/^\|\s*-+/)) {
      const header = line
        .split("|")
        .slice(1, -1)
        .map((s) => s.trim());
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        rows.push(
          lines[i]
            .split("|")
            .slice(1, -1)
            .map((s) => s.trim()),
        );
        i++;
      }
      blocks.push(
        <div key={key++} className="my-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left dark:border-zinc-800">
                {header.map((h, hi) => (
                  <th
                    key={hi}
                    className="px-3 py-2 font-semibold text-zinc-700 dark:text-zinc-300"
                  >
                    {renderInline(h, `th${hi}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr
                  key={ri}
                  className="border-b border-zinc-100 dark:border-zinc-900"
                >
                  {r.map((c, ci) => (
                    <td
                      key={ci}
                      className="px-3 py-2 text-zinc-800 dark:text-zinc-200"
                    >
                      {renderInline(c, `td${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    // Lists
    if (/^\s*[-*] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*] /.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*] /, ""));
        i++;
      }
      blocks.push(
        <ul
          key={key++}
          className="my-3 list-disc pl-5 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200"
        >
          {items.map((it, ii) => (
            <li key={ii}>{renderInline(it, `li${ii}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }
    if (/^\s*\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s/, ""));
        i++;
      }
      blocks.push(
        <ol
          key={key++}
          className="my-3 list-decimal pl-5 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200"
        >
          {items.map((it, ii) => (
            <li key={ii}>{renderInline(it, `oli${ii}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }
    // Paragraph — collect consecutive non-blank, non-special lines
    const para: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith("|") &&
      !/^\s*[-*] /.test(lines[i]) &&
      !/^\s*\d+\.\s/.test(lines[i]) &&
      lines[i].trim() !== "---"
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(
      <p
        key={key++}
        className="my-3 whitespace-pre-line text-sm leading-relaxed text-zinc-800 dark:text-zinc-200"
      >
        {renderInline(para.join("\n"), `p${key}`)}
      </p>,
    );
  }

  return <>{blocks}</>;
}
