import { defaultOperationOrder } from "./defaults.js";
import { resolveTypographyConfig } from "./config.js";
import type {
  ResolvedTypographyConfig,
  TypographyConfigOverride,
  TypographyConcreteLocale,
  TypographyOperationId,
} from "./types.js";

export function typographText(
  text: string,
  config?: TypographyConfigOverride,
): string {
  return typographTextWithConfig(text, resolveTypographyConfig(config));
}

export function typographTextWithConfig(
  text: string,
  config: ResolvedTypographyConfig,
): string {
  if (!config.enabled || text.length === 0) {
    return text;
  }

  let result = text;

  for (const operation of resolveOperationOrder(config)) {
    if (!config.operations[operation]) {
      continue;
    }

    result = applyOperation(result, operation, config);
  }

  return result;
}

function resolveOperationOrder(
  config: ResolvedTypographyConfig,
): readonly TypographyOperationId[] {
  const configuredOrder = config.operations.order ?? defaultOperationOrder;
  const result: TypographyOperationId[] = [];
  const seen = new Set<TypographyOperationId>();

  for (const operation of configuredOrder) {
    if (operation === "softHyphen" || seen.has(operation)) {
      continue;
    }

    result.push(operation);
    seen.add(operation);
  }

  for (const operation of defaultOperationOrder) {
    if (operation === "softHyphen" || seen.has(operation)) {
      continue;
    }

    result.push(operation);
    seen.add(operation);
  }

  result.push("softHyphen");
  return result;
}

function applyOperation(
  text: string,
  operation: TypographyOperationId,
  config: ResolvedTypographyConfig,
): string {
  switch (operation) {
    case "normalizeUnicode":
      return text.normalize("NFC");
    case "symbols":
      return text;
    case "ellipsis":
      return text.replaceAll("...", "…");
    case "quotes":
      return applyQuotes(text, config);
    case "apostrophes":
      return text.replace(/(\p{L})'(\p{L})/gu, "$1’$2");
    case "primeMarks":
      return text;
    case "dashes":
      return applyDashes(text, config);
    case "minus":
      return applyMinus(text, config);
    case "punctuationSpacing":
      return applyPunctuationSpacing(text, config);
    case "whitespace":
      return config.spaces.normalizeWhitespace
        ? text.replace(/[ \t]{2,}/g, " ")
        : text;
    case "nbsp":
      return applyNbsp(text, config);
    case "softHyphen":
      return applySoftHyphen(text, config);
  }
}

function applyQuotes(text: string, config: ResolvedTypographyConfig): string {
  if (!config.quotes.enabled) {
    return text;
  }

  const quoteCount = (text.match(/"/g) ?? []).length;
  if (quoteCount % 2 !== 0 && config.quotes.unbalanced !== "best-effort") {
    return text;
  }

  const [opening, closing] = getOuterQuoteMarks(config);
  let isOpening = true;

  return text.replaceAll('"', () => {
    const replacement = isOpening ? opening : closing;
    isOpening = !isOpening;
    return replacement;
  });
}

function getOuterQuoteMarks(
  config: ResolvedTypographyConfig,
): readonly [string, string] {
  const style =
    config.quotes.style === "locale-default"
      ? getLocaleDefaultQuoteStyle(config.locale)
      : config.quotes.style;

  switch (style) {
    case "american-double":
      return ["“", "”"];
    case "british-single":
      return ["‘", "’"];
    case "spanish-guillemets":
      return ["«", "»"];
  }
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

function applyDashes(text: string, config: ResolvedTypographyConfig): string {
  if (!config.dashes.enabled) {
    return text;
  }

  let result = text;

  if (isSpanishLocale(config.locale)) {
    if (config.dashes.spanishRanges === "en-dash") {
      result = result.replace(/(\d)\s*-\s*(\d)/g, "$1–$2");
    } else if (config.dashes.spanishRanges === "hyphen") {
      result = result.replace(/(\d)\s*-\s*(\d)/g, "$1-$2");
    }

    if (config.dashes.spanishRaya) {
      result = result.replace(/\s*--\s*/g, "—");
    }

    return result;
  }

  if (config.dashes.englishRanges === "en-dash") {
    result = result.replace(/(\d)\s*-\s*(\d)/g, "$1–$2");
  }

  switch (config.dashes.englishEmDashStyle) {
    case "no-spaces":
      return result.replace(/\s*--\s*/g, "—");
    case "spaced":
      return result.replace(/\s*--\s*/g, " — ");
    case "spaced-nbsp-before":
      return result.replace(/\s*--\s*/g, "\u00A0— ");
  }
}

function applyMinus(text: string, config: ResolvedTypographyConfig): string {
  if (!config.dashes.minusSign) {
    return text;
  }

  return text.replace(/(^|[\s([{])-(\d)/g, "$1−$2");
}

function applyPunctuationSpacing(
  text: string,
  config: ResolvedTypographyConfig,
): string {
  if (!config.spaces.punctuationSpacing.enabled) {
    return text;
  }

  let result = text;

  if (config.spaces.punctuationSpacing.removeSpaceBeforePunctuation) {
    result = result.replace(/\s+([?!.,:;])/g, "$1");
  }

  if (isSpanishLocale(config.locale)) {
    result = normalizeExistingSpanishInvertedPunctuation(result, config);
  }

  if (config.spaces.punctuationSpacing.ensureSpaceAfterPunctuation) {
    result = result.replace(/([,;:?!])(?=\S)/g, "$1 ");
  }

  return result;
}

function normalizeExistingSpanishInvertedPunctuation(
  text: string,
  config: ResolvedTypographyConfig,
): string {
  let result = text;

  if (config.spanish?.invertedQuestionMarks === "normalize-existing") {
    result = result.replace(/¿\s+/g, "¿");
  }

  if (config.spanish?.invertedExclamationMarks === "normalize-existing") {
    result = result.replace(/¡\s+/g, "¡");
  }

  return result;
}

function applyNbsp(text: string, config: ResolvedTypographyConfig): string {
  if (!config.spaces.nbsp.enabled) {
    return text;
  }

  let result = text;

  if (config.spaces.nbsp.bindCurrency) {
    result = result.replace(/(\d)\s*([€£¥])/g, "$1\u00A0$2");
  }

  if (
    isSpanishLocale(config.locale) &&
    config.spaces.nbsp.useNarrowNbspForThousands
  ) {
    result = result.replace(/\b(\d{1,3})[ ](?=\d{3}\b)/g, "$1\u202F");
  }

  return result;
}

function applySoftHyphen(
  text: string,
  config: ResolvedTypographyConfig,
): string {
  if (!config.hyphenation.enabled) {
    return text;
  }

  const hyphenator = config.hyphenators?.[config.locale];
  if (hyphenator === undefined) {
    return text;
  }

  const result = hyphenator(text, {
    exceptions: config.hyphenation.exceptions[config.locale] ?? [],
    hyphenChar: config.hyphenation.hyphenChar,
    locale: config.locale,
    minWordLength: config.hyphenation.minWordLength,
  });

  return typeof result === "string" ? result : text;
}

function isSpanishLocale(locale: TypographyConcreteLocale): boolean {
  return locale === "es" || locale.startsWith("es-");
}
