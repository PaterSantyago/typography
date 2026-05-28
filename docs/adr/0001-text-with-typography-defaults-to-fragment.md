# TextWithTypography Defaults to Fragment

TextWithTypography defaults to rendering no wrapper, so omitting `as` has the same DOM behavior as `as={null}`. Its TypeScript surface treats that fragment case strictly, which means wrapper-only props such as `className` require an explicit `as`, even though the generic helper type in the original specification used `"span"` as an example default. This keeps the public API aligned with the component's local, minimally invasive typography boundary.
