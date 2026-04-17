import { useEffect, useState, useCallback } from 'react';
import { HINTS, hintStorageKey } from './registry';
import { HintOverlay } from './HintOverlay';
import type { HintDef, HintTrigger } from './types';

function isSeen(def: HintDef): boolean {
  return !!localStorage.getItem(hintStorageKey(def));
}

function markSeen(def: HintDef): void {
  localStorage.setItem(hintStorageKey(def), '1');
}

/** Find the first unseen hint whose trigger + condition match. */
function pickHint(trigger: HintTrigger): HintDef | null {
  for (const def of HINTS) {
    if (def.trigger !== trigger) continue;
    if (def.condition && !def.condition()) continue;
    if (isSeen(def)) continue;
    return def;
  }
  return null;
}

/**
 * Imperatively trigger a named hint (e.g. after a feature mount).
 * `window.dispatchEvent(new CustomEvent('podda:hint', { detail: 'player-open' }))`
 */
export const HINT_EVENT = 'podda:hint';

export function triggerHint(trigger: HintTrigger) {
  window.dispatchEvent(new CustomEvent(HINT_EVENT, { detail: trigger }));
}

export function HintManager() {
  const [active, setActive] = useState<HintDef | null>(null);

  const dismiss = useCallback(() => {
    if (active) markSeen(active);
    setActive(null);
  }, [active]);

  // Expose dismiss + trigger on window for cross-component use (e.g. when a
  // gesture fires the action the hint was teaching, dismiss immediately).
  useEffect(() => {
    (window as any).__poddaDismissHint = dismiss;
  }, [dismiss]);

  useEffect(() => {
    // Migrate legacy v1.0.40 swipe-hint key to the new registry key.
    if (localStorage.getItem('podda:swipe-hint-v1') && !localStorage.getItem('podda:hint-sidebar-swipe-v1')) {
      localStorage.setItem('podda:hint-sidebar-swipe-v1', '1');
      localStorage.removeItem('podda:swipe-hint-v1');
    }

    // Show app-mount hints on first render.
    const first = pickHint('app-mount');
    if (first) setActive(first);

    const onTrigger = (e: Event) => {
      const detail = (e as CustomEvent<HintTrigger>).detail;
      if (!detail) return;
      const next = pickHint(detail);
      if (next) setActive(next);
    };
    window.addEventListener(HINT_EVENT, onTrigger);
    return () => window.removeEventListener(HINT_EVENT, onTrigger);
  }, []);

  if (!active) return null;
  return <HintOverlay hint={active} onDismiss={dismiss} />;
}

/** Dismiss the currently-active hint (if any) — for when the user performs
 *  the gesture the hint was teaching. */
export function dismissActiveHint() {
  const fn = (window as any).__poddaDismissHint;
  if (typeof fn === 'function') fn();
}
