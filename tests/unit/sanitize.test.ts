import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '@shared/utils/sanitize';

describe('sanitizeHtml', () => {
  it('keeps allowed formatting tags', () => {
    const input = '<p>Hello <strong>world</strong> and <em>more</em></p><ul><li>one</li></ul>';
    expect(sanitizeHtml(input)).toBe(input);
  });

  it('removes <script> blocks entirely', () => {
    expect(sanitizeHtml('<p>ok</p><script>alert(1)</script>')).toBe('<p>ok</p>');
  });

  it('strips event-handler attributes', () => {
    expect(sanitizeHtml('<p onclick="steal()">hi</p>')).toBe('<p>hi</p>');
  });

  it('drops disallowed tags but keeps their text', () => {
    expect(sanitizeHtml('<div><p>kept</p></div>')).toBe('<p>kept</p>');
  });

  it('allows safe links and rejects javascript: URLs', () => {
    expect(sanitizeHtml('<a href="https://atlase.ph">x</a>')).toContain('href="https://atlase.ph"');
    expect(sanitizeHtml('<a href="https://atlase.ph">x</a>')).toContain('rel="noopener noreferrer"');
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).toBe('<a>x</a>');
  });

  it('handles empty/nullish input', () => {
    expect(sanitizeHtml('')).toBe('');
    expect(sanitizeHtml(null)).toBe('');
    expect(sanitizeHtml(undefined)).toBe('');
  });
});
