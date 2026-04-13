import { useState, useEffect, useRef } from 'react';
import { EyeOff, ListPlus } from 'lucide-react';
import { api } from '../api';
import { EpisodeRow } from '../components/EpisodeRow';
import { AddToPlaylistModal } from '../components/AddToPlaylistModal';
import type { Podcast, Episode, Page, QueueSource } from '../types';

const CL_DISMISSED_KEY = 'podda:cl-dismissed-id';

interface LibraryProps {
  onNavigate: (page: Page) => void;
}

function ContinueListening({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const episodesRef = useRef<Episode[]>([]);

  useEffect(() => {
    (api.getInProgress() as Promise<Episode[]>)
      .then(eps => {
        setEpisodes(eps);
        episodesRef.current = eps;
        if (eps.length > 0) {
          const dismissedId = localStorage.getItem(CL_DISMISSED_KEY);
          if (dismissedId === String(eps[0].id)) setDismissed(true);
        }
      })
      .catch(console.error);
  }, []);

  // When the player is closed, restore CL if it was showing that episode
  useEffect(() => {
    const onPlayerClosed = (e: Event) => {
      const { episodeId } = (e as CustomEvent).detail;
      const ep = episodesRef.current[0];
      if (ep && ep.id === episodeId) {
        localStorage.removeItem(CL_DISMISSED_KEY);
        setDismissed(false);
      }
    };
    window.addEventListener('podda:player-closed', onPlayerClosed);
    return () => window.removeEventListener('podda:player-closed', onPlayerClosed);
  }, []);

  if (episodes.length === 0 || dismissed) return null;

  const ep = episodes[0];

  return (
    <div className="continue-listening">
      <div className="section-header">
        <h2 className="section-title">Continue Listening</h2>
        <button className="section-link" onClick={() => onNavigate({ type: 'history' })}>See more</button>
      </div>
      <div className="continue-listening-list">
        <div className="continue-listening-card">
          <EpisodeRow
            episode={ep}
            showPodcast
            showTimeRemaining
            hideActions
            queue={episodes.slice(1)}
            queueSource={{ type: 'continue' }}
            onPlay={() => {
              localStorage.setItem(CL_DISMISSED_KEY, String(ep.id));
              setDismissed(true);
            }}
          />
          <div className="cl-actions">
            <button
              className="cl-action-btn"
              title="Add to playlist"
              onClick={() => setShowPlaylistModal(true)}
            >
              <ListPlus size={18} />
            </button>
            <button
              className="cl-action-btn"
              title="Dismiss"
              onClick={() => {
                localStorage.setItem(CL_DISMISSED_KEY, String(ep.id));
                setDismissed(true);
              }}
            >
              <EyeOff size={18} />
            </button>
          </div>
        </div>
      </div>
      {showPlaylistModal && (
        <AddToPlaylistModal
          episodeId={ep.id}
          onClose={() => setShowPlaylistModal(false)}
        />
      )}
    </div>
  );
}

export function Library({ onNavigate }: LibraryProps) {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [recent, setRecent] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'podcasts' | 'recent'>('podcasts');

  useEffect(() => {
    Promise.all([
      api.getPodcasts() as Promise<Podcast[]>,
      api.getRecentEpisodes(30) as Promise<Episode[]>,
    ]).then(([p, r]) => {
      setPodcasts(p);
      setRecent(r);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="page library">
      <ContinueListening onNavigate={onNavigate} />

      <div className="page-header">
        <h1>Library</h1>
        <div className="tab-bar">
          <button className={view === 'podcasts' ? 'active' : ''} onClick={() => setView('podcasts')}>
            Podcasts ({podcasts.length})
          </button>
          <button className={view === 'recent' ? 'active' : ''} onClick={() => setView('recent')}>
            Recent
          </button>
        </div>
      </div>

      {view === 'podcasts' ? (
        podcasts.length === 0 ? (
          <div className="empty-state">
            <p>No subscriptions yet.</p>
            <button className="btn-primary" onClick={() => onNavigate({ type: 'discover' })}>
              Discover Podcasts
            </button>
          </div>
        ) : (
          <div className="podcast-grid">
            {podcasts.map(p => (
              <button
                key={p.id}
                className="podcast-card"
                onClick={() => onNavigate({ type: 'podcast', id: p.id })}
              >
                <div className="podcast-card-artwork">
                  {p.artwork_url ? (
                    <img src={p.artwork_url} alt={p.title} loading="lazy" />
                  ) : (
                    <div className="podcast-card-placeholder" />
                  )}
                </div>
                <div className="podcast-card-title">{p.title}</div>
                {p.author && <div className="podcast-card-author">{p.author}</div>}
                {p.episode_count != null && (
                  <div className="podcast-card-count">
                    {(p.episode_count - (p.completed_count || 0))} new · {p.episode_count} total
                  </div>
                )}
              </button>
            ))}
          </div>
        )
      ) : (
        <div className="episode-list">
          {recent.length === 0 ? (
            <div className="empty-state"><p>No recent episodes.</p></div>
          ) : (
            recent.map((ep, idx) => (
              <EpisodeRow key={ep.id} episode={ep} showPodcast queue={recent.slice(idx + 1)} queueSource={{ type: 'recent' }} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
