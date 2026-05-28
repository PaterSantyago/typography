import { defaultOperationOrder, typographyDefaults } from "./defaults.js";
import type {
  ListOverride,
  ResolvedTypographyConfig,
  TypographyConfig,
  TypographyConfigOverride,
  TypographyConcreteLocale,
  TypographyDiagnostic,
  TypographyExcludedTag,
  TypographyExclusionConfig,
  TypographyExclusionOverride,
  TypographyOperationId,
} from "./types.js";

const concreteLocales = new Set<string>([
  "en-US",
  "en-GB",
  "es",
  "es-ES",
  "es-MX",
  "es-US",
]);

const operationIds = new Set<string>(defaultOperationOrder);

export function resolveTypographyConfig(
  ...overrides: readonly (TypographyConfigOverride | undefined)[]
): ResolvedTypographyConfig {
  let config = cloneConfig(typographyDefaults);

  for (const override of overrides) {
    if (override === undefined) {
      continue;
    }

    config = mergeTypographyConfig(config, override);
  }

  const locale = resolveLocale(config.locale, config.fallbackLocale);

  return {
    ...config,
    locale,
  };
}

export function validateTypographyConfig(
  config: TypographyConfigOverride,
): TypographyDiagnostic[] {
  const diagnostics: TypographyDiagnostic[] = [];

  const providedLocale: unknown = config.locale;

  if (providedLocale === "auto") {
    diagnostics.push({
      code: "AUTO_LOCALE_FALLBACK_USED",
      severity: "info",
      message:
        'locale "auto" resolves deterministically to fallbackLocale in this version.',
    });
  } else if (
    typeof providedLocale === "string" &&
    !isConcreteLocale(providedLocale)
  ) {
    diagnostics.push({
      code: "UNSUPPORTED_LOCALE",
      severity: "error",
      message: `Unsupported typography locale: ${providedLocale}.`,
    });
  }

  const order = config.operations?.order;
  if (order !== undefined) {
    const seen = new Set<TypographyOperationId>();
    let invalid = false;

    for (const operation of order) {
      if (!operationIds.has(operation) || seen.has(operation)) {
        invalid = true;
      }

      seen.add(operation);
    }

    if (invalid) {
      diagnostics.push({
        code: "INVALID_OPERATION_ORDER",
        severity: "error",
        message:
          "Operation order must contain known operation identifiers without duplicates.",
      });
    }

    const softHyphenIndex = order.indexOf("softHyphen");
    if (softHyphenIndex !== -1 && softHyphenIndex !== order.length - 1) {
      diagnostics.push({
        code: "SOFT_HYPHEN_NOT_LAST",
        severity: "warning",
        message: "softHyphen must be the final typography operation.",
      });
    }
  }

  const resolved = resolveTypographyConfig(config);
  if (
    resolved.enabled &&
    resolved.operations.softHyphen &&
    resolved.hyphenation.enabled &&
    resolved.hyphenators?.[resolved.locale] === undefined
  ) {
    diagnostics.push({
      code: "MISSING_HYPHENATOR",
      severity: "warning",
      message: `Hyphenation is enabled, but no synchronous hyphenator is registered for ${resolved.locale}.`,
    });
  }

  return diagnostics;
}

export function isConcreteLocale(
  locale: string,
): locale is TypographyConcreteLocale {
  return concreteLocales.has(locale);
}

function resolveLocale(
  locale: TypographyConfig["locale"],
  fallbackLocale: TypographyConcreteLocale,
): TypographyConcreteLocale {
  if (locale === "auto") {
    return fallbackLocale;
  }

  return isConcreteLocale(locale) ? locale : fallbackLocale;
}

function mergeTypographyConfig(
  base: TypographyConfig,
  override: TypographyConfigOverride,
): TypographyConfig {
  const { exclusions, ...rest } = override;
  const merged = deepMerge(base, rest) as TypographyConfig;

  if (exclusions !== undefined) {
    return {
      ...merged,
      exclusions: mergeExclusions(base.exclusions, exclusions),
    };
  }

  return merged;
}

function mergeExclusions(
  base: TypographyExclusionConfig,
  override: TypographyExclusionOverride,
): TypographyExclusionConfig {
  const merged: TypographyExclusionConfig = {
    ...base,
    components: [...base.components],
    componentNames: [...base.componentNames],
    dataAttribute: {
      ...base.dataAttribute,
      skipValues: [...base.dataAttribute.skipValues] as readonly [
        "skip",
        "off",
        "false",
      ],
    },
    tags: [...base.tags],
  };

  if (override.tags !== undefined) {
    merged.tags = applyListOverride(merged.tags, override.tags);
  }

  if (override.components !== undefined) {
    merged.components = applyListOverride(
      merged.components,
      override.components,
    );
  }

  if (override.componentNames !== undefined) {
    merged.componentNames = applyListOverride(
      merged.componentNames,
      override.componentNames,
    );
  }

  if (override.dataAttribute !== undefined) {
    merged.dataAttribute = deepMerge(
      merged.dataAttribute,
      override.dataAttribute,
    ) as TypographyExclusionConfig["dataAttribute"];
  }

  if (override.shouldSkipElement !== undefined) {
    merged.shouldSkipElement = override.shouldSkipElement;
  }

  return merged;
}

function applyListOverride<T>(
  base: readonly T[],
  override: readonly T[] | ListOverride<T>,
): readonly T[] {
  if (!isListOverride(override)) {
    return [...override];
  }

  if (override.replace !== undefined) {
    return [...override.replace];
  }

  const remove = new Set(override.remove ?? []);
  const result = base.filter((item) => !remove.has(item));

  for (const item of override.add ?? []) {
    if (!result.includes(item)) {
      result.push(item);
    }
  }

  return result;
}

function isListOverride<T>(
  value: readonly T[] | ListOverride<T>,
): value is ListOverride<T> {
  return !Array.isArray(value);
}

function cloneConfig(config: TypographyConfig): TypographyConfig {
  return deepMerge({}, config) as TypographyConfig;
}

function deepMerge(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) {
      continue;
    }

    const previous = result[key];

    if (isReadonlyArray(value)) {
      result[key] = [...value];
      continue;
    }

    if (isPlainObject(previous) && isPlainObject(value)) {
      result[key] = deepMerge(previous, value);
      continue;
    }

    if (isPlainObject(value)) {
      result[key] = deepMerge({}, value);
      continue;
    }

    result[key] = value;
  }

  return result;
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

export function isKnownExcludedTag(tag: string): tag is TypographyExcludedTag {
  return tag.length > 0;
}
