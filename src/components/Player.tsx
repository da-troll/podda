import { useState, useRef, useCallback, useEffect } from 'react';
import { usePlayerContext } from '../hooks/usePlayer';
import { Play, Pause, SkipBack, SkipForward, ListEnd, Shuffle, Loader2 } from 'lucide-react';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];
const LONG_PRESS_MS = 150;

function formatTime(s: number): string {
  if (!s || !isFinite(s)) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function ProgressBar({ position, duration, onSeek }: { position: number; duration: number; onSeek: (t: number) => void }) {
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
    return clamp((clientX - rect.left) / rect.width * 100, 0, 100);
  }, []);

  // --- Touch scrubbing ---
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const pct = getPct(touch.clientX);

    longPressTimer.current = window.setTimeout(() => {
      scrubbingRef.current = true;
      setScrubbing(true);
      setScrubPct(pct);
    }, LONG_PRESS_MS);
  }, [getPct]);

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
      if (duration > 0) onSeek((scrubPct / 100) * duration);
    }
  }, [duration, scrubPct, onSeek]);

  // --- Mouse scrubbing (desktop) ---
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const pct = getPct(e.clientX);

    longPressTimer.current = window.setTimeout(() => {
      scrubbingRef.current = true;
      setScrubbing(true);
      setScrubPct(pct);
    }, LONG_PRESS_MS);
  }, [getPct]);

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
      ref={barRef}
      className={`player-progress-bar ${scrubbing ? 'scrubbing' : ''}`}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onMouseLeave={onMouseLeave}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <div className="player-progress-fill" style={{ width: `${displayPct}%` }} />
      <div className={`player-scrub-thumb ${scrubbing ? 'active' : ''}`} style={{ left: `${displayPct}%` }} />
    </div>
  );
}

export function Player() {
  const player = usePlayerContext();

  const artwork = player.episode?.artwork_url || player.episode?.podcast_artwork_url || player.podcast?.artwork_url;
  const upNext = player.autoPlay && player.queue.length > 0 ? player.queue[0] : null;

  const cycleSpeed = () => {
    const idx = SPEEDS.indexOf(player.speed);
    const next = SPEEDS[(idx + 1) % SPEEDS.length];
    player.setSpeed(next);
  };

  return (
    <>
    <audio ref={player.audioRef} />

    {player.episode && <div className="player">
      <div className="player-top">
        <div className="player-info">
          {artwork && <img src={artwork} alt="" className="player-artwork" />}
          <div className="player-text">
            <div className="player-title">{player.episode.title}</div>
            <div className="player-subtitle">
              {upNext
                ? <span className="player-up-next">Up next: {upNext.title}</span>
                : <span>{player.episode.podcast_title || player.podcast?.title}</span>
              }
            </div>
          </div>
          <button onClick={cycleSpeed} className="player-speed">{player.speed}x</button>
        </div>
      </div>

      <div className="player-scrub-area">
        <ProgressBar position={player.position} duration={player.duration} onSeek={player.seek} />
        <div className="player-times">
          <span>{formatTime(player.position)}</span>
          <span>{formatTime(player.duration)}</span>
        </div>
      </div>

      <div className="player-controls">
        <button
          onClick={player.toggleShuffle}
          className={`player-shuffle-btn ${player.shuffle ? 'active' : ''}`}
          title={player.shuffle ? 'Shuffle on' : 'Shuffle off'}
        >
          <Shuffle size={20} />
        </button>
        <button onClick={player.skipBackward} title="Back 15s" className="player-transport">
          <SkipBack size={22} />
        </button>
        <button onClick={player.togglePlay} className="player-play-btn">
          {player.loading ? <Loader2 size={28} className="spin" /> : player.playing ? <Pause size={28} /> : <Play size={28} />}
        </button>
        <button onClick={player.skipForward} title="Forward 15s" className="player-transport">
          <SkipForward size={22} />
        </button>
        <button
          onClick={player.toggleAutoPlay}
          className={`player-autoplay-btn ${player.autoPlay ? 'active' : ''}`}
          title={player.autoPlay ? 'Auto-play on' : 'Auto-play off'}
        >
          <ListEnd size={20} />
        </button>
      </div>
    </div>}
    </>
  );
}
