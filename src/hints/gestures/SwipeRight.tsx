import { ChevronRight } from 'lucide-react';

export function SwipeRightGesture() {
  return (
    <div className="hint-gesture hint-gesture-swipe">
      <div className="hint-gesture-divider" />
      <div className="hint-gesture-swipe-flow">
        <div className="hint-gesture-touch-dot" />
        <ChevronRight className="hint-gesture-chevron hint-gesture-chevron-1" size={36} />
        <ChevronRight className="hint-gesture-chevron hint-gesture-chevron-2" size={36} />
        <ChevronRight className="hint-gesture-chevron hint-gesture-chevron-3" size={36} />
      </div>
    </div>
  );
}
