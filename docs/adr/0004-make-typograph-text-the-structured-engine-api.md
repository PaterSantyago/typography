# Make typographText the Structured Engine API

The package changes `typographText` from a string-to-string helper into the primary structured typography engine API for plain text and HTML fragments. This is a breaking change from the first implementation, but it avoids splitting the public surface between two competing engine entrypoints and makes warnings, stats, and output serialization part of the default non-React contract.
