import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { lexMarkdown, markdownOptions } from './markdown-sections.js';

export { h2Sections } from './markdown-sections.js';

export function markdown(text) {
  const tokens = lexMarkdown(text);
  const html = marked.parser(tokens, {
    ...markdownOptions,
    renderer: {
      heading(token) {
        const inner = this.parser.parseInline(token.tokens);
        const tag = `h${token.depth}`;
        if (token.sectionIndex != null) return `<${tag} class="md-section" data-md-section="${token.sectionIndex}">${inner}</${tag}>\n`;
        return `<${tag}>${inner}</${tag}>\n`;
      },
    },
  });
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'input', 'form', 'button', 'iframe', 'img'],
    FORBID_ATTR: ['style', 'id', 'name'],
  });
}
