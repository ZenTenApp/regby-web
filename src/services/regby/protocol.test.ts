import { describe, expect, it } from 'vitest';

import { assertMintable, displayableContent, normalizeRegbyCode } from './protocol';

describe('normalizeRegbyCode', () => {
  it.each([
    ['42891337', '42891337'],
    ['42 89 13 37', '42891337'],
    [' 42891337\n', '42891337'],
  ])('accepts %j', (input, expected) => {
    expect(normalizeRegbyCode(input)).toBe(expected);
  });

  it.each(['4289133', '428913370', '2026-09-21', '12.345.678', 'abcdefgh', ''])('refuses %j', (input) => {
    expect(normalizeRegbyCode(input)).toBeNull();
  });
});

describe('assertMintable', () => {
  it('accepts multi-line text', () => {
    expect(() => assertMintable('line one\n\tline two\r\n')).not.toThrow();
  });

  it.each([
    ['empty', '   '],
    ['too-long', 'x'.repeat(4097)],
    ['binary', 'a\u0000b'],
    ['binary', 'bad � byte'],
  ])('refuses %s', (reason, content) => {
    expect(() => assertMintable(content)).toThrow(expect.objectContaining({ reason }));
  });
});

describe('displayableContent', () => {
  it('strips bidi overrides and reports it', () => {
    expect(displayableContent('pay ‮evil')).toEqual({ text: 'pay evil', hadHidden: true });
  });

  it('keeps line breaks and tabs', () => {
    expect(displayableContent('a\n\tb')).toEqual({ text: 'a\n\tb', hadHidden: false });
  });
});
