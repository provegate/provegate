import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/core/config/index.js';
import { normalizeAutonomousClose, normalizeStatus } from '../src/core/state/status.js';

const vocab = DEFAULT_CONFIG.statusVocab;

describe('normalizeStatus', () => {
  it('maps canonical values case-insensitively', () => {
    expect(normalizeStatus(vocab, 'ship verified')).toBe('Ship Verified');
    expect(normalizeStatus(vocab, '**In Progress**')).toBe('In Progress');
  });

  it('maps aliases to canonical values', () => {
    expect(normalizeStatus(vocab, 'done')).toBe('Ship Verified');
    expect(normalizeStatus(vocab, 'Proposed')).toBe('Draft');
  });

  it('takes the first segment of a pipe-joined placeholder', () => {
    expect(normalizeStatus(vocab, 'Draft | In Review | Approved')).toBe('Draft');
  });

  it('matches the head of an annotated status instead of degrading', () => {
    expect(normalizeStatus(vocab, 'Ship Verified — operator checks accepted 2026-06-01')).toBe(
      'Ship Verified',
    );
    expect(normalizeStatus(vocab, 'Blocked (waiting on infra)')).toBe('Blocked');
  });

  it('falls back for unknown values and empty input', () => {
    expect(normalizeStatus(vocab, 'Weird')).toBe('Unknown');
    expect(normalizeStatus(vocab, null, 'X')).toBe('X');
  });

  it('respects a custom vocabulary (vocab-driven, not hardcoded)', () => {
    const custom = {
      ...vocab,
      canonical: ['Open', 'Shipped'],
      aliases: { finished: 'Shipped' },
    };
    expect(normalizeStatus(custom, 'finished')).toBe('Shipped');
    expect(normalizeStatus(custom, 'Draft')).toBe('Unknown');
  });
});

describe('normalizeAutonomousClose', () => {
  it('accepts the two bare tokens', () => {
    expect(normalizeAutonomousClose('eligible')).toBe('eligible');
    expect(normalizeAutonomousClose('operator-gated')).toBe('operator-gated');
  });

  it('degrades the template pipe placeholder to null', () => {
    expect(normalizeAutonomousClose('eligible | operator-gated')).toBeNull();
  });

  it('lets the safer value win on hedged double-token input', () => {
    expect(normalizeAutonomousClose('eligible operator-gated')).toBe('operator-gated');
  });

  it('returns null for junk or empty', () => {
    expect(normalizeAutonomousClose('maybe')).toBeNull();
    expect(normalizeAutonomousClose(null)).toBeNull();
  });
});
