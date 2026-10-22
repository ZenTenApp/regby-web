import { describe, expect, it } from 'vitest';

import {
  assertCodeTag,
  assertMintable,
  codeExpiresAt,
  displayableContent,
  isBlankContent,
  normalizeRegbyCode,
} from './protocol';

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

  // Empty and whitespace-only content are valid ReGBY content (protocol.md).
  it.each(['', '   '])('accepts empty content %j', (content) => {
    expect(() => assertMintable(content)).not.toThrow();
  });

  it.each([
    ['too-long', 'x'.repeat(4097)],
    ['binary', 'a\u0000b'],
    ['binary', 'bad � byte'],
  ])('refuses %s', (reason, content) => {
    expect(() => assertMintable(content)).toThrow(expect.objectContaining({ reason }));
  });
});

describe('assertCodeTag', () => {
  it('accepts a matching tag', () => {
    expect(() => assertCodeTag([['regby_code', '12345678']], '12345678')).not.toThrow();
  });

  it('accepts a reply without the tag', () => {
    expect(() => assertCodeTag([['i', 'regby_code']], '12345678')).not.toThrow();
  });

  it('refuses a tag naming another code', () => {
    expect(() => assertCodeTag([['regby_code', '87654321']], '12345678')).toThrow(
      expect.objectContaining({ reason: 'malformed' }),
    );
  });
});

describe('isBlankContent', () => {
  it.each(['', '   ', '\n\t'])('treats %j as blank', (content) => {
    expect(isBlankContent(content)).toBe(true);
  });

  it('keeps text with surrounding space', () => {
    expect(isBlankContent(' a ')).toBe(false);
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

describe('codeExpiresAt', () => {
  // Broker clock 1000 s, reply received at local 5_000_000 ms. Each case is
  // one second short of the broker's window, covering its whole-second floor.
  const brokerNow = 1000;
  const receivedAt = 5_000_000;

  it.each([
    ['in sync', 1000, 59],
    ['device ahead within skew', 1020, 79],
    ['device behind within skew', 980, 39],
    ['device far ahead: re-anchored to broker now', 1100, 59],
    ['device far behind: capped at broker now - skew', 900, 29],
  ])('%s', (_, requestCreatedAt, secondsLeft) => {
    expect(codeExpiresAt(requestCreatedAt, brokerNow, receivedAt)).toBe(receivedAt + secondsLeft * 1000);
  });
});
