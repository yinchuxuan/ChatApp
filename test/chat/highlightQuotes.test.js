/**
 * Tests for highlightQuotes utility
 */

const { highlightQuotes, wrapQuotesInText } = require('../../src/components/highlightQuotes.js');

describe('highlightQuotes utility', () => {
  describe('wrapQuotesInText', () => {
    test('wraps text in English double quotes', () => {
      const result = wrapQuotesInText('Say "hello world" please');
      expect(result).toContain('<span class="quoted-text">"hello world"</span>');
    });

    test('wraps text in English single quotes', () => {
      const result = wrapQuotesInText("A 'nice day' today");
      expect(result).toContain("<span class=\"quoted-text\">'nice day'</span>");
    });

    test('wraps text in Chinese double quotes', () => {
      const result = wrapQuotesInText('他说“你好”');
      expect(result).toContain('<span class="quoted-text">“你好”</span>');
    });

    test('wraps text in Chinese double quotes (variant)', () => {
      const result = wrapQuotesInText('他说“你好”');
      expect(result).toContain('<span class="quoted-text">“你好”</span>');
    });

    test('wraps text in corner brackets', () => {
      const result = wrapQuotesInText('他说「你好」');
      expect(result).toContain('<span class="quoted-text">「你好」</span>');
    });

    test('wraps text in double corner brackets', () => {
      const result = wrapQuotesInText('他说『你好』');
      expect(result).toContain('<span class="quoted-text">『你好』</span>');
    });

    test('handles multiple quoted sections', () => {
      const result = wrapQuotesInText('Say "hello" and "world"');
      expect(result).toContain('<span class="quoted-text">"hello"</span>');
      expect(result).toContain('<span class="quoted-text">"world"</span>');
    });

    test('leaves unquoted text unchanged', () => {
      const result = wrapQuotesInText('Just plain text');
      expect(result).toBe('Just plain text');
    });

    test('leaves unmatched opening quote unchanged', () => {
      const result = wrapQuotesInText('Say "hello');
      expect(result).toBe('Say "hello');
    });
  });

  describe('highlightQuotes', () => {
    test('wraps quoted text in HTML content', () => {
      const html = '<p>Say "hello world"</p>';
      const result = highlightQuotes(html);
      expect(result).toContain('<span class="quoted-text">"hello world"</span>');
      expect(result).toContain('<p>');
    });

    test('does not modify HTML tags', () => {
      const html = '<strong>bold</strong> and "quoted"';
      const result = highlightQuotes(html);
      expect(result).toContain('<strong>bold</strong>');
      expect(result).toContain('<span class="quoted-text">"quoted"</span>');
    });

    test('handles code elements', () => {
      const html = '<code>var x = "test"</code>';
      const result = highlightQuotes(html);
      expect(result).toContain('<code>');
    });

    test('returns non-string input unchanged', () => {
      expect(highlightQuotes(null)).toBe(null);
      expect(highlightQuotes(undefined)).toBe(undefined);
      expect(highlightQuotes(123)).toBe(123);
    });

    test('handles empty string', () => {
      expect(highlightQuotes('')).toBe('');
    });

    test('handles complex HTML with multiple quotes', () => {
      const html = '<p>He said "hello" then "goodbye"</p>';
      const result = highlightQuotes(html);
      expect(result).toContain('<span class="quoted-text">"hello"</span>');
      expect(result).toContain('<span class="quoted-text">"goodbye"</span>');
    });

    test('handles Chinese quotes in HTML', () => {
      const html = '<p>他说“你好”然后“再见”</p>';
      const result = highlightQuotes(html);
      expect(result).toContain('<span class="quoted-text">“你好”</span>');
      expect(result).toContain('<span class="quoted-text">“再见”</span>');
    });

    test('handles corner bracket quotes in HTML', () => {
      const html = '<p>他说「欢迎」</p>';
      const result = highlightQuotes(html);
      expect(result).toContain('<span class="quoted-text">「欢迎」</span>');
    });
  });
});
