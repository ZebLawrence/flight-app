import { ComponentType } from 'react';

/** Minimal JSON Schema representation used for addon configuration validation. */
export type JSONSchema = {
  type?: string;
  properties?: Record<string, JSONSchema>;
  required?: string[];
  [key: string]: unknown;
};

/** Handler for a single API route registered by an addon. */
export type RouteHandler = (req: Request) => Response | Promise<Response>;

/** Describes an addon module that can be registered with the add-on system. */
export interface AddonModule {
  /** Unique identifier for the addon (e.g. "analytics"). */
  key: string;
  /** Human-readable display name (e.g. "Analytics"). */
  name: string;
  /** React components provided by this addon, keyed by component name. */
  components?: Record<string, ComponentType<any>>;
  /** API route handlers provided by this addon, keyed by route path. */
  apiRoutes?: Record<string, RouteHandler>;
  /** JSON Schema describing the addon's configuration shape. */
  configSchema?: JSONSchema;
}
