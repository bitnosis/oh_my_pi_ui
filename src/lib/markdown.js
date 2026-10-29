import { marked } from 'marked';
import DOMPurify from 'dompurify';

export function markdown(text) {
  return DOMPurify.sanitize(marked.parse(text || '', { gfm: true, breaks: true }), {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'input', 'form', 'button', 'iframe', 'img'],
    FORBID_ATTR: ['style', 'id', 'name'],
  });
}
