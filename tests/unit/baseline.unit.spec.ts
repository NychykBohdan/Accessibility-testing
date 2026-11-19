import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import type { Result } from 'axe-core';
import {
  buildBaseline,
  compareWithBaseline,
  describeBaselineChanges,
  isBlocking,
  loadBaseline,
  parseBaseline,
  serializeBaseline,
} from '../../src/a11y/baseline.ts';

function violation(id: string, impact: Result['impact']): Result {
  return {
    id,
    impact,
    tags: [],
    description: id,
    help: id,
    helpUrl: `https://dequeuniversity.com/rules/axe/4.14/${id}`,
    nodes: [],
  };
}

const ids = (list: readonly Result[]): string[] => list.map((v) => v.id);

test.describe('baseline', () => {
  test('compareWithBaseline › splits violations into new / known / fixed', () => {
    const result = compareWithBaseline(
      [violation('color-contrast', 'serious'), violation('label', 'critical')],
      ['color-contrast', 'image-alt'],
    );
    expect(result.baselineMissing).toBe(false);
    expect(ids(result.new)).toEqual(['label']);
    expect(ids(result.known)).toEqual(['color-contrast']);
    expect(result.fixed).toEqual(['image-alt']);
  });

  test('compareWithBaseline › only new critical/serious are blocking', () => {
    const result = compareWithBaseline(
      [
        violation('image-alt', 'critical'),
        violation('color-contrast', 'serious'),
        violation('list', 'moderate'),
        violation('meta-viewport', 'minor'),
        violation('known-serious', 'serious'),
      ],
      ['known-serious'],
    );
    expect(ids(result.blocking)).toEqual(['image-alt', 'color-contrast']);
    expect(ids(result.warnings)).toEqual(['list', 'meta-viewport']);
  });

  test('compareWithBaseline › missing key treats everything as new', () => {
    const result = compareWithBaseline([violation('image-alt', 'critical')], undefined);
    expect(result.baselineMissing).toBe(true);
    expect(ids(result.blocking)).toEqual(['image-alt']);
    expect(result.fixed).toEqual([]);
  });

  test('compareWithBaseline › clean scan against empty baseline entry', () => {
    const result = compareWithBaseline([], []);
    expect(result).toEqual({
      baselineMissing: false,
      new: [],
      known: [],
      fixed: [],
      blocking: [],
      warnings: [],
    });
  });

  test('isBlocking › null impact is treated as minor', () => {
    expect(isBlocking(violation('x', null))).toBe(false);
    expect(isBlocking(violation('x', 'serious'))).toBe(true);
  });

  test('buildBaseline › sorts keys and ids, merges duplicates', () => {
    const baseline = buildBaseline([
      { scanKey: 'inventory', ruleIds: ['region', 'color-contrast'] },
      { scanKey: 'cart', ruleIds: [] },
      { scanKey: 'inventory', ruleIds: ['color-contrast', 'aria-roles'] },
    ]);
    expect(Object.keys(baseline)).toEqual(['cart', 'inventory']);
    expect(baseline).toEqual({
      cart: [],
      inventory: ['aria-roles', 'color-contrast', 'region'],
    });
  });

  test('serializeBaseline › is deterministic regardless of input order', () => {
    const a = serializeBaseline({ b: ['y', 'x'], a: [] });
    const b = serializeBaseline({ a: [], b: ['x', 'y'] });
    expect(a).toBe(b);
    expect(a).toBe('{\n  "a": [],\n  "b": [\n    "x",\n    "y"\n  ]\n}\n');
  });

  test('parseBaseline › rejects malformed files', () => {
    expect(parseBaseline('{"login":["label"]}')).toEqual({ login: ['label'] });
    expect(() => parseBaseline('[]')).toThrow(/must be a JSON object/);
    expect(() => parseBaseline('{"login":"label"}')).toThrow(/"login" must be an array/);
    expect(() => parseBaseline('{"login":[1]}')).toThrow(/"login" must be an array/);
  });

  test('loadBaseline › missing file is an empty baseline, existing file is parsed', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'a11y-baseline-'));
    expect(loadBaseline(path.join(dir, 'missing.json'))).toEqual({});
    const file = path.join(dir, 'baseline.json');
    writeFileSync(file, '{"cart":[]}');
    expect(loadBaseline(file)).toEqual({ cart: [] });
  });

  test('describeBaselineChanges › lists added and removed rules and keys', () => {
    const changes = describeBaselineChanges(
      { login: ['label'], cart: [], old: [] },
      { login: ['color-contrast'], cart: [], inventory: ['region'] },
    );
    expect(changes).toEqual([
      '+ inventory (new key): region',
      '+ login: color-contrast',
      '- login: label',
      '- old (key removed)',
    ]);
  });
});
