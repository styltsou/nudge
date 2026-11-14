import { useEffect } from 'react';
import type { NudgeOptions } from '@usenudge/core';

export function Nudge({ enabled = false, bridgeUrl, token }: NudgeOptions) {
  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void import('@usenudge/core').then(({ mountNudge }) => {
      if (!disposed)
        cleanup = mountNudge({ enabled: true, bridgeUrl, token }).destroy;
    });
    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [enabled, bridgeUrl, token]);
  return null;
}
