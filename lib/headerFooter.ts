import { StyleSettings } from './styleSettings';

export const HEADER_FOOTER_COLOR = '#64748b';

interface PageRuleOptions {
  marginMm?: number;
  marginFontSizePt?: number;
}

const COMMAND_REGEX = /(counter\(\s*(page|pages)\s*\)|\{\{\s*(date|currentDate|page|pages|currentPage|totalPages|maxPages)\s*\}\}|\{\s*(date|currentDate|page|pages|currentPage|totalPages|maxPages)\s*\})/gi;

type ContentToken =
  | { type: 'text'; value: string }
  | { type: 'page' }
  | { type: 'pages' };

function escapeCssString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r\n|\r|\n/g, '\\A ');
}

function normalizeCommand(raw: string): ContentToken {
  const normalized = raw.toLowerCase().replace(/\s+/g, '');

  if (normalized === 'counter(page)' || normalized === '{page}' || normalized === '{{page}}' || normalized === '{currentpage}' || normalized === '{{currentpage}}') {
    return { type: 'page' };
  }

  if (normalized === 'counter(pages)' || normalized === '{pages}' || normalized === '{{pages}}' || normalized === '{totalpages}' || normalized === '{{totalpages}}' || normalized === '{maxpages}' || normalized === '{{maxpages}}') {
    return { type: 'pages' };
  }

  return {
    type: 'text',
    value: new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date()),
  };
}

function mergeTextTokens(tokens: ContentToken[]): ContentToken[] {
  return tokens.reduce<ContentToken[]>((merged, token) => {
    if (token.type !== 'text') {
      merged.push(token);
      return merged;
    }

    const previous = merged[merged.length - 1];
    if (previous?.type === 'text') {
      previous.value += token.value;
      return merged;
    }

    merged.push({ ...token });
    return merged;
  }, []);
}

export function formatMarginContent(input: string): string {
  if (!input.trim()) {
    return '""';
  }

  const tokens: ContentToken[] = [];
  let cursor = 0;

  for (const match of input.matchAll(COMMAND_REGEX)) {
    const [raw] = match;
    const start = match.index ?? 0;

    if (start > cursor) {
      tokens.push({ type: 'text', value: input.slice(cursor, start) });
    }

    tokens.push(normalizeCommand(raw));
    cursor = start + raw.length;
  }

  if (cursor < input.length) {
    tokens.push({ type: 'text', value: input.slice(cursor) });
  }

  return mergeTextTokens(tokens)
    .map((token) => {
      if (token.type === 'page') {
        return 'counter(page)';
      }

      if (token.type === 'pages') {
        return 'counter(pages)';
      }

      return `"${escapeCssString(token.value)}"`;
    })
    .join(' ');
}

export function hasCustomHeaderFooter(settings: StyleSettings): boolean {
  return [
    settings.headerLeft,
    settings.headerCenter,
    settings.headerRight,
    settings.footerLeft,
    settings.footerCenter,
    settings.footerRight,
  ].some((value) => value.trim().length > 0);
}

export function buildPageRules(
  settings: StyleSettings,
  orientation: 'portrait' | 'landscape',
  options: PageRuleOptions = {}
): string {
  const marginMm = options.marginMm ?? 20;
  const marginFontSizePt = options.marginFontSizePt ?? 9;
  const headerLeft = formatMarginContent(settings.headerLeft);
  const headerCenter = formatMarginContent(settings.headerCenter);
  const headerRight = formatMarginContent(settings.headerRight);
  const footerLeft = formatMarginContent(settings.footerLeft);
  const footerCenter = formatMarginContent(settings.footerCenter);
  const footerRight = formatMarginContent(settings.footerRight);

  return `
    @page {
      size: A4 ${orientation};
      margin: ${marginMm}mm;

      @top-left { content: ${headerLeft}; font-family: var(--md-font-family); font-size: ${marginFontSizePt}pt; color: ${HEADER_FOOTER_COLOR}; }
      @top-center { content: ${headerCenter}; font-family: var(--md-font-family); font-size: ${marginFontSizePt}pt; color: ${HEADER_FOOTER_COLOR}; }
      @top-right { content: ${headerRight}; font-family: var(--md-font-family); font-size: ${marginFontSizePt}pt; color: ${HEADER_FOOTER_COLOR}; }

      @bottom-left { content: ${footerLeft}; font-family: var(--md-font-family); font-size: ${marginFontSizePt}pt; color: ${HEADER_FOOTER_COLOR}; }
      @bottom-center { content: ${footerCenter}; font-family: var(--md-font-family); font-size: ${marginFontSizePt}pt; color: ${HEADER_FOOTER_COLOR}; }
      @bottom-right { content: ${footerRight}; font-family: var(--md-font-family); font-size: ${marginFontSizePt}pt; color: ${HEADER_FOOTER_COLOR}; }
    }
  `;
}