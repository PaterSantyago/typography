import { describe, expect, it } from "vitest";

import { typographText } from "./index.js";

function text(
  value: string,
  locale: "en-US" | "en-GB" | "es" | "es-ES" | "es-MX" = "en-US",
) {
  return typographText({ format: "plain", locale, text: value });
}

describe("typographText structured API", () => {
  it("returns processed text, warnings, and operation stats", () => {
    const output = text('"Hello..." -- wait', "en-US");

    expect(output.text).toBe("“Hello…”—wait");
    expect(output.warnings).toEqual([]);
    expect(output.stats.replacedQuotes).toBe(2);
    expect(output.stats.replacedDashes).toBe(1);
  });

  it("supports a string overload while still returning structured output", () => {
    expect(typographText("Wait...", { locale: "en-US" }).text).toBe("Wait…");
  });

  it("serializes typographic characters as HTML entities when requested", () => {
    const output = typographText({
      format: "plain",
      locale: "en-US",
      options: { outputMode: "html-entities" },
      text: '"Wait..." -- 10 kg',
    });

    expect(output.text).toBe("&ldquo;Wait&hellip;&rdquo;&mdash;10&nbsp;kg");
  });
});

describe("English typography rules", () => {
  it.each([
    ['"Hello," she said.', "“Hello,” she said."],
    ["I don't know.", "I\u00A0don’t know."],
    ["John's book", "John’s book"],
    ["O'Connor", "O’Connor"],
    ["'90s", "’90s"],
    ["rock 'n' roll", "rock ’n’ roll"],
    ["Wait... what?", "Wait… what?"],
    ["(C) 2026 (R) Widget TM", "© 2026 ® Widget ™"],
    ["12 +- 3", "12 ± 3"],
    ["12 x 3", "12 × 3"],
    ["2019-2024", "2019–2024"],
    ["pages 10-15", "pages 10–15"],
    ["A-Z", "A–Z"],
    ["I know -- or think --- maybe.", "I\u00A0know—or think—maybe."],
    ["12 - 3 = 9", "12 − 3 = 9"],
    ["-12", "−12"],
    ["10 kg", "10\u00A0kg"],
    ["37 °C", "37\u00A0°C"],
    ["10 %", "10%"],
    ["Dr. Smith", "Dr.\u00A0Smith"],
    ["Fig. 2 and No. 5", "Fig.\u00A02 and No.\u00A05"],
    ["J. K. Rowling", "J.\u00A0K.\u00A0Rowling"],
    ["10:30 AM", "10:30\u00A0AM"],
    ["May 5, 2026", "May\u00A05,\u00A02026"],
    ["a word and I think", "a\u00A0word and I\u00A0think"],
    [`5' 10"`, "5′\u00A010″"],
  ])("typographs en-US %s", (input, expected) => {
    expect(text(input, "en-US").text).toBe(expected);
  });

  it.each([
    ['"I agree", he said.', "‘I\u00A0agree’, he said."],
    [`'She called it "strange".'`, "‘She called it “strange”.’"],
    ['He called it "the plan".', "He called it ‘the plan’."],
  ])("typographs en-GB quotes in %s", (input, expected) => {
    expect(text(input, "en-GB").text).toBe(expected);
  });
});

describe("Spanish typography rules", () => {
  it.each([
    ['"Hola"', "«Hola»"],
    ["¿ Qué hora es ?", "¿Qué hora es?"],
    ["¡ Hola !", "¡Hola!"],
    ["No sé ...", "No sé…"],
    ["No sé... pero", "No sé… pero"],
    ["No sé....", "No sé…"],
    ["10%", "10\u00A0%"],
    ["20€", "20\u00A0€"],
    ["13m", "13\u00A0m"],
    ["paginas 23-45", "paginas 23-45"],
    ["1998-1999", "1998-1999"],
    ["Sr. García", "Sr.\u00A0García"],
    ["pág. 12 y art. 5", "pág.\u00A012 y\u00A0art.\u00A05"],
    ["20:30 h", "20:30\u00A0h"],
    ["mayo de 2026", "mayo\u00A0de\u00A02026"],
    ["El plan -si funciona- saldrá.", "El\u00A0plan —si funciona— saldrá."],
    ["— Hola", "—Hola"],
    ["a casa de Madrid y luego", "a\u00A0casa de\u00A0Madrid y\u00A0luego"],
  ])("typographs es %s", (input, expected) => {
    expect(text(input, "es").text).toBe(expected);
  });

  it("normalizes Spanish thousands only when explicitly enabled", () => {
    expect(text("1.234.567", "es").text).toBe("1.234.567");
    expect(
      typographText({
        format: "plain",
        locale: "es",
        options: { numbers: { normalizeSpanishThousands: true } },
        text: "1.234.567",
      }).text,
    ).toBe("1\u202F234\u202F567");
  });

  it("supports opt-in safe Spanish opening punctuation insertion", () => {
    expect(text("Qué hora es?", "es").text).toBe("Qué hora es?");
    expect(
      typographText({
        format: "plain",
        locale: "es",
        options: {
          spanish: { insertOpeningPunctuation: "safe-start-only" },
        },
        text: "Qué hora es?",
      }).text,
    ).toBe("¿Qué hora es?");
  });

  it("warns instead of guessing ambiguous Spanish opening punctuation", () => {
    const output = text("Dime, cuándo llegas?", "es");

    expect(output.text).toBe("Dime, cuándo llegas?");
    expect(output.warnings.map((warning) => warning.code)).toContain(
      "ES_MISSING_OPENING_QUESTION_MARK",
    );
  });

  it("keeps Spanish sigla apostrophe plurals by default and corrects them by option", () => {
    const defaultOutput = text("las ONG's", "es");
    expect(defaultOutput.text).toBe("las\u00A0ONG's");
    expect(defaultOutput.warnings.map((warning) => warning.code)).toContain(
      "AMBIGUOUS_PRIME_MARKS",
    );

    expect(
      typographText({
        format: "plain",
        locale: "es",
        options: {
          spanish: { correctSiglaApostrophePlural: true },
        },
        text: "las ONG's",
      }).text,
    ).toBe("las\u00A0ONG");
  });
});

describe("protection and HTML handling", () => {
  it("preserves protected technical fragments in plain text", () => {
    const output = text(
      "Visit https://example.com/a--b?x=1... or email user.name+tag@example.com and run `npm install --save`.",
      "en-US",
    );

    expect(output.text).toBe(
      "Visit https://example.com/a--b?x=1... or email user.name+tag@example.com and run `npm install --save`.",
    );
    expect(output.stats.skippedProtectedFragments).toBe(3);
  });

  it("preserves product codes, versions, identifiers, hashtags, mentions, and paths", () => {
    const output = text(
      "AB-123 v1.2.0 snake_case camelCase COVID-19 @user #topic /tmp/a--b.txt",
      "en-US",
    );

    expect(output.text).toBe(
      "AB-123 v1.2.0 snake_case camelCase COVID-19 @user #topic /tmp/a--b.txt",
    );
    expect(output.stats.skippedProtectedFragments).toBeGreaterThanOrEqual(7);
  });

  it("processes only HTML text nodes and preserves tags, attributes, and excluded elements", () => {
    const output = typographText({
      format: "html",
      locale: "en-US",
      text: '<p title="Do -- not change">"Hello..." <code>npm install --save</code><script>"x..."</script></p>',
    });

    expect(output.text).toBe(
      '<p title="Do -- not change">“Hello…” <code>npm install --save</code><script>"x..."</script></p>',
    );
    expect(output.stats.skippedProtectedFragments).toBe(2);
  });
});

describe("hyphenation", () => {
  it("uses bundled synchronous hyphenators and counts inserted soft hyphens", () => {
    const output = typographText({
      format: "plain",
      locale: "en-US",
      options: { hyphenation: { enabled: true, minWordLength: 7 } },
      text: "internationalization accessibility",
    });

    expect(output.text).toContain("\u00AD");
    expect(output.stats.insertedSoftHyphens).toBeGreaterThan(0);
  });

  it("does not insert soft hyphens into protected tokens or words with existing SHY by default", () => {
    const input = "https://example.com internationali\u00ADzation COVID-19";
    const output = typographText({
      format: "plain",
      locale: "en-US",
      options: { hyphenation: { enabled: true, minWordLength: 7 } },
      text: input,
    });

    expect(output.text).toContain("https://example.com");
    expect(output.text).toContain("internationali\u00ADzation");
    expect(output.text).toContain("COVID-19");
  });

  it("can remap existing soft hyphens explicitly", () => {
    const output = typographText({
      format: "plain",
      locale: "en-US",
      options: {
        hyphenation: {
          enabled: true,
          minWordLength: 7,
          remapExistingSoftHyphens: true,
        },
      },
      text: "internationali\u00ADzation",
    });

    expect(output.text).not.toBe("internationali\u00ADzation");
    expect(output.warnings.map((warning) => warning.code)).toContain(
      "EXISTING_SOFT_HYPHENS_REMAPPED",
    );
  });
});

describe("idempotency and warnings", () => {
  it("is idempotent for typographic replacements, NBSP, and SHY", () => {
    const first = typographText({
      format: "plain",
      locale: "en-US",
      options: { hyphenation: { enabled: true, minWordLength: 7 } },
      text: '"Wait..." 10 kg internationalization',
    }).text;
    const second = typographText({
      format: "plain",
      locale: "en-US",
      options: { hyphenation: { enabled: true, minWordLength: 7 } },
      text: first,
    }).text;

    expect(second).toBe(first);
  });

  it("warns and preserves unbalanced quotes", () => {
    const output = text('"Hello', "en-US");

    expect(output.text).toBe('"Hello');
    expect(output.warnings.map((warning) => warning.code)).toContain(
      "UNBALANCED_QUOTES",
    );
  });
});
