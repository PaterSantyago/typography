import { parseFragment, serialize } from "parse5";
import hyphenEnGb from "hyphen/en-gb/index.js";
import hyphenEnUs from "hyphen/en-us/index.js";
import hyphenEs from "hyphen/es/index.js";

import { resolveTypographyConfig } from "./config.js";
import { typographerDefaults } from "./defaults.js";
import type {
  PartialDeep,
  ResolvedTypographyConfig,
  TypographerInput,
  TypographerOptions,
  TypographerOutput,
  TypographerStats,
  TypographerWarning,
  TypographyConfigOverride,
  TypographyConcreteLocale,
  TypographyHyphenator,
  TypographyLocale,
} from "./types.js";

type TypographTextOptions = PartialDeep<TypographerOptions> & {
  locale?: TypographyLocale;
};

type MutableStats = TypographerStats;

interface EngineContext {
  locale: TypographyConcreteLocale;
  options: TypographerOptions;
  stats: MutableStats;
  warnings: TypographerWarning[];
  hyphenators: Partial<Record<TypographyConcreteLocale, TypographyHyphenator>>;
}

interface Segment {
  protected: boolean;
  text: string;
}

interface Range {
  end: number;
  start: number;
}

interface HtmlNode {
  childNodes?: HtmlNode[];
  nodeName: string;
  tagName?: string;
  value?: string;
}

const excludedHtmlTags = new Set([
  "script",
  "style",
  "code",
  "pre",
  "kbd",
  "samp",
  "textarea",
  "math",
  "svg",
]);

const defaultHyphenators: Partial<
  Record<TypographyConcreteLocale, TypographyHyphenator>
> = {
  "en-GB": (text, options) => hyphenEnGb.hyphenateSync(text, options),
  "en-US": (text, options) => hyphenEnUs.hyphenateSync(text, options),
  es: (text, options) => hyphenEs.hyphenateSync(text, options),
  "es-ES": (text, options) => hyphenEs.hyphenateSync(text, options),
  "es-MX": (text, options) => hyphenEs.hyphenateSync(text, options),
  "es-US": (text, options) => hyphenEs.hyphenateSync(text, options),
};

const monthNames =
  "January|February|March|April|May|June|July|August|September|October|November|December";

const spanishMonthNames =
  "enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre";

const spanishShortWords = [
  "a",
  "al",
  "de",
  "del",
  "el",
  "la",
  "lo",
  "los",
  "las",
  "un",
  "una",
  "unos",
  "unas",
  "y",
  "e",
  "o",
  "u",
  "en",
  "por",
  "con",
  "sin",
  "para",
];

export function typographText(input: TypographerInput): TypographerOutput;
export function typographText(
  text: string,
  options?: TypographTextOptions,
): TypographerOutput;
export function typographText(
  input: string | TypographerInput,
  options?: TypographTextOptions,
): TypographerOutput {
  const normalizedInput =
    typeof input === "string"
      ? normalizeStringInput(input, options)
      : normalizeObjectInput(input);
  const context = createEngineContext(normalizedInput);

  if (normalizedInput.format === "html") {
    const fragment = parseFragment(normalizedInput.text) as HtmlNode;
    processHtmlNode(fragment, context, false);
    const serialized = serialize(fragment as never);

    return finalizeOutput(
      serialized,
      normalizedInput.options.outputMode,
      context,
    );
  }

  return finalizeOutput(
    processPlainText(normalizedInput.text, context),
    normalizedInput.options.outputMode,
    context,
  );
}

export function typographPlainTextWithConfig(
  text: string,
  config: ResolvedTypographyConfig,
): string {
  if (!config.enabled) {
    return text;
  }

  const input = normalizeObjectInput({
    format: "plain",
    locale: config.locale,
    options: {
      dashes: {
        englishEmDashStyle:
          config.dashes.englishEmDashStyle === "spaced-nbsp-before"
            ? "spaced-nbsp-before"
            : "no-spaces",
      },
      hyphenation: {
        enabled: config.hyphenation.enabled,
        exceptions: config.hyphenation.exceptions,
        minWordLength: config.hyphenation.minWordLength,
        skipAllCaps: config.hyphenation.skipAllCaps,
        skipCapitalizedWords: config.hyphenation.skipCapitalizedWords,
      },
      quotes: {
        normalize: config.quotes.enabled,
        style: config.quotes.style,
        movePunctuation:
          config.quotes.punctuation === "strict-locale"
            ? "strict-locale"
            : "safe",
      },
      spaces: {
        bindInitials: config.spaces.nbsp.bindInitials,
        bindNumbersAndUnits: config.spaces.nbsp.bindNumbersAndUnits,
        bindShortWords: config.spaces.nbsp.bindShortWords,
        useNarrowNbspForThousands: config.spaces.nbsp.useNarrowNbspForThousands,
        useNbsp: config.spaces.nbsp.enabled,
      },
    },
    text,
  });
  const context = createEngineContext(input);
  context.hyphenators = {
    ...context.hyphenators,
    ...config.hyphenators,
  };

  return finalizeOutput(
    processPlainText(input.text, context),
    input.options.outputMode,
    context,
  ).text;
}

/** @deprecated Use typographPlainTextWithConfig. */
export const typographTextWithConfig = typographPlainTextWithConfig;

function normalizeStringInput(
  text: string,
  options?: TypographTextOptions,
): TypographerInput & { options: TypographerOptions } {
  const { locale = "en-US", ...engineOptions } = options ?? {};

  return {
    format: "plain",
    locale,
    options: resolveTypographerOptions(engineOptions),
    text,
  };
}

function normalizeObjectInput(
  input: TypographerInput,
): TypographerInput & { options: TypographerOptions } {
  return {
    ...input,
    options: resolveTypographerOptions(input.options),
  };
}

function createEngineContext(
  input: TypographerInput & { options: TypographerOptions },
): EngineContext {
  const locale = resolveTypographerLocale(
    input.locale,
    input.options.localeFallback,
  );

  const warnings: TypographerWarning[] = [];
  if (input.locale === "auto") {
    warnings.push({
      code: "AUTO_LOCALE_FALLBACK_USED",
      message:
        'locale "auto" resolved to localeFallback without language detection.',
      severity: "info",
    });
  }

  return {
    hyphenators: defaultHyphenators,
    locale,
    options: input.options,
    stats: createEmptyStats(),
    warnings,
  };
}

function resolveTypographerOptions(
  override?: PartialDeep<TypographerOptions>,
): TypographerOptions {
  return deepMerge(typographerDefaults, override ?? {}) as TypographerOptions;
}

function resolveTypographerLocale(
  locale: TypographyLocale,
  fallback: "en-US" | "en-GB" | "es",
): TypographyConcreteLocale {
  return locale === "auto" ? fallback : locale;
}

function createEmptyStats(): MutableStats {
  return {
    insertedNbsp: 0,
    insertedSoftHyphens: 0,
    replacedDashes: 0,
    replacedQuotes: 0,
    skippedProtectedFragments: 0,
  };
}

function processHtmlNode(
  node: HtmlNode,
  context: EngineContext,
  insideExcludedElement: boolean,
): void {
  const tagName = node.tagName?.toLowerCase();
  const isExcluded =
    insideExcludedElement ||
    (tagName !== undefined && excludedHtmlTags.has(tagName));

  if (isExcluded && !insideExcludedElement && hasTextContent(node)) {
    context.stats.skippedProtectedFragments += 1;
  }

  if (node.nodeName === "#text" && node.value !== undefined && !isExcluded) {
    node.value = processPlainText(node.value, context);
    return;
  }

  for (const child of node.childNodes ?? []) {
    processHtmlNode(child, context, isExcluded);
  }
}

function hasTextContent(node: HtmlNode): boolean {
  if (node.nodeName === "#text") {
    return (node.value ?? "").length > 0;
  }

  return (node.childNodes ?? []).some((child) => hasTextContent(child));
}

function processPlainText(text: string, context: EngineContext): string {
  const protectedText = splitProtectedSegments(text, context);

  return protectedText
    .map((segment) =>
      segment.protected
        ? segment.text
        : processTypographicSegment(segment.text, context),
    )
    .join("");
}

function processTypographicSegment(
  text: string,
  context: EngineContext,
): string {
  let result = text.normalize("NFC");
  result = normalizeWhitespace(result);
  result = applySpecialSymbols(result);
  result = applyEllipsis(result);
  result = applyQuotesAndApostrophes(result, context);
  result = applyDashesAndMinus(result, context);
  result = applyPunctuationSpacing(result, context);
  result = applyNbsp(result, context);
  result = applySoftHyphen(result, context);

  return result;
}

function splitProtectedSegments(
  text: string,
  context: EngineContext,
): readonly Segment[] {
  const ranges = collectProtectedRanges(text, context);
  if (ranges.length === 0) {
    return [{ protected: false, text }];
  }

  const segments: Segment[] = [];
  let cursor = 0;

  for (const range of ranges) {
    if (range.start > cursor) {
      segments.push({
        protected: false,
        text: text.slice(cursor, range.start),
      });
    }

    segments.push({
      protected: true,
      text: text.slice(range.start, range.end),
    });
    cursor = range.end;
  }

  if (cursor < text.length) {
    segments.push({ protected: false, text: text.slice(cursor) });
  }

  context.stats.skippedProtectedFragments += ranges.length;
  return segments;
}

function collectProtectedRanges(
  text: string,
  context: EngineContext,
): readonly Range[] {
  const ranges: Range[] = [];

  addRegexRanges(ranges, text, /`[^`\n]+`/g);
  addRegexRanges(ranges, text, /\bhttps?:\/\/[^\s<>"']+/gi);
  addRegexRanges(ranges, text, /\bwww\.[^\s<>"']+/gi);
  addRegexRanges(ranges, text, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi);
  addRegexRanges(ranges, text, /(?:^|(?<=\s))(?:~?\/|\.{1,2}\/)[^\s]+/g);
  addRegexRanges(ranges, text, /(?:^|(?<=\s))[A-Za-z]:\\[^\s]+/g);
  addRegexRanges(ranges, text, /(?<![\p{L}\p{N}_])@[A-Za-z0-9_]+/gu);
  addRegexRanges(ranges, text, /(?<![\p{L}\p{N}_])#[\p{L}\p{N}_-]+/gu);
  addRegexRanges(ranges, text, /\bv\d+(?:\.\d+){1,}(?:[-+][A-Za-z0-9]+)?\b/gi);
  if (
    !(
      isSpanishLocale(context.locale) &&
      context.options.numbers.normalizeSpanishThousands
    )
  ) {
    addRegexRanges(ranges, text, /\b\d+(?:\.\d+){2,}(?:[-+][A-Za-z0-9]+)?\b/gi);
  }
  addRegexRanges(ranges, text, /\b[A-Z]{2,}-\d+\b/g);
  addRegexRanges(ranges, text, /\b[\p{L}\p{N}]+_[\p{L}\p{N}_]+\b/gu);
  addRegexRanges(ranges, text, /\b\p{Ll}+\p{Lu}[\p{L}\p{N}]*\b/gu);
  addRegexRanges(ranges, text, /\b[A-Za-z]+\d+[A-Za-z0-9]*\b/g);

  return ranges.sort((left, right) => left.start - right.start);
}

function addRegexRanges(ranges: Range[], text: string, pattern: RegExp): void {
  for (const match of text.matchAll(pattern)) {
    if (match[0].length === 0) {
      continue;
    }

    const leadingWhitespace = /^\s/u.exec(match[0])?.[0].length ?? 0;
    const range = {
      end: match.index + match[0].length,
      start: match.index + leadingWhitespace,
    };

    if (range.start >= range.end || overlapsAnyRange(ranges, range)) {
      continue;
    }

    ranges.push(range);
  }
}

function overlapsAnyRange(ranges: readonly Range[], range: Range): boolean {
  return ranges.some(
    (existing) => range.start < existing.end && range.end > existing.start,
  );
}

function normalizeWhitespace(text: string): string {
  return text.replace(/[ \t]{2,}/g, " ");
}

function applySpecialSymbols(text: string): string {
  return text
    .replace(/\((c)\)/gi, "©")
    .replace(/\((r)\)/gi, "®")
    .replace(/\bTM\b/g, "™")
    .replace(/(\d)\s*\+-\s*(\d)/g, "$1 ± $2")
    .replace(/(\d)\s+x\s+(\d)/gi, "$1 × $2");
}

function applyEllipsis(text: string): string {
  return text
    .replace(/\s*\.{3,}/g, "…")
    .replace(/…\.+/g, "…")
    .replace(/…\s*(?=\p{L}|\p{N})/gu, "… ");
}

function applyQuotesAndApostrophes(
  text: string,
  context: EngineContext,
): string {
  if (!context.options.quotes.normalize) {
    return text;
  }

  let result = applyPrimeMarks(text, context);
  result = applySiglaApostropheRules(result, context);
  result = applyApostrophes(result, context);

  return applyQuotePairs(result, context);
}

function applyPrimeMarks(text: string, context: EngineContext): string {
  return replaceWithStats(
    text,
    /(\d)'[ \u00A0]*(\d+)"/g,
    (_match, feet: string, inches: string) => `${feet}′\u00A0${inches}″`,
    (count) => {
      context.stats.replacedQuotes += count * 2;
      context.stats.insertedNbsp += count;
    },
  )
    .replace(/(\d)'/g, (_match, number: string) => {
      context.stats.replacedQuotes += 1;
      return `${number}′`;
    })
    .replace(/(\d)"/g, (_match, number: string) => {
      context.stats.replacedQuotes += 1;
      return `${number}″`;
    });
}

function applySiglaApostropheRules(
  text: string,
  context: EngineContext,
): string {
  if (!isSpanishLocale(context.locale)) {
    return text;
  }

  return text.replace(/\b([A-ZÁÉÍÓÚÜÑ]{2,})'s\b/g, (match, sigla: string) => {
    if (context.options.spanish.correctSiglaApostrophePlural) {
      context.stats.replacedQuotes += 1;
      return sigla;
    }

    addWarning(context, {
      code: "AMBIGUOUS_PRIME_MARKS",
      fragment: match,
      message:
        "Spanish siglas do not form plurals with apostrophe-s; autocorrection is disabled.",
    });
    return match;
  });
}

function applyApostrophes(text: string, context: EngineContext): string {
  return text
    .replace(
      /(\p{L})'(\p{L})/gu,
      (
        match,
        before: string,
        after: string,
        offset: number,
        source: string,
      ) => {
        const tokenBeforeQuote =
          /[A-ZÁÉÍÓÚÜÑ]+$/u.exec(source.slice(0, offset + 1))?.[0] ?? "";
        if (
          isSpanishLocale(context.locale) &&
          /^[sS]$/u.test(after) &&
          /^[A-ZÁÉÍÓÚÜÑ]{2,}$/u.test(tokenBeforeQuote)
        ) {
          return match;
        }

        context.stats.replacedQuotes += 1;
        return `${before}’${after}`;
      },
    )
    .replace(
      /(^|[^\p{L}\p{N}])'(\d{2}s?)\b/gu,
      (_match, prefix: string, decade: string) => {
        context.stats.replacedQuotes += 1;
        return `${prefix}’${decade}`;
      },
    )
    .replace(/(^|\s)'n'(?=\s|$)/gu, (_match, prefix: string) => {
      context.stats.replacedQuotes += 1;
      return `${prefix}’n’`;
    })
    .replace(/(^|\s)'tis\b/giu, (_match, prefix: string) => {
      context.stats.replacedQuotes += 1;
      return `${prefix}’tis`;
    });
}

function applyQuotePairs(text: string, context: EngineContext): string {
  const quoteMarkerCount = countStraightQuoteMarkers(text);
  if (quoteMarkerCount % 2 !== 0) {
    addWarning(context, {
      code: "UNBALANCED_QUOTES",
      fragment: text,
      message:
        "Straight quote markers are unbalanced; quote normalization skipped.",
    });
    return text;
  }

  const stack: string[] = [];
  let result = "";

  for (const char of text) {
    if (char !== '"' && char !== "'") {
      result += char;
      continue;
    }

    if (stack.at(-1) === char) {
      const level = stack.length - 1;
      stack.pop();
      result += getQuoteMarks(context, level)[1];
      context.stats.replacedQuotes += 1;
      continue;
    }

    const level = stack.length;
    stack.push(char);
    result += getQuoteMarks(context, level)[0];
    context.stats.replacedQuotes += 1;
  }

  if (stack.length > 0) {
    addWarning(context, {
      code: "UNBALANCED_QUOTES",
      fragment: text,
      message:
        "Straight quote markers are unbalanced; quote normalization skipped.",
    });
    return text;
  }

  return result;
}

function countStraightQuoteMarkers(text: string): number {
  return text.match(/["']/g)?.length ?? 0;
}

function getQuoteMarks(
  context: EngineContext,
  level: number,
): readonly [string, string] {
  const style =
    context.options.quotes.style === "locale-default"
      ? getLocaleDefaultQuoteStyle(context.locale)
      : context.options.quotes.style;

  if (style === "spanish-guillemets") {
    const spanishQuoteLevels: readonly (readonly [string, string])[] = [
      ["«", "»"],
      ["“", "”"],
      ["‘", "’"],
    ];
    return spanishQuoteLevels[level % 3] ?? ["«", "»"];
  }

  if (style === "british-single") {
    return level % 2 === 0 ? ["‘", "’"] : ["“", "”"];
  }

  return level % 2 === 0 ? ["“", "”"] : ["‘", "’"];
}

function getLocaleDefaultQuoteStyle(
  locale: TypographyConcreteLocale,
): "american-double" | "british-single" | "spanish-guillemets" {
  if (locale === "en-GB") {
    return "british-single";
  }

  if (isSpanishLocale(locale)) {
    return "spanish-guillemets";
  }

  return "american-double";
}

function applyDashesAndMinus(text: string, context: EngineContext): string {
  if (!context.options.dashes.normalizeHyphenMinus) {
    return text;
  }

  let result = text;

  if (isSpanishLocale(context.locale)) {
    result = replaceWithStats(
      result,
      /(\d)\s*–\s*(\d)/g,
      (_match, start: string, end: string) => `${start}-${end}`,
      (count) => {
        if (context.options.dashes.normalizeSpanishEnDashToHyphenInRanges) {
          context.stats.replacedDashes += count;
        }
      },
    );
    result = result.replace(/\s+—\s+/g, " —");
    result = result.replace(/^—\s+/gm, () => {
      context.stats.replacedDashes += 1;
      return "—";
    });
    result = result.replace(/—\s+(?=\S)/g, (match, offset: number) => {
      const previous = result.at(offset - 1);
      if (previous === undefined || previous === "\n") {
        context.stats.replacedDashes += 1;
        return "—";
      }

      return match;
    });
    result = replaceWithStats(
      result,
      /(\s)-(?=\S)|(?<=\S)-(\s)/g,
      (match) => (match.startsWith(" ") ? " —" : "— "),
      (count) => {
        context.stats.replacedDashes += count;
      },
    );

    return result;
  }

  result = replaceWithStats(
    result,
    /(\b\d{1,4})-(\d{1,4}\b)|(\b[A-Z])-(?=[A-Z]\b)/g,
    (match, start: string | undefined, end: string | undefined) =>
      start !== undefined && end !== undefined
        ? `${start}–${end}`
        : match.replace("-", "–"),
    (count) => {
      context.stats.replacedDashes += count;
    },
  );
  result = replaceWithStats(
    result,
    /\s*---\s*|\s*--\s*/g,
    () =>
      context.options.dashes.englishEmDashStyle === "spaced-nbsp-before"
        ? "\u00A0— "
        : "—",
    (count) => {
      context.stats.replacedDashes += count;
      if (context.options.dashes.englishEmDashStyle === "spaced-nbsp-before") {
        context.stats.insertedNbsp += count;
      }
    },
  );
  result = replaceWithStats(
    result,
    /(^|[\s(=])-(?=\d)|(\d)\s+-\s+(\d)/g,
    (
      match,
      prefix: string | undefined,
      left: string | undefined,
      right: string | undefined,
    ) =>
      left !== undefined && right !== undefined
        ? `${left} − ${right}`
        : `${prefix ?? ""}−`,
    (count) => {
      context.stats.replacedDashes += count;
    },
  );

  return result;
}

function applyPunctuationSpacing(text: string, context: EngineContext): string {
  let result = text;

  if (isSpanishLocale(context.locale)) {
    result = normalizeSpanishPunctuation(result, context);
  }

  result = result.replace(/\s+([.,:;?!])/g, "$1");
  result = result.replace(/([.,:;?!])([ \t]+)([”»’)\]])/g, "$1$3");
  result = ensureSpaceAfterPunctuation(result);
  result = result.replace(/([.!?])\s+([”»’])/g, "$1$2");

  return result;
}

function normalizeSpanishPunctuation(
  text: string,
  context: EngineContext,
): string {
  let result = text.replace(/¿\s+/g, "¿").replace(/¡\s+/g, "¡");

  result = result.replace(/([?!])\s+/g, "$1 ");
  result = result.replace(/([?!])\s*([»”’])/g, "$1$2");

  if (context.options.spanish.insertOpeningPunctuation !== "never") {
    result = result.replace(
      /(^|[.!?]\s+)([^¿¡.!?,][^.!?]*\?)/gu,
      (match, prefix: string, question: string) => {
        if (question.includes(",")) {
          return match;
        }
        return `${prefix}¿${question}`;
      },
    );
    result = result.replace(
      /(^|[.!?]\s+)([^¿¡.!?,][^.!?]*!)/gu,
      (match, prefix: string, exclamation: string) => {
        if (exclamation.includes(",")) {
          return match;
        }
        return `${prefix}¡${exclamation}`;
      },
    );
  }

  if (/(?<!¿)[\p{L}][^.!?¿¡]*\?/u.test(result)) {
    addWarning(context, {
      code: "ES_MISSING_OPENING_QUESTION_MARK",
      fragment: result,
      message:
        "Spanish question has no opening mark, and the start is ambiguous.",
    });
  }

  if (/(?<!¡)[\p{L}][^.!?¿¡]*!/u.test(result)) {
    addWarning(context, {
      code: "ES_MISSING_OPENING_EXCLAMATION_MARK",
      fragment: result,
      message:
        "Spanish exclamation has no opening mark, and the start is ambiguous.",
    });
  }

  if (context.options.quotes.movePunctuation === "strict-locale") {
    result = result.replace(/«([^»]+)\.»/g, "«$1».");
  }

  return result;
}

function ensureSpaceAfterPunctuation(text: string): string {
  let result = "";

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    const previous = text[index - 1];

    if (char === undefined) {
      continue;
    }

    result += char;

    if (
      next === undefined ||
      !".,:;?!".includes(char) ||
      /\s/u.test(next) ||
      "”»’)]}".includes(next) ||
      "¿¡".includes(char)
    ) {
      continue;
    }

    if (
      (char === "." || char === "," || char === ":") &&
      isDigit(previous) &&
      isDigit(next)
    ) {
      continue;
    }

    if (char === "." && previous !== undefined && /[A-Z]/u.test(previous)) {
      continue;
    }

    if (/[\p{L}\p{N}]/u.test(next)) {
      result += " ";
    }
  }

  return result;
}

function applyNbsp(text: string, context: EngineContext): string {
  if (!context.options.spaces.useNbsp) {
    return text;
  }

  return isSpanishLocale(context.locale)
    ? applySpanishNbsp(text, context)
    : applyEnglishNbsp(text, context);
}

function applyEnglishNbsp(text: string, context: EngineContext): string {
  let result = text;

  if (context.options.spaces.bindNumbersAndUnits) {
    result = replaceNbsp(
      result,
      /(\d)\s+(°[CF]|kg|g|mg|m|cm|mm|km|l|ml)\b/gi,
      context,
    );
    result = replaceNbsp(result, /(\d)\s+(USD|EUR|GBP)\b/g, context);
    result = replaceNbsp(result, /(\d{1,2}:\d{2})\s+(AM|PM)\b/gi, context);

    if (context.options.numbers.englishPercentStyle === "si-space") {
      result = replaceNbsp(result, /(\d)\s*%/g, context, "$1\u00A0%");
    } else {
      result = result.replace(/(\d)\s+%/g, "$1%");
    }
  }

  if (context.options.spaces.bindInitials) {
    result = replaceNbsp(result, /\b([A-Z]\.)\s+(?=[A-Z]\.)/g, context);
    result = replaceNbsp(result, /\b([A-Z]\.)\s+(?=[A-Z][a-z])/g, context);
  }

  result = replaceNbsp(
    result,
    /\b(Dr\.|Mr\.|Mrs\.|Ms\.|Prof\.|Fig\.|No\.|p\.|Sec\.)\s+(?=\p{L}|\d)/gu,
    context,
  );
  result = replaceNbsp(
    result,
    new RegExp(`\\b(${monthNames})\\s+(\\d)`, "g"),
    context,
  );
  result = replaceNbsp(
    result,
    /(\d)\s+(January|February|March|April|May|June|July|August|September|October|November|December)\b/g,
    context,
  );
  result = replaceNbsp(result, /,\s+(\d{4})\b/g, context, ",\u00A0$1");

  if (context.options.spaces.bindShortWords) {
    result = replaceNbsp(result, /\b([aAI])\s+(?=\p{L})/gu, context);
  }

  return result;
}

function applySpanishNbsp(text: string, context: EngineContext): string {
  let result = text;

  if (context.options.numbers.normalizeSpanishThousands) {
    result = result.replace(/\b\d{1,3}(?:[.,]\d{3}){1,}\b/g, (match) => {
      const replacement = match.replace(/[.,]/g, "\u202F");
      context.stats.insertedNbsp += countOccurrences(replacement, "\u202F");
      return replacement;
    });
  }

  if (context.options.spaces.bindNumbersAndUnits) {
    result = replaceNbsp(
      result,
      /(\d)\s*(%|€|kg|g|mg|m|cm|mm|km|l|ml|h)(?=\b|$|\s|[.,;:!?])/gi,
      context,
      "$1\u00A0$2",
    );
    result = replaceNbsp(result, /(\d)\s+(EUR|USD|GBP)\b/g, context);
    result = replaceNbsp(result, /\b(USD|EUR|GBP)\s+(\d)/g, context);
  }

  result = replaceNbsp(
    result,
    /\b(Sr\.|Sra\.|Dr\.|Dra\.|Prof\.|pág\.|art\.|n\.º)\s+(?=\p{L}|\d)/gu,
    context,
  );
  result = replaceNbsp(result, /(\d{1,2}:\d{2})\s+h\b/g, context, "$1\u00A0h");
  result = replaceNbsp(
    result,
    new RegExp(`\\b(${spanishMonthNames})\\s+de\\s+(\\d{4})`, "giu"),
    context,
    "$1\u00A0de\u00A0$2",
  );

  if (context.options.spaces.bindShortWords) {
    const shortWords = spanishShortWords.join("|");
    result = replaceNbsp(
      result,
      new RegExp(`\\b(${shortWords})\\s+(?=\\p{L})`, "giu"),
      context,
    );
  }

  return result;
}

function replaceNbsp(
  text: string,
  pattern: RegExp,
  context: EngineContext,
  replacement?: string,
): string {
  return text.replace(pattern, (...args: unknown[]) => {
    const groups = args.slice(1, -2) as string[];
    const firstGroup = groups[0] ?? "";
    const secondGroup = groups[1];
    const replaced =
      replacement === undefined
        ? secondGroup === undefined
          ? `${firstGroup}\u00A0`
          : `${firstGroup}\u00A0${secondGroup}`
        : interpolateReplacement(replacement, groups);

    context.stats.insertedNbsp += countOccurrences(replaced, "\u00A0");
    context.stats.insertedNbsp += countOccurrences(replaced, "\u202F");

    return replacement === undefined ? replaced : replaced;
  });
}

function interpolateReplacement(
  replacement: string,
  groups: readonly string[],
): string {
  return replacement.replace(/\$(\d+)/g, (_match, index: string) => {
    return groups[Number(index) - 1] ?? "";
  });
}

function applySoftHyphen(text: string, context: EngineContext): string {
  if (!context.options.hyphenation.enabled) {
    return text;
  }

  const hyphenator = context.hyphenators[context.locale];
  if (hyphenator === undefined) {
    return text;
  }

  return text.replace(/\p{L}[\p{L}\u00AD-]*\p{L}/gu, (word) => {
    if (!shouldHyphenateWord(word, context)) {
      return word;
    }

    let source = word;
    if (source.includes("\u00AD")) {
      if (!context.options.hyphenation.remapExistingSoftHyphens) {
        return word;
      }

      addWarning(context, {
        code: "EXISTING_SOFT_HYPHENS_REMAPPED",
        fragment: word,
        message: "Existing soft hyphens were removed and regenerated.",
      });
      source = source.replaceAll("\u00AD", "");
    }

    const hyphenated = hyphenator(source, {
      exceptions: context.options.hyphenation.exceptions[context.locale] ?? [],
      hyphenChar: "\u00AD",
      locale: context.locale,
      minWordLength: context.options.hyphenation.minWordLength,
    });

    context.stats.insertedSoftHyphens += Math.max(
      0,
      countOccurrences(hyphenated, "\u00AD") - countOccurrences(word, "\u00AD"),
    );

    return hyphenated;
  });
}

function shouldHyphenateWord(word: string, context: EngineContext): boolean {
  const plainWord = word.replaceAll("\u00AD", "");

  if (plainWord.length < context.options.hyphenation.minWordLength) {
    return false;
  }

  if (
    context.options.hyphenation.skipAllCaps &&
    /^[\p{Lu}\d-]+$/u.test(plainWord)
  ) {
    return false;
  }

  if (
    context.options.hyphenation.skipCapitalizedWords &&
    /^\p{Lu}\p{Ll}/u.test(plainWord)
  ) {
    return false;
  }

  if (/\d|_|\/|’|'|\u00A0|\u202F|\u2060/u.test(plainWord)) {
    return false;
  }

  if (
    plainWord.includes("-") &&
    !context.options.hyphenation.hyphenateCompoundWords
  ) {
    return false;
  }

  if (/\p{Ll}\p{Lu}/u.test(plainWord)) {
    return false;
  }

  return true;
}

function finalizeOutput(
  text: string,
  outputMode: "unicode" | "html-entities",
  context: EngineContext,
): TypographerOutput {
  return {
    stats: context.stats,
    text:
      outputMode === "html-entities"
        ? serializeTypographicEntities(text)
        : deserializeTypographicEntities(text),
    warnings: context.warnings,
  };
}

function serializeTypographicEntities(text: string): string {
  return text
    .replaceAll("\u00A0", "&nbsp;")
    .replaceAll("\u202F", "&#8239;")
    .replaceAll("\u00AD", "&shy;")
    .replaceAll("—", "&mdash;")
    .replaceAll("–", "&ndash;")
    .replaceAll("…", "&hellip;")
    .replaceAll("“", "&ldquo;")
    .replaceAll("”", "&rdquo;")
    .replaceAll("‘", "&lsquo;")
    .replaceAll("’", "&rsquo;")
    .replaceAll("«", "&laquo;")
    .replaceAll("»", "&raquo;")
    .replaceAll("−", "&minus;")
    .replaceAll("×", "&times;")
    .replaceAll("±", "&plusmn;")
    .replaceAll("©", "&copy;")
    .replaceAll("®", "&reg;")
    .replaceAll("™", "&trade;");
}

function deserializeTypographicEntities(text: string): string {
  return text
    .replaceAll("&nbsp;", "\u00A0")
    .replaceAll("&#8239;", "\u202F")
    .replaceAll("&shy;", "\u00AD")
    .replaceAll("&mdash;", "—")
    .replaceAll("&ndash;", "–")
    .replaceAll("&hellip;", "…");
}

function addWarning(
  context: EngineContext,
  warning: Omit<TypographerWarning, "severity">,
): void {
  if (
    context.warnings.some(
      (existing) =>
        existing.code === warning.code &&
        existing.fragment === warning.fragment,
    )
  ) {
    return;
  }

  context.warnings.push({
    ...warning,
    severity: "warning",
  });
}

function replaceWithStats(
  text: string,
  pattern: RegExp,
  replacement: (...args: string[]) => string,
  record: (count: number) => void,
): string {
  let count = 0;
  const result = text.replace(pattern, (...args: string[]) => {
    count += 1;
    return replacement(...args);
  });

  if (count > 0) {
    record(count);
  }

  return result;
}

function countOccurrences(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

function isDigit(value: string | undefined): boolean {
  return value !== undefined && /\d/u.test(value);
}

function isSpanishLocale(locale: TypographyConcreteLocale): boolean {
  return locale === "es" || locale.startsWith("es-");
}

function deepMerge(base: unknown, override: unknown): unknown {
  if (override === undefined) {
    return cloneValue(base);
  }

  if (Array.isArray(base) || Array.isArray(override)) {
    return cloneValue(override);
  }

  if (isPlainObject(base) && isPlainObject(override)) {
    const result: Record<string, unknown> = { ...base };
    for (const [key, value] of Object.entries(override)) {
      result[key] = deepMerge(result[key], value);
    }
    return result;
  }

  if (isPlainObject(override)) {
    return deepMerge({}, override);
  }

  return override;
}

function cloneValue(value: unknown): unknown {
  if (isReadonlyArray(value)) {
    return [...value];
  }

  if (isPlainObject(value)) {
    return deepMerge({}, value);
  }

  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}

function isReadonlyArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

export function legacyTypographText(
  text: string,
  config?: TypographyConfigOverride,
): string {
  return typographPlainTextWithConfig(text, resolveTypographyConfig(config));
}
