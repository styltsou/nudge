import type { ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';

const roots = new Map<HTMLElement, Root>();

/** One owned root per view. Re-rendering retains local drafts and focus. */
export function renderView(node: HTMLElement, content: ReactNode) {
  let root = roots.get(node);
  if (!root) {
    root = createRoot(node);
    roots.set(node, root);
  }
  flushSync(() => root.render(content));
}

/** Dispose before the engine removes a panel or the complete shadow host. */
export function disposeViews(scope: ParentNode) {
  for (const [node, root] of roots) {
    if (scope === node || scope.contains(node)) {
      roots.delete(node);
      // The host may be destroyed from another React tree's effect cleanup.
      // Unmount after that commit rather than nesting synchronous commits.
      queueMicrotask(() => root.unmount());
    }
  }
}
