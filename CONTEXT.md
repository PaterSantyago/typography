# Typography

This context defines the language for a typography library that prepares short text fragments for display. It covers both pure typography utilities and local React typography boundaries.

## Language

**Typography Library**:
A package for preparing short interface and marketing text fragments for display. It includes both pure text utilities and React-facing typography APIs.
_Avoid_: App-wide postprocessor, article renderer, CMS pipeline

**TextWithTypography**:
A local React typography boundary that applies typography rules to text nodes inside its children. It is not a global application transformer.
_Avoid_: Global typographer, DOM postprocessor

**Static Render Result**:
The React output observed without browser layout or DOM mutation. It is the primary way this project verifies typography boundaries behave the same on the server and client.
_Avoid_: Browser-corrected DOM, hydrated side effect

**Typography Engine**:
The pure text-processing part that applies locale-specific typography operations to a string. It is separate from the React boundary that decides which text nodes should be processed.
_Avoid_: React renderer, DOM mutator

**Typography Operation**:
A named text transformation that the typography engine may apply as part of a configured pipeline. Operations are user-visible through configuration, so their names are part of the product language.
_Avoid_: Filter, plugin, formatter step

**String Typography Utility**:
A public API for applying the typography engine to a plain string without a React boundary. It is for explicit prop or preprocessing use, not hidden rewriting of React props.
_Avoid_: HTML postprocessor, prop auto-typographer

## Example Dialogue

Developer: "Should this landing page title use TextWithTypography?"

Domain expert: "Yes, it is a short interface text fragment. Use TextWithTypography as a local boundary, and keep long article content in the content pipeline instead."
