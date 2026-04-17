import { createPortal } from 'react-dom';
import type { HintDef } from './types';
import { SwipeRightGesture } from './gestures/SwipeRight';
import { LongPressGesture } from './gestures/LongPress';
import { TapGesture } from './gestures/Tap';

interface HintOverlayProps {
  hint: HintDef;
  onDismiss: () => void;
}

export function HintOverlay({ hint, onDismiss }: HintOverlayProps) {
  const Gesture =
    hint.gesture === 'swipe-right' ? SwipeRightGesture :
    hint.gesture === 'long-press' ? LongPressGesture :
    TapGesture;

  return createPortal(
    <div className="hint-overlay" onClick={onDismiss}>
      <Gesture />
      <p className="hint-text">{hint.text}</p>
      <p className="hint-dismiss">Tap anywhere to dismiss</p>
    </div>,
    document.body
  );
}
