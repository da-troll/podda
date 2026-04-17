import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Play, Pause, SkipBack, SkipForward, Shuffle, ListEnd, Loader2 } from 'lucide-react';
import { usePlayerContext } from '../../hooks/usePlayer';
import { ProgressBar, formatTime } from './ProgressBar';
import { SleepMenu } from './SleepMenu';
import { hapticImpact, hapticSelection } from './haptics';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

interface Props {
  onCollapse: () => void;
}

export function ExpandedPlayer({ onCollapse }: Props) {
  const player = usePlayerContext();

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
      e.preventDefault();
      onCollapse();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('podda:backpressed', onBack);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('podda:backpressed', onBack);
    };
  }, [onCollapse]);

  if (!player.episode) return null;

  const artwork = player.episode.artwork_url || player.episode.podcast_artwork_url || player.podcast?.artwork_url;
  const podcastTitle = player.episode.podcast_title || player.podcast?.title;

  const cycleSpeed = () => {
    const idx = SPEEDS.indexOf(player.speed);
    player.setSpeed(SPEEDS[(idx + 1) % SPEEDS.length]);
    hapticImpact('LIGHT');
  };

  const wrap = (fn: () => void) => () => { hapticSelection(); fn(); };

  return createPortal(
    <div className="expanded-player" role="dialog" aria-modal="true">
      <div className="expanded-player-header">
        <button className="expanded-player-collapse" onClick={onCollapse} aria-label="Collapse player">
          <ChevronDown size={28} />
        </button>
        <div className="expanded-player-header-label">Now Playing</div>
        <div className="expanded-player-header-spacer" />
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
            <SkipBack size={28} />
            <span className="transport-skip-num">15</span>
          </button>
          <button onClick={wrap(player.togglePlay)} className="transport-play" aria-label={player.playing ? 'Pause' : 'Play'}>
            {player.loading ? <Loader2 size={36} className="spin" /> : player.playing ? <Pause size={36} /> : <Play size={36} />}
          </button>
          <button onClick={wrap(player.skipForward)} aria-label="Skip forward 15 seconds" className="transport-skip">
            <SkipForward size={28} />
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
        </div>
      </div>
    </div>,
    document.body
  );
}
