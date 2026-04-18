import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Play, Pause, RotateCcw, RotateCw, Shuffle, ListEnd, Loader2, ListMusic, ChevronRight } from 'lucide-react';
import { usePlayerContext } from '../../hooks/usePlayer';
import { ProgressBar, formatTime } from './ProgressBar';
import { SleepMenu } from './SleepMenu';
import { OverflowMenu } from './OverflowMenu';
import { UpNextPanel } from './UpNextPanel';
import { hapticImpact, hapticSelection } from './haptics';
import type { Page } from '../../types';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];
const SWIPE_DOWN_THRESHOLD_PX = 120;
const SWIPE_DOWN_VELOCITY_PX_MS = 0.5;

interface Props {
  onCollapse: () => void;
  onNavigate: (page: Page) => void;
}

export function ExpandedPlayer({ onCollapse, onNavigate }: Props) {
  const player = usePlayerContext();
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ y: number; t: number } | null>(null);
  const [dragY, setDragY] = useState(0);
  const [queueOpen, setQueueOpen] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCollapse();
    };
    const onBack = (e: Event) => {
      if (queueOpen) return; // UpNextPanel handles its own back press
      e.preventDefault();
      onCollapse();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('podda:backpressed', onBack);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('podda:backpressed', onBack);
    };
  }, [onCollapse, queueOpen]);

  if (!player.episode) return null;

  const artwork = player.episode.artwork_url || player.episode.podcast_artwork_url || player.podcast?.artwork_url;
  const podcastTitle = player.episode.podcast_title || player.podcast?.title;

  const cycleSpeed = () => {
    const idx = SPEEDS.indexOf(player.speed);
    player.setSpeed(SPEEDS[(idx + 1) % SPEEDS.length]);
    hapticImpact('LIGHT');
  };

  const wrap = (fn: () => void) => () => { hapticSelection(); fn(); };

  const onDragStart = (e: React.TouchEvent) => {
    dragStart.current = { y: e.touches[0].clientY, t: performance.now() };
  };

  const onDragMove = (e: React.TouchEvent) => {
    if (!dragStart.current) return;
    const dy = e.touches[0].clientY - dragStart.current.y;
    setDragY(Math.max(0, dy));
  };

  const onDragEnd = () => {
    if (!dragStart.current) return;
    const elapsed = performance.now() - dragStart.current.t;
    const velocity = dragY / Math.max(elapsed, 1);
    const shouldCollapse = dragY > SWIPE_DOWN_THRESHOLD_PX || velocity > SWIPE_DOWN_VELOCITY_PX_MS;
    dragStart.current = null;
    if (shouldCollapse) onCollapse();
    else setDragY(0);
  };

  const transform = dragY > 0 ? `translateY(${dragY}px)` : undefined;
  const transition = dragStart.current ? 'none' : 'transform 0.2s ease-out';

  return createPortal(
    <div
      ref={sheetRef}
      className="expanded-player"
      role="dialog"
      aria-modal="true"
      style={{ transform, transition }}
    >
      <div
        className="expanded-player-header"
        onTouchStart={onDragStart}
        onTouchMove={onDragMove}
        onTouchEnd={onDragEnd}
        onTouchCancel={onDragEnd}
      >
        <button className="expanded-player-collapse" onClick={onCollapse} aria-label="Collapse player">
          <ChevronDown size={28} />
        </button>
        <div className="expanded-player-grip" />
        <button
          className="expanded-player-queue-btn"
          onClick={() => { hapticSelection(); setQueueOpen(true); }}
          aria-label="Up next"
          title="Up next"
        >
          <ListMusic size={22} />
          {player.queue.length > 0 && (
            <span className="expanded-player-queue-badge">{player.queue.length}</span>
          )}
        </button>
      </div>

      <div className="expanded-player-body">
        {artwork && <img src={artwork} alt="" className="expanded-player-artwork" />}
        <div className="expanded-player-meta">
          <div className="expanded-player-title">{player.episode.title}</div>
          {podcastTitle && <div className="expanded-player-podcast">{podcastTitle}</div>}
        </div>

        <div className="expanded-player-scrub">
          <ProgressBar position={player.position} duration={player.duration} onSeek={player.seek} />
          <div className="expanded-player-times">
            <span>{formatTime(player.position)}</span>
            <span>{formatTime(player.duration)}</span>
          </div>
        </div>

        <div className="expanded-player-transport">
          <button onClick={wrap(player.skipBackward)} aria-label="Skip back 15 seconds" className="transport-skip">
            <RotateCcw size={36} strokeWidth={1.75} />
            <span className="transport-skip-num">15</span>
          </button>
          <button onClick={wrap(player.togglePlay)} className="transport-play" aria-label={player.playing ? 'Pause' : 'Play'}>
            {player.loading ? <Loader2 size={36} className="spin" /> : player.playing ? <Pause size={36} /> : <Play size={36} />}
          </button>
          <button onClick={wrap(player.skipForward)} aria-label="Skip forward 15 seconds" className="transport-skip">
            <RotateCw size={36} strokeWidth={1.75} />
            <span className="transport-skip-num">15</span>
          </button>
        </div>

        <div className="expanded-player-secondary">
          <button
            onClick={wrap(player.toggleShuffle)}
            className={`secondary-btn ${player.shuffle ? 'active' : ''}`}
            title={player.shuffle ? 'Shuffle on' : 'Shuffle off'}
            aria-label="Shuffle"
          >
            <Shuffle size={20} />
          </button>
          <button onClick={cycleSpeed} className="secondary-btn secondary-speed" title="Playback speed">
            {player.speed}x
          </button>
          <SleepMenu />
          <button
            onClick={wrap(player.toggleAutoPlay)}
            className={`secondary-btn ${player.autoPlay ? 'active' : ''}`}
            title={player.autoPlay ? 'Auto-play on' : 'Auto-play off'}
            aria-label="Auto-play"
          >
            <ListEnd size={20} />
          </button>
          <OverflowMenu onNavigate={onNavigate} />
        </div>

        {player.queue.length > 0 && (
          <button
            className="expanded-player-upnext-strip"
            onClick={() => { hapticSelection(); setQueueOpen(true); }}
          >
            <div className="upnext-strip-label">Up next</div>
            <div className="upnext-strip-title">{player.queue[0].title}</div>
            <ChevronRight size={18} className="upnext-strip-chevron" />
          </button>
        )}
      </div>

      {queueOpen && <UpNextPanel onClose={() => setQueueOpen(false)} />}
    </div>,
    document.body
  );
}
