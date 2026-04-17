import { useState, useRef, useCallback, useEffect } from 'react';
import { hapticImpact } from './haptics';

const LONG_PRESS_MS = 150;
const GRAB_THRESHOLD_PCT = 4;
const END_SNAP_PCT = 3;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

interface Props {
  position: number;
  duration: number;
  onSeek: (t: number) => void;
}

export function ProgressBar({ position, duration, onSeek }: Props) {
  const barRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<number>(0);
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubPct, setScrubPct] = useState(0);
  const scrubbingRef = useRef(false);

  const livePct = duration > 0 ? (position / duration) * 100 : 0;
  const displayPct = scrubbing ? scrubPct : livePct;

  const getPct = useCallback((clientX: number) => {
    const bar = barRef.current;
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    const raw = clamp((clientX - rect.left) / rect.width * 100, 0, 100);
    if (raw >= 100 - END_SNAP_PCT) return 100;
    if (raw <= END_SNAP_PCT) return 0;
    return raw;
  }, []);

  const isNearThumb = useCallback((clientX: number) => {
    const bar = barRef.current;
    if (!bar) return false;
    const rect = bar.getBoundingClientRect();
    const thumbPx = (livePct / 100) * rect.width;
    const pressPx = clientX - rect.left;
    const thresholdPx = Math.max(20, (GRAB_THRESHOLD_PCT / 100) * rect.width);
    return Math.abs(pressPx - thumbPx) <= thresholdPx;
  }, [livePct]);

  const startScrub = useCallback((pct: number) => {
    scrubbingRef.current = true;
    setScrubbing(true);
    setScrubPct(pct);
    hapticImpact('LIGHT');
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const pct = getPct(touch.clientX);
    if (isNearThumb(touch.clientX)) {
      startScrub(pct);
    } else {
      longPressTimer.current = window.setTimeout(() => startScrub(pct), LONG_PRESS_MS);
    }
  }, [getPct, isNearThumb, startScrub]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!scrubbingRef.current) {
      clearTimeout(longPressTimer.current);
      return;
    }
    e.preventDefault();
    setScrubPct(getPct(e.touches[0].clientX));
  }, [getPct]);

  const onTouchEnd = useCallback(() => {
    clearTimeout(longPressTimer.current);
    if (scrubbingRef.current) {
      scrubbingRef.current = false;
      setScrubbing(false);
      hapticImpact('LIGHT');
      if (duration > 0) onSeek((scrubPct / 100) * duration);
    }
  }, [duration, scrubPct, onSeek]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const pct = getPct(e.clientX);
    if (isNearThumb(e.clientX)) {
      startScrub(pct);
    } else {
      longPressTimer.current = window.setTimeout(() => startScrub(pct), LONG_PRESS_MS);
    }
  }, [getPct, isNearThumb, startScrub]);

  useEffect(() => {
    if (!scrubbing) return;
    const onMove = (e: MouseEvent) => {
      if (!scrubbingRef.current) return;
      setScrubPct(getPct(e.clientX));
    };
    const onUp = () => {
      clearTimeout(longPressTimer.current);
      if (scrubbingRef.current) {
        scrubbingRef.current = false;
        setScrubbing(false);
        setScrubPct(prev => {
          if (duration > 0) onSeek((prev / 100) * duration);
          return prev;
        });
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [scrubbing, duration, onSeek, getPct]);

  const onMouseLeave = useCallback(() => {
    if (!scrubbingRef.current) clearTimeout(longPressTimer.current);
  }, []);

  const onClick = useCallback((e: React.MouseEvent) => {
    if (scrubbingRef.current) return;
    const pct = getPct(e.clientX);
    if (duration > 0) onSeek((pct / 100) * duration);
  }, [getPct, duration, onSeek]);

  return (
    <div
      className="player-progress-touch"
      onClick={onClick}
      onMouseDown={onMouseDown}
      onMouseLeave={onMouseLeave}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <div ref={barRef} className={`player-progress-bar ${scrubbing ? 'scrubbing' : ''}`}>
        <div className="player-progress-fill" style={{ width: `${displayPct}%` }} />
        <div className={`player-scrub-thumb ${scrubbing ? 'active' : ''}`} style={{ left: `${displayPct}%` }} />
      </div>
    </div>
  );
}

export function formatTime(s: number): string {
  if (!s || !isFinite(s)) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}
