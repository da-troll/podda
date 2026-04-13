import { createPortal } from 'react-dom';
import { ChevronRight } from 'lucide-react';

const HINT_KEY = 'podda:swipe-hint-v1';

export function hasSeenSwipeHint(): boolean {
  return !!localStorage.getItem(HINT_KEY);
}

export function markSwipeHintSeen(): void {
  localStorage.setItem(HINT_KEY, '1');
}

interface SwipeHintProps {
  onDismiss: () => void;
}

export function SwipeHint({ onDismiss }: SwipeHintProps) {
  return createPortal(
    <div className="swipe-hint-overlay" onClick={onDismiss}>
      {/* Dotted centre line */}
      <div className="swipe-hint-divider" />

      {/* Finger + flowing chevrons */}
      <div className="swipe-hint-gesture">
        <div className="swipe-hint-touch-dot" />
        <ChevronRight className="swipe-hint-chevron swipe-hint-chevron-1" size={36} />
        <ChevronRight className="swipe-hint-chevron swipe-hint-chevron-2" size={36} />
        <ChevronRight className="swipe-hint-chevron swipe-hint-chevron-3" size={36} />
      </div>

      {/* Instruction text */}
      <p className="swipe-hint-text">You can now swipe right to open the navigation menu.</p>

      {/* Dismiss hint */}
      <p className="swipe-hint-dismiss">Tap anywhere to dismiss</p>
    </div>,
    document.body
  );
}
