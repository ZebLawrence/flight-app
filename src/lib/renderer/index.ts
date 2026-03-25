import React from 'react';
import type { ComponentNode } from '@/lib/types';
import type { ComponentType } from 'react';

// The renderer supports both server and client components ("use client").
// React.createElement works identically for both during SSR; Next.js handles
// hydration automatically. Interactive components are resolved through the
// interactiveRegistry merged into the top-level registry (src/components/cms/registry.ts).

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function renderNode(
  node: unknown,
  registry: Record<string, ComponentType<any>>,
  path: string,
): React.ReactNode {
  const isDev = process.env.NODE_ENV !== 'production';

  if (node === null || node === undefined) {
    return null;
  }

  // Must be a plain object
  if (!isPlainObject(node)) {
    if (isDev) {
      console.warn(`[renderComponentTree] Node at "${path}" is not a plain object — skipping.`);
    }
    return null;
  }

  // type must be a non-empty string
  if (typeof node.type !== 'string' || node.type.trim() === '') {
    if (isDev) {
      console.warn(
        `[renderComponentTree] Node at "${path}" has missing or invalid "type" field — skipping.`,
      );
    }
    return null;
  }

  // props must be a plain object if present
  if (node.props !== undefined && !isPlainObject(node.props)) {
    if (isDev) {
      console.warn(
        `[renderComponentTree] Node at "${path}" has invalid "props" (not a plain object) — skipping.`,
      );
    }
    return null;
  }

  // children must be an array if present
  if (node.children !== undefined && !Array.isArray(node.children)) {
    if (isDev) {
      console.warn(
        `[renderComponentTree] Node at "${path}" has invalid "children" (not an array) — skipping.`,
      );
    }
    return null;
  }

  const Component = registry[node.type];

  if (!Component) {
    if (isDev) {
      console.warn(
        `[renderComponentTree] Unknown component type "${node.type}" at "${path}" — skipping.`,
      );
    }
    return null;
  }

  const typedNode = node as ComponentNode;
  const props = typedNode.props ?? {};
  const children = typedNode.children;

  if (children && children.length > 0) {
    const renderedChildren = children.map((child, index) =>
      renderNode(child, registry, `${path}.children[${index}]`),
    );
    return React.createElement(Component, { key: path, ...props }, ...renderedChildren);
  }

  return React.createElement(Component, { key: path, ...props });
}

export function renderComponentTree(
  node: unknown,
  registry: Record<string, ComponentType<any>>,
): React.ReactNode {
  return renderNode(node, registry, 'root');
}
