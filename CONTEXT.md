# Typography

This context defines the language for a typography library that prepares short text fragments for display. It covers both pure typography utilities and local React typography boundaries.

## Language

**Typography Library**:
A package for preparing short interface and marketing text fragments for display. It includes both pure text utilities and React-facing typography APIs.
_Avoid_: App-wide postprocessor, article renderer, CMS pipeline

**TextWithTypography**:
A local React typography boundary that applies typography rules to text nodes inside its children. It is not a global application transformer.
_Avoid_: Global typographer, DOM postprocessor

**Site Typography Defaults**:
Central typography choices that an application reuses across many local typography boundaries. They belong to the consuming site and should remain explicit at the import boundary rather than behaving like ambient global state.
_Avoid_: Global typography provider, mutable package defaults

**Static Render Result**:
The React output observed without browser layout or DOM mutation. It is the primary way this project verifies typography boundaries behave the same on the server and client.
_Avoid_: Browser-corrected DOM, hydrated side effect

**Server Component Compatibility**:
A React-facing typography API can be imported and rendered from a server component boundary without requiring a client component boundary. It is stricter than a static render result because the module surface itself must fit server component constraints.
_Avoid_: Plain SSR support, browserless render

**Typography Engine**:
The pure text-processing part that applies locale-specific typography operations to a string. It is separate from the React boundary that decides which text nodes should be processed.
_Avoid_: React renderer, DOM mutator

**Typography Operation**:
A named text transformation that the typography engine may apply as part of a configured pipeline. Operations are user-visible through configuration, so their names are part of the product language.
_Avoid_: Filter, plugin, formatter step

**String Typography Utility**:
A public API for applying the typography engine without a React boundary. It returns processed text with warnings and stats, and can operate on plain text or an HTML fragment.
_Avoid_: HTML postprocessor, prop auto-typographer

**Engine Options**:
Configuration for the non-React typography engine, including input format, output serialization, warnings, stats, and text-processing rules. It is separate from React traversal configuration.
_Avoid_: React provider config, component props

**Protected Fragment**:
A technical fragment that the typography engine must preserve byte-for-byte while processing surrounding text. URLs, email addresses, code-like tokens, file paths, HTML tags, and excluded HTML element contents are protected fragments.
_Avoid_: Typographical text, rich text content

## Example Dialogue

Developer: "Should this landing page title use TextWithTypography?"

Domain expert: "Yes, it is a short interface text fragment. Use TextWithTypography as a local boundary, and keep long article content in the content pipeline instead."
