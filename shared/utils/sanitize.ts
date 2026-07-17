// Allowlist-based HTML sanitizer for admin-authored rich text (TipTap output).
// Applied server-side at save time as defense-in-depth against stored XSS. Runs in
// the Workers runtime (no DOM), so it is regex-based against a tight allowlist that
// matches what the editor can produce.

const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'a', 'code', 'pre', 'hr', 'span',
]);

// Elements whose entire contents must be discarded, not just the tags.
const DANGEROUS_BLOCKS = /<(script|style|iframe|object|embed|noscript|template)[\s\S]*?<\/\1>/gi;
const SAFE_HREF = /^(https?:|mailto:|tel:|\/|#)/i;

export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return '';
  let html = input.replace(DANGEROUS_BLOCKS, '');
  // Strip any stray dangerous tags left without a matching close.
  html = html.replace(/<\/?(script|style|iframe|object|embed|noscript|template)[^>]*>/gi, '');

  // Rebuild every tag from an allowlist, dropping all attributes except a safe href on <a>.
  html = html.replace(/<(\/?)([a-zA-Z0-9]+)([^>]*)>/g, (_m, closing: string, tag: string, attrs: string) => {
    const t = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(t)) return ''; // drop the tag markers, keep inner text
    if (closing) return `</${t}>`;
    if (t === 'a') {
      const hrefMatch = attrs.match(/href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const href = (hrefMatch?.[2] ?? hrefMatch?.[3] ?? hrefMatch?.[4] ?? '').trim();
      if (href && SAFE_HREF.test(href)) {
        return `<a href="${href.replace(/"/g, '&quot;')}" rel="noopener noreferrer">`;
      }
      return '<a>';
    }
    return `<${t}>`;
  });

  return html;
}
