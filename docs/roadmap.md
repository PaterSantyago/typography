# Roadmap

## Deferred

### Warning-only Language Detection

Add deterministic, warning-only detection for likely mixed English/Spanish text and uncertain `en-US` versus `en-GB` profile selection. Detection must not switch locale rules automatically; it should only emit warnings so the caller can choose an explicit locale.

### Richer Plain Text Code Detection

Improve plain-text inline code protection beyond backtick-delimited fragments. The current planned rule protects Markdown-style backtick code only; future work should evaluate additional deterministic code-like patterns without over-protecting ordinary prose.
