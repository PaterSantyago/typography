# Require Explicit Skip for Parent Code Boundaries

TextWithTypography skips code-like elements that appear inside its own React subtree, but it does not attempt to detect whether it is rendered inside a parent `<code>` element. React components cannot inspect native DOM ancestors during SSR-safe render without adding DOM traversal or side effects, so callers must use `disabled`, TypographySkip, or provider configuration when the typography boundary is placed inside external code-like markup.
