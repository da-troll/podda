import { usePlayerContext } from '../hooks/usePlayer';
import { Play, Pause, SkipBack, SkipForward, ListEnd, Shuffle } from 'lucide-react';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

function formatTime(s: number): string {
  if (!s || !isFinite(s)) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function Player() {
  const player = usePlayerContext();

  const artwork = player.episode?.artwork_url || player.episode?.podcast_artwork_url || player.podcast?.artwork_url;
  const progress = player.duration > 0 ? (player.position / player.duration) * 100 : 0;
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
      <div
        className="player-progress-bar"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const pct = (e.clientX - rect.left) / rect.width;
          player.seek(pct * player.duration);
        }}
      >
        <div className="player-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="player-content">
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
          <span className="player-time">
            {formatTime(player.position)} / {formatTime(player.duration)}
          </span>
          <button onClick={cycleSpeed} className="player-speed">{player.speed}x</button>
        </div>

        <div className="player-controls">
          <button className="player-shuffle-btn" title="Shuffle">
            <Shuffle size={20} />
          </button>
          <button onClick={player.skipBackward} title="Back 15s" className="player-transport">
            <SkipBack size={22} />
          </button>
          <button onClick={player.togglePlay} className="player-play-btn">
            {player.playing ? <Pause size={28} /> : <Play size={28} />}
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
      </div>
    </div>}
    </>
  );
}
