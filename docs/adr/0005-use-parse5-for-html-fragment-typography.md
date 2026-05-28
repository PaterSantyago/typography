# Use parse5 for HTML Fragment Typography

The structured `typographText` API parses HTML fragments with a real HTML parser instead of regular expressions or a custom tokenizer. This keeps tags, attributes, entities, and excluded element contents intact while allowing the typography engine to operate only on text nodes, and it preserves SSR safety because parsing does not depend on browser DOM APIs.
