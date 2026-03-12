export type ComponentNode = {
  type: string;
  props?: Record<string, unknown>;
  children?: ComponentNode[];
};
