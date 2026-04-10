import { Play, Pause, Check } from 'lucide-react';
import { usePlayerContext } from '../hooks/usePlayer';
import type { Episode, Podcast } from '../types';

function formatDuration(secs: number | null): string {
  if (!secs) return '';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

interface EpisodeRowProps {
  episode: Episode;
  podcast?: Podcast | null;
  showPodcast?: boolean;
}

export function EpisodeRow({ episode, podcast, showPodcast }: EpisodeRowProps) {
  const player = usePlayerContext();
  const isPlaying = player.episode?.id === episode.id;
  const completed = episode.listen_completed;
  const progress = episode.listen_position && episode.duration
    ? Math.floor((episode.listen_position / episode.duration) * 100)
    : 0;

  return (
    <div className={`episode-row ${completed ? 'completed' : ''}`}>
      <button
        className="episode-play-btn"
        onClick={() => {
          if (isPlaying) {
            player.togglePlay();
          } else {
            player.play(episode, podcast);
          }
        }}
      >
        {isPlaying && player.playing ? <Pause size={18} /> : <Play size={18} />}
      </button>

      <div className="episode-info">
        <div className="episode-title">{episode.title}</div>
        <div className="episode-meta">
          {showPodcast && episode.podcast_title && (
            <span className="episode-podcast-name">{episode.podcast_title}</span>
          )}
          <span>{formatDate(episode.pub_date)}</span>
          {episode.duration && <span>{formatDuration(episode.duration)}</span>}
          {completed && <Check size={14} className="episode-check" />}
        </div>
        {progress > 0 && !completed && (
          <div className="episode-progress-bar">
            <div className="episode-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}
