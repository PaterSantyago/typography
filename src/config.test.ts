import { describe, expect, it } from "vitest";

import {
  TextWithTypography,
  resolveTypographyConfig,
  typographText,
  typographTextWithConfig,
  validateTypographyConfig,
} from "./index.js";
import type { TextWithTypographyProps } from "./index.js";

describe("resolveTypographyConfig", () => {
  it("applies defaults, provider config, local config, and shortcut-style overrides in order", () => {
    const config = resolveTypographyConfig(
      { locale: "en-US", preset: "ui" },
      { locale: "es", operations: { quotes: false } },
      { preset: "heading", operations: { quotes: true } },
    );

    expect(config.locale).toBe("es");
    expect(config.preset).toBe("heading");
    expect(config.operations.quotes).toBe(true);
  });

  it("supports add, remove, and replace semantics for exclusion lists", () => {
    const added = resolveTypographyConfig({
      exclusions: {
        tags: {
          add: ["abbr"],
          remove: ["svg"],
        },
      },
    });

    expect(added.exclusions.tags).toContain("abbr");
    expect(added.exclusions.tags).not.toContain("svg");

    const replaced = resolveTypographyConfig({
      exclusions: {
        tags: {
          replace: ["code"],
        },
      },
    });

    expect(replaced.exclusions.tags).toEqual(["code"]);
  });

  it("resolves auto locale to the configured fallback locale", () => {
    const config = resolveTypographyConfig({
      fallbackLocale: "es",
      locale: "auto",
    });

    expect(config.locale).toBe("es");
  });
});

describe("validateTypographyConfig", () => {
  it("reports auto locale fallback and soft hyphen ordering diagnostics", () => {
    const diagnostics = validateTypographyConfig({
      locale: "auto",
      operations: {
        order: ["softHyphen", "quotes"],
      },
    });

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "AUTO_LOCALE_FALLBACK_USED",
      "SOFT_HYPHEN_NOT_LAST",
    ]);
  });

  it("reports missing hyphenators for enabled synchronous hyphenation", () => {
    const diagnostics = validateTypographyConfig({
      hyphenation: {
        enabled: true,
      },
      locale: "en-US",
      operations: {
        softHyphen: true,
      },
    });

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "MISSING_HYPHENATOR",
    );
  });
});

describe("typographText", () => {
  it("applies the public string typography contract", () => {
    expect(
      typographText("\"Don't worry... we'll ship it in 2026 -- probably.\"", {
        locale: "en-US",
      }),
    ).toBe("“Don’t worry… we’ll ship it in 2026—probably.”");
  });

  it("runs a resolved synchronous hyphenator as the final operation", () => {
    const config = resolveTypographyConfig({
      hyphenation: {
        enabled: true,
        minWordLength: 8,
      },
      hyphenators: {
        "en-US": (input) =>
          input.replace("accessibility", "access\u00ADibility"),
      },
      operations: {
        softHyphen: true,
      },
    });

    expect(typographTextWithConfig("accessibility...", config)).toBe(
      "access\u00ADibility…",
    );
  });
});

describe("public TextWithTypography types", () => {
  it("keeps unsafe HTML and implicit fragment wrapper props out of the API", () => {
    function assertPublicTypes(): void {
      const invalidHtml: TextWithTypographyProps<"h1"> = {
        as: "h1",
        // @ts-expect-error TextWithTypography works with children, not HTML strings.
        dangerouslySetInnerHTML: { __html: '"Hello..."' },
      };

      // @ts-expect-error className requires an explicit wrapper through as.
      TextWithTypography({ className: "title", children: "Title" });

      void invalidHtml;
    }

    expect(assertPublicTypes).toBeTypeOf("function");
  });
});
