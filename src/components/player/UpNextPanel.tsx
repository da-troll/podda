import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Play } from 'lucide-react';
import { usePlayerContext } from '../../hooks/usePlayer';
import { api } from '../../api';
import { hapticSelection } from './haptics';

interface Props {
  onClose: () => void;
}

function sourceLabel(src: ReturnType<typeof usePlayerContext>['queueSource'], podcastTitle?: string, playlistName?: string): string {
  if (!src) return 'Up next';
  switch (src.type) {
    case 'podcast': return podcastTitle ? `From ${podcastTitle}` : 'From podcast';
    case 'playlist': return playlistName ? `From ${playlistName}` : 'From playlist';
    case 'recent': return 'From recent episodes';
    case 'history': return 'From listening history';
    case 'continue': return 'Continue listening';
    default: return 'Up next';
  }
}

function fmtDuration(secs: number | null | undefined): string {
  if (!secs || secs <= 0) return '';
  const m = Math.floor(secs / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
}

export function UpNextPanel({ onClose }: Props) {
  const player = usePlayerContext();
  const [playlistName, setPlaylistName] = useState<string | undefined>();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const src = player.queueSource;
    if (src?.type !== 'playlist') return;
    let cancelled = false;
    (async () => {
      try {
        const data = await api.getPlaylistEpisodes(src.playlistId) as { playlist?: { name?: string } };
        if (!cancelled) setPlaylistName(data.playlist?.name);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [player.queueSource]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onBack = (e: Event) => { e.preventDefault(); onClose(); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('podda:backpressed', onBack);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('podda:backpressed', onBack);
    };
  }, [onClose]);

  const label = sourceLabel(player.queueSource, player.podcast?.title, playlistName);
  const queue = player.queue;

  return createPortal(
    <div className="up-next-panel" role="dialog" aria-modal="true" aria-label="Up next">
      <div className="up-next-backdrop" onClick={onClose} />
      <div className="up-next-sheet">
        <div className="up-next-header">
          <div className="up-next-header-text">
            <div className="up-next-title">Up next</div>
            <div className="up-next-source">{label}</div>
          </div>
          <button className="up-next-close" onClick={onClose} aria-label="Close">
            <X size={22} />
          </button>
        </div>

        {queue.length === 0 ? (
          <div className="up-next-empty">No more episodes in this queue.</div>
        ) : (
          <ul className="up-next-list">
            {queue.map((ep, i) => {
              const art = ep.artwork_url || ep.podcast_artwork_url;
              return (
                <li key={ep.id} className="up-next-item">
                  <button
                    className="up-next-item-btn"
                    onClick={() => { hapticSelection(); player.playFromQueue(i); onClose(); }}
                  >
                    {art
                      ? <img src={art} alt="" className="up-next-art" />
                      : <div className="up-next-art up-next-art-fallback" />}
                    <div className="up-next-meta">
                      <div className="up-next-ep-title">{ep.title}</div>
                      <div className="up-next-ep-sub">
                        {ep.podcast_title && <span>{ep.podcast_title}</span>}
                        {ep.duration ? <span> · {fmtDuration(ep.duration)}</span> : null}
                      </div>
                    </div>
                    <div className="up-next-play" aria-hidden>
                      <Play size={16} />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>,
    document.body
  );
}
