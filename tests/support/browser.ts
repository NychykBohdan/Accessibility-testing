/**
 * WebKit (like Safari with the default "Press Tab to highlight each item" setting off) does not
 * include links in sequential focus navigation. This is engine behaviour, not an app defect,
 * so tests that need to Tab onto links are skipped there.
 */
export const WEBKIT_SKIPS_LINKS =
  'WebKit excludes links from the Tab order by default (engine behaviour, not an app bug)';
