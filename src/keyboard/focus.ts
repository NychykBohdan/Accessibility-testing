import type { Page } from '@playwright/test';

/** Snapshot of the element that currently has keyboard focus. */
export interface FocusedElementInfo {
  /** `true` when nothing is focused (document.activeElement is <body>) — focus is "lost". */
  readonly isBody: boolean;
  readonly tag: string;
  readonly id: string | null;
  readonly dataTest: string | null;
  /** ARIA role as computed by Playwright's accessibility snapshot (e.g. "button", "textbox"). */
  readonly role: string | null;
  /** Accessible name as computed by Playwright's accessibility snapshot. */
  readonly name: string | null;
}

export type FocusPredicate = (info: FocusedElementInfo) => boolean;

export interface TabOptions {
  /** Maximum number of key presses before giving up (guards against keyboard traps). */
  readonly maxSteps?: number;
  /** `Shift+Tab` to move backwards. */
  readonly key?: 'Tab' | 'Shift+Tab';
}

export interface TabResult {
  readonly info: FocusedElementInfo;
  readonly steps: number;
  /** Every focus stop visited, in order (including the final one). */
  readonly visited: readonly FocusedElementInfo[];
}

const FOCUSED = '*:focus';

/** First line of an aria snapshot looks like `- button "Login"` or `- link "Home":`. */
const ARIA_LINE = /^- ([\w-]+)(?: "((?:[^"\\]|\\.)*)")?/;

function parseAriaLine(snapshot: string): { role: string | null; name: string | null } {
  const match = ARIA_LINE.exec(snapshot.split('\n')[0] ?? '');
  if (!match) return { role: null, name: null };
  return { role: match[1] ?? null, name: match[2]?.replace(/\\(.)/g, '$1') ?? null };
}

/** Returns role, accessible name and identifiers of the focused element. */
export async function getFocusedElementInfo(page: Page): Promise<FocusedElementInfo> {
  const dom = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body || el === document.documentElement) return null;
    return {
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      dataTest: el.getAttribute('data-test'),
    };
  });
  if (!dom) return { isBody: true, tag: 'body', id: null, dataTest: null, role: null, name: null };

  const focused = page.locator(FOCUSED);
  const snapshot = (await focused.count()) === 1 ? await focused.ariaSnapshot() : '';
  return { isBody: false, ...dom, ...parseAriaLine(snapshot) };
}

/** Short human-readable description, e.g. `button "Login" [login-button]`. */
export function describeFocus(info: FocusedElementInfo): string {
  if (info.isBody) return '<body> (focus lost)';
  const name = info.name === null ? '' : ` "${info.name}"`;
  const id = info.dataTest ?? info.id;
  return `${info.role ?? info.tag}${name}${id ? ` [${id}]` : ''}`;
}

/**
 * Presses Tab (or Shift+Tab) until `predicate` matches the focused element.
 * Throws with the visited path if it is not reached within `maxSteps`.
 */
export async function tabUntil(
  page: Page,
  predicate: FocusPredicate,
  { maxSteps = 40, key = 'Tab' }: TabOptions = {},
): Promise<TabResult> {
  const visited: FocusedElementInfo[] = [];
  for (let step = 1; step <= maxSteps; step++) {
    await page.keyboard.press(key);
    const info = await getFocusedElementInfo(page);
    visited.push(info);
    if (predicate(info)) return { info, steps: step, visited };
  }
  throw new Error(
    `tabUntil: target not reached after ${maxSteps} × ${key}. Visited:\n` +
      visited.map((v, i) => `  ${i + 1}. ${describeFocus(v)}`).join('\n'),
  );
}

/** Presses Tab `count` times and returns every focus stop. */
export async function tabSequence(page: Page, count: number): Promise<FocusedElementInfo[]> {
  const visited: FocusedElementInfo[] = [];
  for (let i = 0; i < count; i++) {
    await page.keyboard.press('Tab');
    visited.push(await getFocusedElementInfo(page));
  }
  return visited;
}

export interface FocusStopAudit {
  readonly info: FocusedElementInfo;
  readonly visible: boolean;
}

/** Tabs through `count` focus stops and checks the focus indicator on each of them. */
export async function auditFocusIndicators(page: Page, count: number): Promise<FocusStopAudit[]> {
  const stops: FocusStopAudit[] = [];
  for (let i = 0; i < count; i++) {
    await page.keyboard.press('Tab');
    stops.push({ info: await getFocusedElementInfo(page), visible: await isFocusVisible(page) });
  }
  return stops;
}

/** Predicate helpers. */
export const byName =
  (name: string, role?: string): FocusPredicate =>
  (info) =>
    info.name === name && (role === undefined || info.role === role);

export const byTestId =
  (dataTest: string): FocusPredicate =>
  (info) =>
    info.dataTest === dataTest;

/**
 * Whether the focused element renders a focus indicator via `outline` or `box-shadow`
 * (computed style). Other techniques (border / background change) are not detected —
 * see the visual focus tests for a pixel-based check.
 */
export async function isFocusVisible(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return false;
    const style = getComputedStyle(el);
    const transparent = (color: string): boolean =>
      color === 'transparent' || /rgba\(.*,\s*0\)$/.test(color);
    const outline =
      style.outlineStyle !== 'none' &&
      parseFloat(style.outlineWidth) > 0 &&
      !transparent(style.outlineColor);
    const shadow = style.boxShadow !== 'none' && style.boxShadow !== '';
    return outline || shadow;
  });
}
