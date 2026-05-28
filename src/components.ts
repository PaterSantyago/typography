import {
  Fragment,
  cloneElement,
  createContext,
  createElement,
  isValidElement,
  useContext,
  useMemo,
} from "react";
import type {
  ComponentPropsWithoutRef,
  ElementType,
  ReactElement,
  ReactNode,
} from "react";

import { resolveTypographyConfig } from "./config.js";
import { typographPlainTextWithConfig } from "./text.js";
import type {
  ResolvedTypographyConfig,
  TextWithTypographyOwnProps,
  TypographyConfigOverride,
  TypographyExclusionOverride,
  TypographyHyphenationOverride,
  TypographyOperationOverrides,
  TypographyProviderProps,
  TypographySkipProps,
  TypographyTraversalOverride,
} from "./types.js";

type TextWithTypographyFragmentProps = Omit<
  TextWithTypographyOwnProps,
  "as"
> & {
  as?: null;
};

type PolymorphicTextWithTypographyProps<TAs extends ElementType> = Omit<
  TextWithTypographyOwnProps,
  "as"
> & {
  as: TAs;
} & Omit<
    ComponentPropsWithoutRef<TAs>,
    keyof TextWithTypographyOwnProps | "children" | "dangerouslySetInnerHTML"
  >;

type ImplementationProps = TextWithTypographyOwnProps & {
  dangerouslySetInnerHTML?: unknown;
  [key: string]: unknown;
};

type ElementWithChildren = ReactElement<
  Record<string, unknown> & { children?: ReactNode }
>;

interface ProcessResult {
  changed: boolean;
  node: ReactNode;
}

const TypographyConfigContext = createContext<ResolvedTypographyConfig | null>(
  null,
);

export function TypographyProvider({
  children,
  config,
  inherit = true,
}: TypographyProviderProps): ReactElement {
  const parentConfig = useContext(TypographyConfigContext);
  const value = useMemo(
    () =>
      resolveTypographyConfig(
        inherit && parentConfig !== null ? parentConfig : undefined,
        config,
      ),
    [config, inherit, parentConfig],
  );

  return createElement(TypographyConfigContext.Provider, { value }, children);
}

export function useTypographyConfig(): ResolvedTypographyConfig {
  return useContext(TypographyConfigContext) ?? resolveTypographyConfig();
}

export function TypographySkip({
  children,
}: TypographySkipProps): ReactElement {
  return createElement(Fragment, null, children);
}

TypographySkip.displayName = "TypographySkip";

export function TextWithTypography(
  props: TextWithTypographyFragmentProps,
): ReactElement;
export function TextWithTypography<TAs extends ElementType>(
  props: PolymorphicTextWithTypographyProps<TAs>,
): ReactElement;
export function TextWithTypography(props: ImplementationProps): ReactElement {
  const providerConfig = useTypographyConfig();
  const {
    as = null,
    children,
    config,
    dangerouslySetInnerHTML,
    disabled,
    exclusions,
    hyphenation,
    locale,
    operations,
    preset,
    traversal,
    ...restProps
  } = props;

  void dangerouslySetInnerHTML;

  const resolvedConfig = resolveTypographyConfig(
    providerConfig,
    config,
    createShortcutConfig({
      disabled,
      exclusions,
      hyphenation,
      locale,
      operations,
      preset,
      traversal,
    }),
  );

  const processedChildren = resolvedConfig.enabled
    ? processReactNode(children, resolvedConfig, 0).node
    : children;

  if (as === null) {
    return createElement(Fragment, null, processedChildren);
  }

  return createElement(as, restProps, processedChildren);
}

function createShortcutConfig(input: {
  disabled?: boolean | undefined;
  exclusions?: TypographyExclusionOverride | undefined;
  hyphenation?: boolean | TypographyHyphenationOverride | undefined;
  locale?: TypographyConfigOverride["locale"] | undefined;
  operations?: TypographyOperationOverrides | undefined;
  preset?: TypographyConfigOverride["preset"] | undefined;
  traversal?: TypographyTraversalOverride | undefined;
}): TypographyConfigOverride {
  const config: TypographyConfigOverride = {};
  let operationOverrides: TypographyOperationOverrides | undefined =
    input.operations === undefined ? undefined : { ...input.operations };

  if (input.locale !== undefined) {
    config.locale = input.locale;
  }

  if (input.preset !== undefined) {
    config.preset = input.preset;
  }

  if (input.disabled !== undefined) {
    config.enabled = !input.disabled;
  }

  if (input.hyphenation !== undefined) {
    if (typeof input.hyphenation === "boolean") {
      config.hyphenation = {
        enabled: input.hyphenation,
      };
      operationOverrides = {
        ...operationOverrides,
        softHyphen: input.hyphenation,
      };
    } else {
      config.hyphenation = input.hyphenation;
      if (input.hyphenation.enabled !== undefined) {
        operationOverrides = {
          ...operationOverrides,
          softHyphen: input.hyphenation.enabled,
        };
      }
    }
  }

  if (operationOverrides !== undefined) {
    config.operations = operationOverrides;
  }

  if (input.exclusions !== undefined) {
    config.exclusions = input.exclusions;
  }

  if (input.traversal !== undefined) {
    config.traversal = input.traversal;
  }

  return config;
}

function processReactNode(
  node: ReactNode,
  config: ResolvedTypographyConfig,
  depth: number,
): ProcessResult {
  if (typeof node === "string") {
    const typographed = typographPlainTextWithConfig(node, config);
    return {
      changed: typographed !== node,
      node: typographed,
    };
  }

  if (typeof node === "number") {
    if (!config.traversal.processNumbers) {
      return { changed: false, node };
    }

    const source = String(node);
    const typographed = typographPlainTextWithConfig(source, config);
    return {
      changed: true,
      node: typographed,
    };
  }

  if (Array.isArray(node)) {
    return processReactNodeArray(node, config, depth);
  }

  if (!isValidElement(node)) {
    return { changed: false, node };
  }

  return processReactElement(node as ElementWithChildren, config, depth);
}

function processReactNodeArray(
  nodes: readonly ReactNode[],
  config: ResolvedTypographyConfig,
  depth: number,
): ProcessResult {
  if (config.traversal.textSegmentation === "adjacent-text-run") {
    return processAdjacentTextRuns(nodes, config, depth);
  }

  const results = nodes.map((child) => processReactNode(child, config, depth));
  const changed = results.some((result) => result.changed);

  return {
    changed,
    node: changed ? results.map((result) => result.node) : nodes,
  };
}

function processAdjacentTextRuns(
  nodes: readonly ReactNode[],
  config: ResolvedTypographyConfig,
  depth: number,
): ProcessResult {
  const processed: ReactNode[] = [];
  let changed = false;
  let textRun = "";
  let hasTextRun = false;

  const flushTextRun = (): void => {
    if (!hasTextRun) {
      return;
    }

    const typographed = typographPlainTextWithConfig(textRun, config);
    processed.push(typographed);
    changed ||= typographed !== textRun;
    textRun = "";
    hasTextRun = false;
  };

  for (const child of nodes) {
    if (
      typeof child === "string" ||
      (typeof child === "number" && config.traversal.processNumbers)
    ) {
      textRun += String(child);
      hasTextRun = true;
      continue;
    }

    flushTextRun();

    const result = processReactNode(child, config, depth);
    changed ||= result.changed;
    processed.push(result.node);
  }

  flushTextRun();

  return {
    changed,
    node: changed ? processed : nodes,
  };
}

function processReactElement(
  element: ElementWithChildren,
  config: ResolvedTypographyConfig,
  depth: number,
): ProcessResult {
  if (
    config.traversal.maxDepth !== null &&
    depth >= config.traversal.maxDepth
  ) {
    return { changed: false, node: element };
  }

  const elementType = element.type as ElementType;
  const props = element.props;

  if (
    elementType === TypographySkip ||
    shouldSkipElement(element, config, depth)
  ) {
    return { changed: false, node: element };
  }

  if (elementType === Fragment && config.traversal.fragments === "preserve") {
    return { changed: false, node: element };
  }

  if (
    isCustomComponent(elementType) &&
    config.traversal.customComponents === "preserve"
  ) {
    return { changed: false, node: element };
  }

  if (!("children" in props)) {
    return { changed: false, node: element };
  }

  const childrenResult = processReactNode(props.children, config, depth + 1);
  if (!childrenResult.changed) {
    return { changed: false, node: element };
  }

  return {
    changed: true,
    node: cloneElement(element, undefined, childrenResult.node),
  };
}

function shouldSkipElement(
  element: ElementWithChildren,
  config: ResolvedTypographyConfig,
  depth: number,
): boolean {
  const elementType = element.type as ElementType;
  const props = element.props;

  if (typeof elementType === "string") {
    const tagName = elementType.toLowerCase();
    if (config.exclusions.tags.includes(tagName)) {
      return true;
    }
  } else {
    if (config.exclusions.components.includes(elementType)) {
      return true;
    }

    const displayName = getComponentName(elementType);
    if (
      displayName !== undefined &&
      config.exclusions.componentNames.includes(displayName)
    ) {
      return true;
    }
  }

  const skipValue = props[config.exclusions.dataAttribute.name];
  if (
    typeof skipValue === "string" &&
    config.exclusions.dataAttribute.skipValues.includes(
      skipValue as "skip" | "off" | "false",
    )
  ) {
    return true;
  }

  return (
    config.exclusions.shouldSkipElement?.({
      depth,
      elementType,
      locale: config.locale,
      props,
    }) ?? false
  );
}

function isCustomComponent(elementType: ElementType): boolean {
  return typeof elementType !== "string" && elementType !== Fragment;
}

function getComponentName(elementType: unknown): string | undefined {
  if (typeof elementType === "string") {
    return elementType;
  }

  if (typeof elementType === "function") {
    const namedFunction = elementType as {
      displayName?: string;
      name?: string;
    };
    return namedFunction.displayName ?? namedFunction.name;
  }

  if (
    typeof elementType === "object" &&
    elementType !== null &&
    "displayName" in elementType &&
    typeof elementType.displayName === "string"
  ) {
    return elementType.displayName;
  }

  return undefined;
}
