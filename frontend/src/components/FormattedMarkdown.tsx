import type { ReactNode } from "react";

function renderInline(text: string): ReactNode {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code key={idx} className="inline-code">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export function FormattedMarkdown({ content }: { content: string }) {
  if (!content) return null;

  const lines = content.split("\n");
  const elements: ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${i}`} className="markdown-code-block">
            <code>{codeBlockLines.join("\n")}</code>
          </pre>
        );
        inCodeBlock = false;
        codeBlockLines = [];
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(rawLine);
      continue;
    }

    if (!trimmed) {
      elements.push(<div key={`sp-${i}`} style={{ height: 6 }} />);
      continue;
    }

    if (trimmed.startsWith("### ")) {
      elements.push(
        <h4 key={`h4-${i}`} className="markdown-h4">
          {renderInline(trimmed.substring(4))}
        </h4>
      );
      continue;
    }

    if (trimmed.startsWith("## ")) {
      elements.push(
        <h3 key={`h3-${i}`} className="markdown-h3">
          {renderInline(trimmed.substring(3))}
        </h3>
      );
      continue;
    }

    if (trimmed.startsWith("# ")) {
      elements.push(
        <h2 key={`h2-${i}`} className="markdown-h2">
          {renderInline(trimmed.substring(2))}
        </h2>
      );
      continue;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      elements.push(
        <div key={`li-${i}`} className="markdown-li">
          <span className="markdown-bullet">•</span>
          <span>{renderInline(trimmed.substring(2))}</span>
        </div>
      );
      continue;
    }

    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      elements.push(
        <div key={`num-${i}`} className="markdown-li">
          <span className="markdown-bullet" style={{ minWidth: 20 }}>
            {numMatch[1]}.
          </span>
          <span>{renderInline(numMatch[2])}</span>
        </div>
      );
      continue;
    }

    elements.push(
      <p key={`p-${i}`} className="markdown-p">
        {renderInline(rawLine)}
      </p>
    );
  }

  if (inCodeBlock && codeBlockLines.length > 0) {
    elements.push(
      <pre key="code-unclosed" className="markdown-code-block">
        <code>{codeBlockLines.join("\n")}</code>
      </pre>
    );
  }

  return <div className="formatted-markdown">{elements}</div>;
}
