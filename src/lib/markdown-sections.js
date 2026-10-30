import { marked } from "marked";

const options = { gfm: true, breaks: true };

export function isAtxH2(token) {
  return token?.type === "heading" && token.depth === 2 && /^ {0,3}##(?!#)/.test(token.raw || "");
}

function joinRaw(tokens, start) {
  let text = "";
  for (let i = start; i < tokens.length; i++) {
    if (i !== start && isAtxH2(tokens[i])) break;
    const raw = tokens[i].raw || "";
    if (text && !text.endsWith("\n") && raw && !raw.startsWith("\n")) text += "\n";
    text += raw;
  }
  return text.replace(/\s+$/, "");
}

export function h2Sections(text) {
  const tokens = marked.lexer(text || "", options);
  const sections = [];
  tokens.forEach((token, index) => {
    if (isAtxH2(token)) sections.push(joinRaw(tokens, index));
  });
  return sections;
}

export function lexMarkdown(text) {
  const tokens = marked.lexer(text || "", options);
  let index = 0;
  for (const token of tokens) if (isAtxH2(token)) token.sectionIndex = index++;
  return tokens;
}

export { options as markdownOptions };
