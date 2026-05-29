Feature: TextWithTypography
  TextWithTypography applies local typography rules to React text nodes without
  post-render DOM mutation.

  Scenario: English UI copy is typographed without adding a wrapper
    Given the English UI copy is inside TextWithTypography without a wrapper
      """
      "Don't wait... launch in 2026 -- or earlier."
      """
    When the React tree is rendered to static markup
    Then the static markup is
      """
      “Don’t wait… launch in 2026—or earlier.”
      """

  Scenario: A semantic wrapper receives pass-through props
    Given the hero title is rendered as an h1 with class "hero-title"
      """
      "Beautiful typography for user interfaces"
      """
    When the React tree is rendered to static markup
    Then the static markup is
      """
      <h1 class="hero-title">“Beautiful typography for user interfaces”</h1>
      """

  Scenario: Spanish UI copy uses Spanish punctuation and spacing
    Given the Spanish paragraph is inside TextWithTypography
      """
      "Hola..." ¿ que tal ? 20€
      """
    When the React tree is rendered to static markup
    Then the static markup is
      """
      <p>«Hola…» ¿que tal? 20[NBSP]€</p>
      """

  Scenario: Excluded code content is preserved
    Given a typography boundary contains excluded code
    When the React tree is rendered to static markup
    Then the static markup is
      """
      Use the command <code>npm install --save</code> and click “Continue”.
      """

  Scenario: Local locale overrides site typography defaults
    Given site typography defaults contain an English block and a local Spanish block
    When the React tree is rendered to static markup
    Then the static markup is
      """
      <p>“English text…”</p><p>«Texto español…»</p>
      """

  Scenario: TypographySkip is a transparent skip boundary
    Given a typography boundary contains TypographySkip
    When the React tree is rendered to static markup
    Then the static markup is
      """
      This “text” is processed.This &quot;text -- is not...&quot;
      """

  Scenario: Registered hyphenators run synchronously and emit Unicode soft hyphen
    Given English text is rendered with a registered synchronous hyphenator
      """
      Internationalization and accessibility
      """
    When the React tree is rendered to static markup
    Then the static markup is
      """
      Inter[SHY]national[SHY]ization and accessibility
      """
