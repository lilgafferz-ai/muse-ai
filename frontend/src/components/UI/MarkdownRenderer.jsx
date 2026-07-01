import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";

// ─── Inline Parser ────────────────────────────────────────────────────────────
function parseInline(text) {
  if (!text) return null;
  const segments = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const codeMatch   = remaining.match(/^(.*?)`([^`]+)`(.*)/s);
    const boldMatch   = remaining.match(/^(.*?)\*\*([^*]+)\*\*(.*)/s);
    const italicMatch = remaining.match(/^(.*?)(?<!\*)\*(?!\*)([^*]+)\*(?!\*)(.*)/s);
    const linkMatch   = remaining.match(/^(.*?)\[([^\]]+)\]\(([^)]+)\)(.*)/s);

    const candidates = [
      codeMatch   ? { type: "code",   match: codeMatch,   start: codeMatch[1].length }   : null,
      boldMatch   ? { type: "bold",   match: boldMatch,   start: boldMatch[1].length }   : null,
      italicMatch ? { type: "italic", match: italicMatch, start: italicMatch[1].length } : null,
      linkMatch   ? { type: "link",   match: linkMatch,   start: linkMatch[1].length }   : null,
    ].filter(Boolean);

    if (candidates.length === 0) {
      segments.push(<span key={key++}>{remaining}</span>);
      break;
    }

    candidates.sort((a, b) => a.start - b.start);
    const winner = candidates[0];
    const { type, match } = winner;

    if (match[1]) segments.push(<span key={key++}>{match[1]}</span>);

    if (type === "code") {
      segments.push(<code key={key++}>{match[2]}</code>);
      remaining = match[3];
    } else if (type === "bold") {
      segments.push(<strong key={key++}>{match[2]}</strong>);
      remaining = match[3];
    } else if (type === "italic") {
      segments.push(<em key={key++}>{match[2]}</em>);
      remaining = match[3];
    } else if (type === "link") {
      segments.push(
        <a key={key++} href={match[3]} target="_blank" rel="noopener noreferrer">
          {match[2]}
        </a>
      );
      remaining = match[4];
    }
  }

  return segments.length === 1 ? segments[0] : <>{segments}</>;
}

// ─── Code Block ───────────────────────────────────────────────────────────────
function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const el = document.createElement("textarea");
      el.value = code;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const displayLang = language || "text";

  return (
    <div
      className="rounded-xl overflow-hidden mb-4"
      style={{ background: "rgba(8,5,20,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ background: "rgb(38,32,70)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <span
          className="text-[11px] font-mono font-medium tracking-wide"
          style={{ color: "rgba(167,139,250,0.8)" }}
        >
          {displayLang}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-all duration-200"
          style={{
            color: copied ? "#4ade80" : "rgba(255,255,255,0.4)",
            background: copied ? "rgba(34,197,94,0.1)" : "transparent",
          }}
          title="Copy code"
        >
          {copied ? <><Check size={12} /><span>Copied</span></> : <><Copy size={12} /><span>Copy</span></>}
        </button>
      </div>
      <pre style={{ margin: 0, background: "transparent" }}>
        <code
          className="block overflow-x-auto text-xs"
          style={{
            padding: "16px",
            color: "#e2e8f0",
            lineHeight: "1.7",
            fontFamily: "'JetBrains Mono','Fira Code',monospace",
          }}
        >
          {code}
        </code>
      </pre>
    </div>
  );
}

// ─── Block Parser ─────────────────────────────────────────────────────────────
function parseBlocks(markdown) {
  const blocks = [];
  const lines = markdown.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    const fenceMatch = line.match(/^```(\w*)$/);
    if (fenceMatch) {
      const lang = fenceMatch[1];
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].match(/^```$/)) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: "code", lang, code: codeLines.join("\n") });
      i++;
      continue;
    }

    // Horizontal rule
    if (line.match(/^(---+|\*\*\*+|___+)$/)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // Headings
    const h4m = line.match(/^####\s+(.+)/);
    const h3m = line.match(/^###\s+(.+)/);
    const h2m = line.match(/^##\s+(.+)/);
    const h1m = line.match(/^#\s+(.+)/);
    if (h4m) { blocks.push({ type: "h4", text: h4m[1] }); i++; continue; }
    if (h3m) { blocks.push({ type: "h3", text: h3m[1] }); i++; continue; }
    if (h2m) { blocks.push({ type: "h2", text: h2m[1] }); i++; continue; }
    if (h1m) { blocks.push({ type: "h1", text: h1m[1] }); i++; continue; }

    // Blockquote
    if (line.match(/^>\s*/)) {
      const quoteLines = [];
      while (i < lines.length && lines[i].match(/^>\s*/)) {
        quoteLines.push(lines[i].replace(/^>\s*/, ""));
        i++;
      }
      blocks.push({ type: "blockquote", text: quoteLines.join("\n") });
      continue;
    }

    // Table (pipe lines followed by separator)
    if (
      line.includes("|") &&
      i + 1 < lines.length &&
      lines[i + 1].match(/^\|?[\s\-|:]+\|?$/)
    ) {
      const tableLines = [];
      while (i < lines.length && lines[i].includes("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const parseRow = (row) =>
        row.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
      const headers = parseRow(tableLines[0]);
      const rows = tableLines.slice(2).map(parseRow);
      blocks.push({ type: "table", headers, rows });
      continue;
    }

    // Unordered list
    if (line.match(/^[-*]\s+/)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^[-*]\s+/)) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    // Ordered list
    if (line.match(/^\d+\.\s+/)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s+/)) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph (collect until blank / block-level token)
    const paraLines = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].match(/^#{1,4}\s/) &&
      !lines[i].match(/^[-*]\s+/) &&
      !lines[i].match(/^\d+\.\s+/) &&
      !lines[i].match(/^>\s*/) &&
      !lines[i].match(/^```/) &&
      !lines[i].match(/^(---+|\*\*\*+|___+)$/)
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: "paragraph", lines: paraLines });
    }
  }

  return blocks;
}

// ─── Block Renderer ───────────────────────────────────────────────────────────
function renderBlocks(blocks) {
  return blocks.map((block, idx) => {
    switch (block.type) {
      case "h1": return <h1 key={idx}>{parseInline(block.text)}</h1>;
      case "h2": return <h2 key={idx}>{parseInline(block.text)}</h2>;
      case "h3": return <h3 key={idx}>{parseInline(block.text)}</h3>;
      case "h4": return <h4 key={idx}>{parseInline(block.text)}</h4>;
      case "code": return <CodeBlock key={idx} language={block.lang} code={block.code} />;
      case "hr": return <hr key={idx} />;
      case "blockquote":
        return <blockquote key={idx}>{parseInline(block.text)}</blockquote>;
      case "table":
        return (
          <table key={idx}>
            <thead>
              <tr>
                {block.headers.map((h, hIdx) => <th key={hIdx}>{parseInline(h)}</th>)}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rIdx) => (
                <tr key={rIdx}>
                  {row.map((cell, cIdx) => <td key={cIdx}>{parseInline(cell)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        );
      case "ul":
        return (
          <ul key={idx}>
            {block.items.map((item, iIdx) => <li key={iIdx}>{parseInline(item)}</li>)}
          </ul>
        );
      case "ol":
        return (
          <ol key={idx}>
            {block.items.map((item, iIdx) => <li key={iIdx}>{parseInline(item)}</li>)}
          </ol>
        );
      case "paragraph": {
        const content = block.lines.reduce((acc, line, lineIdx) => {
          if (lineIdx === 0) return [parseInline(line)];
          return [...acc, <br key={`br-${lineIdx}`} />, parseInline(line)];
        }, []);
        return <p key={idx}>{content}</p>;
      }
      default: return null;
    }
  });
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function MarkdownRenderer({ content = "", className = "" }) {
  if (!content) return null;
  const blocks = parseBlocks(content);
  const rendered = renderBlocks(blocks);
  return <div className={`markdown-content ${className}`}>{rendered}</div>;
}