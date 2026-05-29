# Use Factory Defaults Instead of React Provider

TextWithTypography stays compatible with server component boundaries by avoiding React context and hook imports in its module surface. Site-wide typography choices are expressed by creating a local TextWithTypography with `createTextWithTypography`, rather than by wrapping the tree in TypographyProvider; this keeps shared defaults explicit at the import boundary and avoids ambient mutable state or client-only provider constraints.
