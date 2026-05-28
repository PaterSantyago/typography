declare module "hyphen/en-us/index.js" {
  type HyphenationFunctionSync = (
    text: string,
    options?: Readonly<{
      exceptions?: readonly string[];
      hyphenChar?: string;
      minWordLength?: number;
    }>,
  ) => string;

  const language: {
    hyphenateSync: HyphenationFunctionSync;
  };

  export default language;
}

declare module "hyphen/en-gb/index.js" {
  type HyphenationFunctionSync = (
    text: string,
    options?: Readonly<{
      exceptions?: readonly string[];
      hyphenChar?: string;
      minWordLength?: number;
    }>,
  ) => string;

  const language: {
    hyphenateSync: HyphenationFunctionSync;
  };

  export default language;
}

declare module "hyphen/es/index.js" {
  type HyphenationFunctionSync = (
    text: string,
    options?: Readonly<{
      exceptions?: readonly string[];
      hyphenChar?: string;
      minWordLength?: number;
    }>,
  ) => string;

  const language: {
    hyphenateSync: HyphenationFunctionSync;
  };

  export default language;
}
