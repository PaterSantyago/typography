# @glushkov.us/typography

Typography utilities for text preparation.

## React typography boundary

```tsx
import { TextWithTypography } from "@glushkov.us/typography";

export function HeroTitle() {
  return (
    <TextWithTypography as="h1" locale="en-US" className="hero-title">
      "Don't wait... launch in 2026 -- or earlier."
    </TextWithTypography>
  );
}
```

`TextWithTypography` recursively processes React text nodes inside a local
boundary. It does not mutate the DOM after render and does not rewrite arbitrary
props such as `aria-label`, `title`, or `placeholder`.

For plain strings, use `typographText`.
