# Keep Auto Locale Deterministic

`locale: "auto"` resolves to the configured fallback locale instead of detecting the language from content or environment. This deliberately avoids unstable server/client output and false-positive language switching; mixed-language detection is deferred to a future warning-only feature rather than being used to choose transformation rules.
