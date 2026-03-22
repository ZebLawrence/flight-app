export type ComponentNode = {
  type: string;
  props?: Record<string, unknown>;
  children?: ComponentNode[];
};

export interface PageMeta {
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;      // URL to OG image
  canonicalUrl?: string;
}
