import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

export type TypographyConcreteLocale =
  | "en-US"
  | "en-GB"
  | "es"
  | "es-ES"
  | "es-MX"
  | "es-US";

export type TypographyLocale = TypographyConcreteLocale | "auto";

export type TypographerInputFormat = "plain" | "html";

export type TypographerOutputMode = "unicode" | "html-entities";

export type TypographyPreset =
  | "minimal"
  | "ui"
  | "heading"
  | "label"
  | "navigation"
  | "card"
  | "richText"
  | "strict";

export type TypographyOperationId =
  | "normalizeUnicode"
  | "symbols"
  | "ellipsis"
  | "quotes"
  | "apostrophes"
  | "primeMarks"
  | "dashes"
  | "minus"
  | "punctuationSpacing"
  | "whitespace"
  | "nbsp"
  | "softHyphen";

export type TypographyOperationOverrides = Partial<
  Record<TypographyOperationId, boolean>
>;

export type TypographyRulesConfig = {
  order?: readonly TypographyOperationId[];
  normalizeUnicode: boolean;
  symbols: boolean;
  ellipsis: boolean;
  quotes: boolean;
  apostrophes: boolean;
  primeMarks: boolean;
  dashes: boolean;
  minus: boolean;
  punctuationSpacing: boolean;
  whitespace: boolean;
  nbsp: boolean;
  softHyphen: boolean;
};

export type QuoteStyle =
  | "locale-default"
  | "american-double"
  | "british-single"
  | "spanish-guillemets";

export type QuotePunctuationMode = "preserve" | "safe" | "strict-locale";

export type TypographyQuotesConfig = {
  enabled: boolean;
  style: QuoteStyle;
  punctuation: QuotePunctuationMode;
  unbalanced: "preserve" | "best-effort" | "diagnostic";
};

export type TypographyDashesConfig = {
  enabled: boolean;
  englishEmDashStyle: "no-spaces" | "spaced" | "spaced-nbsp-before";
  englishRanges: "en-dash" | "preserve";
  spanishRaya: boolean;
  spanishRanges: "hyphen" | "preserve" | "en-dash";
  minusSign: boolean;
};

export type TypographySpacesConfig = {
  normalizeWhitespace: boolean;
  nbsp: {
    enabled: boolean;
    bindShortWords: boolean;
    bindInitials: boolean;
    bindTitles: boolean;
    bindNumbersAndUnits: boolean;
    bindDates: boolean;
    bindTimes: boolean;
    bindCurrency: boolean;
    useNarrowNbspForThousands: boolean;
  };
  punctuationSpacing: {
    enabled: boolean;
    removeSpaceBeforePunctuation: boolean;
    ensureSpaceAfterPunctuation: boolean;
  };
};

export type SpanishPunctuationConfig = {
  invertedQuestionMarks:
    | "preserve"
    | "normalize-existing"
    | "safe-insert"
    | "diagnostic-only";
  invertedExclamationMarks:
    | "preserve"
    | "normalize-existing"
    | "safe-insert"
    | "diagnostic-only";
  quoteFinalPeriod: "preserve" | "safe" | "strict";
};

export type TypographyHyphenationConfig = {
  enabled: boolean;
  hyphenChar: "\u00AD";
  minWordLength: number;
  exceptions: Partial<Record<TypographyConcreteLocale, readonly string[]>>;
  skipAllCaps: boolean;
  skipCapitalizedWords: boolean;
  skipMixedAlphanumeric: boolean;
  skipWordsWithDigits: boolean;
  skipUrls: boolean;
  skipEmails: boolean;
  skipHashtags: boolean;
  skipMentions: boolean;
  compoundWords: "skip" | "hyphenate-parts" | "hyphenate-whole-token";
};

export type TypographyHyphenator = (
  text: string,
  options: {
    locale: TypographyConcreteLocale;
    hyphenChar: "\u00AD";
    minWordLength: number;
    exceptions: readonly string[];
  },
) => string;

export type TypographyHyphenatorRegistry = Partial<
  Record<TypographyConcreteLocale, TypographyHyphenator>
>;

export type TypographyExcludedTag =
  | "code"
  | "pre"
  | "kbd"
  | "samp"
  | "textarea"
  | "script"
  | "style"
  | "math"
  | "svg"
  | (string & {});

export type TypographySkipPredicate = (input: {
  elementType: ElementType;
  props: Record<string, unknown>;
  depth: number;
  locale: TypographyConcreteLocale;
}) => boolean;

export type TypographyExclusionConfig = {
  tags: readonly TypographyExcludedTag[];
  components: readonly ElementType[];
  componentNames: readonly string[];
  dataAttribute: {
    name: "data-typography";
    skipValues: readonly ["skip", "off", "false"];
  };
  shouldSkipElement?: TypographySkipPredicate;
};

export type TypographyTraversalConfig = {
  customComponents: "process-children" | "preserve";
  fragments: "process" | "preserve";
  portals: "skip" | "process";
  textSegmentation: "node" | "adjacent-text-run";
  processNumbers: boolean;
  maxDepth: number | null;
};

export type TypographyConfig = {
  enabled: boolean;
  locale: TypographyLocale;
  fallbackLocale: TypographyConcreteLocale;
  preset: TypographyPreset;
  operations: TypographyRulesConfig;
  quotes: TypographyQuotesConfig;
  dashes: TypographyDashesConfig;
  spaces: TypographySpacesConfig;
  spanish?: SpanishPunctuationConfig;
  hyphenation: TypographyHyphenationConfig;
  exclusions: TypographyExclusionConfig;
  traversal: TypographyTraversalConfig;
  hyphenators?: TypographyHyphenatorRegistry;
};

export type ResolvedTypographyConfig = TypographyConfig & {
  locale: TypographyConcreteLocale;
};

export type ListOverride<T> = {
  add?: readonly T[];
  remove?: readonly T[];
  replace?: readonly T[];
};

type PartialDeepValue<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly unknown[]
    ? T
    : T extends object
      ? PartialDeep<T>
      : T;

export type PartialDeep<T> = {
  [K in keyof T]?: PartialDeepValue<T[K]>;
};

export type TypographyHyphenationOverride =
  PartialDeep<TypographyHyphenationConfig>;

export type TypographyExclusionOverride = Omit<
  PartialDeep<TypographyExclusionConfig>,
  "tags" | "components" | "componentNames"
> & {
  tags?: readonly TypographyExcludedTag[] | ListOverride<TypographyExcludedTag>;
  components?: readonly ElementType[] | ListOverride<ElementType>;
  componentNames?: readonly string[] | ListOverride<string>;
};

export type TypographyTraversalOverride =
  PartialDeep<TypographyTraversalConfig>;

export type TypographyConfigOverride = Omit<
  PartialDeep<TypographyConfig>,
  "operations" | "hyphenation" | "exclusions" | "traversal"
> & {
  operations?: Partial<TypographyRulesConfig>;
  hyphenation?: TypographyHyphenationOverride;
  exclusions?: TypographyExclusionOverride;
  traversal?: TypographyTraversalOverride;
};

export type TypographyDiagnosticSeverity = "info" | "warning" | "error";

export type TypographyDiagnosticCode =
  | "UNSUPPORTED_LOCALE"
  | "AUTO_LOCALE_FALLBACK_USED"
  | "INVALID_OPERATION_ORDER"
  | "SOFT_HYPHEN_NOT_LAST"
  | "MISSING_HYPHENATOR"
  | "ASYNC_HYPHENATION_NOT_ALLOWED"
  | "UNBALANCED_QUOTES"
  | "SPANISH_MISSING_OPENING_QUESTION_MARK"
  | "SPANISH_MISSING_OPENING_EXCLAMATION_MARK"
  | "UNSUPPORTED_PROP_WITH_FRAGMENT"
  | "DANGEROUSLY_SET_INNER_HTML_NOT_SUPPORTED"
  | "NON_SERIALIZABLE_RSC_CONFIG"
  | "MAX_DEPTH_REACHED";

export type TypographyDiagnostic = {
  code: TypographyDiagnosticCode;
  severity: TypographyDiagnosticSeverity;
  message: string;
  path?: readonly number[];
  fragment?: string;
};

export type TypographerWarningCode =
  | "AUTO_LOCALE_FALLBACK_USED"
  | "UNBALANCED_QUOTES"
  | "ES_MISSING_OPENING_QUESTION_MARK"
  | "ES_MISSING_OPENING_EXCLAMATION_MARK"
  | "AMBIGUOUS_PRIME_MARKS"
  | "PROTECTED_FRAGMENT_SKIPPED"
  | "EXISTING_SOFT_HYPHENS_REMAPPED";

export type TypographerWarning = {
  code: TypographerWarningCode;
  severity: "info" | "warning" | "error";
  fragment?: string;
  message: string;
};

export type TypographerStats = {
  replacedQuotes: number;
  replacedDashes: number;
  insertedNbsp: number;
  insertedSoftHyphens: number;
  skippedProtectedFragments: number;
};

export type TypographerNumbersOptions = {
  spanishDecimalSeparator: "preserve" | "comma" | "dot";
  englishPercentStyle: "no-space" | "si-space";
  spanishPercentStyle: "space";
  normalizeSpanishThousands: boolean;
};

export type TypographerSpanishOptions = {
  insertOpeningPunctuation: "never" | "safe-start-only" | "strict";
  correctSiglaApostrophePlural: boolean;
};

export type TypographerOptions = {
  outputMode: TypographerOutputMode;
  localeFallback: "en-US" | "en-GB" | "es";
  quotes: {
    normalize: boolean;
    style: QuoteStyle;
    movePunctuation: "never" | "safe" | "strict-locale";
  };
  dashes: {
    normalizeHyphenMinus: boolean;
    englishEmDashStyle: "no-spaces" | "spaced-nbsp-before";
    spanishRayaChar: "\u2014" | "\u2015";
    normalizeSpanishEnDashToHyphenInRanges: boolean;
  };
  spaces: {
    useNbsp: boolean;
    useNarrowNbspForThousands: boolean;
    bindShortWords: boolean;
    bindInitials: boolean;
    bindNumbersAndUnits: boolean;
  };
  numbers: TypographerNumbersOptions;
  spanish: TypographerSpanishOptions;
  hyphenation: {
    enabled: boolean;
    minWordLength: number;
    skipHeadings: boolean;
    skipAllCaps: boolean;
    skipCapitalizedWords: boolean;
    hyphenateCompoundWords: boolean;
    remapExistingSoftHyphens: boolean;
    exceptions: Partial<Record<TypographyConcreteLocale, readonly string[]>>;
  };
};

export type TypographerInput = {
  text: string;
  format: TypographerInputFormat;
  locale: TypographyLocale;
  options?: PartialDeep<TypographerOptions>;
};

export type TypographerOutput = {
  text: string;
  warnings: TypographerWarning[];
  stats: TypographerStats;
};

export type TypographyProviderProps = {
  children?: ReactNode;
  config?: TypographyConfigOverride;
  inherit?: boolean;
};

export type TypographySkipProps = {
  children?: ReactNode;
};

export type TextWithTypographyOwnProps = {
  children?: ReactNode;
  as?: ElementType | null;
  config?: TypographyConfigOverride;
  locale?: TypographyLocale;
  preset?: TypographyPreset;
  disabled?: boolean;
  hyphenation?: boolean | TypographyHyphenationOverride;
  operations?: TypographyOperationOverrides;
  exclusions?: TypographyExclusionOverride;
  traversal?: TypographyTraversalOverride;
};

export type TextWithTypographyProps<TAs extends ElementType = "span"> =
  TextWithTypographyOwnProps &
    Omit<
      ComponentPropsWithoutRef<TAs>,
      keyof TextWithTypographyOwnProps | "children" | "dangerouslySetInnerHTML"
    >;
