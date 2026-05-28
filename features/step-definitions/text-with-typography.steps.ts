import assert from "node:assert/strict";

import { Given, Then, When } from "@cucumber/cucumber";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  TextWithTypography,
  TypographyProvider,
  TypographySkip,
  type TypographyHyphenator,
} from "../../src/index.js";

interface ScenarioWorld {
  rendered?: string;
  tree?: React.ReactElement;
}

function replaceMarkers(value: string): string {
  return value.replaceAll("[NBSP]", "\u00A0").replaceAll("[SHY]", "\u00AD");
}

Given(
  "the English UI copy is inside TextWithTypography without a wrapper",
  function (this: ScenarioWorld, text: string) {
    this.tree = React.createElement(
      TextWithTypography,
      { locale: "en-US" },
      text,
    );
  },
);

Given(
  "the hero title is rendered as an h1 with class {string}",
  function (this: ScenarioWorld, className: string, text: string) {
    this.tree = React.createElement(
      TextWithTypography,
      { as: "h1", className, locale: "en-US" },
      text,
    );
  },
);

Given(
  "the Spanish paragraph is inside TextWithTypography",
  function (this: ScenarioWorld, text: string) {
    this.tree = React.createElement(
      TextWithTypography,
      { as: "p", locale: "es" },
      text,
    );
  },
);

Given(
  "a typography boundary contains excluded code",
  function (this: ScenarioWorld) {
    this.tree = React.createElement(
      TextWithTypography,
      { locale: "en-US" },
      "Use the command ",
      React.createElement("code", null, "npm install --save"),
      ' and click "Continue".',
    );
  },
);

Given(
  "an English provider contains an English block and a local Spanish block",
  function (this: ScenarioWorld) {
    this.tree = React.createElement(
      TypographyProvider,
      { config: { locale: "en-US" } },
      React.createElement(TextWithTypography, { as: "p" }, '"English text..."'),
      React.createElement(
        TextWithTypography,
        { as: "p", locale: "es" },
        '"Texto español..."',
      ),
    );
  },
);

Given(
  "a typography boundary contains TypographySkip",
  function (this: ScenarioWorld) {
    this.tree = React.createElement(
      TextWithTypography,
      { locale: "en-US" },
      'This "text" is processed.',
      React.createElement(TypographySkip, null, 'This "text -- is not..."'),
    );
  },
);

Given(
  "English text is rendered with a registered synchronous hyphenator",
  function (this: ScenarioWorld, text: string) {
    const hyphenateEnUs: TypographyHyphenator = (input) =>
      input.replace("Internationalization", "Inter\u00ADnational\u00ADization");

    this.tree = React.createElement(
      TextWithTypography,
      {
        config: {
          hyphenators: {
            "en-US": hyphenateEnUs,
          },
        },
        hyphenation: {
          enabled: true,
          minWordLength: 8,
        },
        locale: "en-US",
      },
      text,
    );
  },
);

When(
  "the React tree is rendered to static markup",
  function (this: ScenarioWorld) {
    assert.ok(this.tree, "Expected a React scenario tree to be configured.");
    this.rendered = renderToStaticMarkup(this.tree);
  },
);

Then("the static markup is", function (this: ScenarioWorld, expected: string) {
  assert.equal(this.rendered, replaceMarkers(expected));
});
