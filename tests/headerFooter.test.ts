import { describe, expect, it } from 'vitest';
import {
  buildPageRules,
  formatMarginContent,
  hasCustomHeaderFooter,
  HEADER_FOOTER_COLOR,
} from '../lib/headerFooter';
import { DEFAULT_STYLE_SETTINGS } from '../lib/styleSettings';

describe('formatMarginContent', () => {
  it('returns an empty CSS string for blank input', () => {
    expect(formatMarginContent('   ')).toBe('""');
  });

  it('supports mixed text with current and total page commands', () => {
    expect(formatMarginContent('Page {page} of {pages}')).toBe('"Page " counter(page) " of " counter(pages)');
  });

  it('supports legacy CSS counter syntax', () => {
    expect(formatMarginContent('counter(page) / counter(pages)')).toBe('counter(page) " / " counter(pages)');
  });

  it('formats the date command as text content', () => {
    expect(formatMarginContent('Printed {date}')).toContain('Printed ');
    expect(formatMarginContent('Printed {date}')).toContain('202');
  });
});

describe('buildPageRules', () => {
  it('builds header and footer rules with the tertiary margin color', () => {
    const rules = buildPageRules(
      {
        ...DEFAULT_STYLE_SETTINGS,
        headerLeft: 'Doc',
        footerCenter: 'Page {page} of {pages}',
      },
      'portrait'
    );

    expect(rules).toContain('@top-left { content: "Doc";');
    expect(rules).toContain('@bottom-center { content: "Page " counter(page) " of " counter(pages);');
    expect(rules).toContain(`color: ${HEADER_FOOTER_COLOR};`);
  });

  it('supports custom margin and margin-box font size options', () => {
    const rules = buildPageRules(
      {
        ...DEFAULT_STYLE_SETTINGS,
        headerLeft: 'Doc',
      },
      'portrait',
      { marginMm: 18, marginFontSizePt: 8 }
    );

    expect(rules).toContain('margin: 18mm;');
    expect(rules).toContain('font-size: 8pt;');
  });
});

describe('hasCustomHeaderFooter', () => {
  it('returns false when all margin box fields are empty', () => {
    expect(hasCustomHeaderFooter(DEFAULT_STYLE_SETTINGS)).toBe(false);
  });

  it('returns true when any header or footer field has content', () => {
    expect(
      hasCustomHeaderFooter({
        ...DEFAULT_STYLE_SETTINGS,
        footerRight: 'Page {page}',
      })
    ).toBe(true);
  });
});