# Interactive Components

This directory contains **client-side interactive components** for the CMS renderer.

## Pattern: `"use client"` Directive

All interactive components must begin with the `"use client"` directive as their first line.
This signals to Next.js that the component should be treated as a **React Client Component**,
enabling the use of browser APIs, state, effects, and event handlers.

```tsx
'use client';

import React, { useState } from 'react';

export function MyInteractiveComponent() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

## SSR Behavior

Client components declared with `"use client"` are **fully SSR-compatible**. Next.js renders
their initial HTML on the server and hydrates them on the client. The CMS renderer
(`src/lib/renderer/index.ts`) uses `React.createElement` to build the element tree, which
works identically for both server and client components during SSR — no special handling is
required.

## Registering Interactive Components

Add interactive components to the `interactiveRegistry` in `index.ts` so that the CMS
renderer can resolve them by type name:

```ts
// src/components/cms/interactive/index.ts
import { MyInteractiveComponent } from './MyInteractiveComponent';

export const interactiveRegistry: Record<string, ComponentType<any>> = {
  MyInteractiveComponent,
};
```

The `interactiveRegistry` is merged into the top-level `registry`
(`src/components/cms/registry.ts`) automatically, so no further changes to the renderer are
needed when adding new interactive components.

## Rules

- Every interactive component **must** start with `'use client';`.
- Interactive components **must not** be imported directly into Server Components — always
  access them through the registry.
- Keep interactive components focused on interactivity; delegate data fetching to Server
  Components or API routes.
