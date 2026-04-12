import { useEffect, useRef } from 'react';

interface SwipeConfig {
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  edgeZone?: number;       // px from left edge to trigger open (default 40)
  minDistance?: number;     // min horizontal travel in px (default 40)
  minVelocity?: number;    // px/ms (default 0.25)
  maxVerticalRatio?: number; // max dy/dx (default 0.6)
}

export function useSwipeGesture({
  onSwipeRight,
  onSwipeLeft,
  edgeZone = 40,
  minDistance = 40,
  minVelocity = 0.25,
  maxVerticalRatio = 0.6,
}: SwipeConfig) {
  const touchRef = useRef<{ x: number; y: number; t: number } | null>(null);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      // For swipe-right (open), only start from the left edge zone
      // For swipe-left (close), allow from anywhere
      touchRef.current = { x: touch.clientX, y: touch.clientY, t: Date.now() };
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!touchRef.current) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchRef.current.x;
      const dy = touch.clientY - touchRef.current.y;
      const dt = Date.now() - touchRef.current.t;
      const startX = touchRef.current.x;

      touchRef.current = null;

      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // Must be predominantly horizontal
      if (absDy / (absDx || 1) > maxVerticalRatio) return;
      // Must travel minimum distance
      if (absDx < minDistance) return;
      // Must meet minimum velocity
      if (dt === 0 || absDx / dt < minVelocity) return;

      if (dx > 0 && startX < edgeZone && onSwipeRight) {
        onSwipeRight();
      } else if (dx < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [onSwipeRight, onSwipeLeft, edgeZone, minDistance, minVelocity, maxVerticalRatio]);
}
