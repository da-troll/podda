import { useState, useEffect } from 'react';
import { api } from '../api';
import { EpisodeRow } from '../components/EpisodeRow';
import type { Podcast, Episode, Page } from '../types';

interface LibraryProps {
  onNavigate: (page: Page) => void;
}

function ContinueListening() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);

  useEffect(() => {
    (api.getInProgress() as Promise<Episode[]>)
      .then(setEpisodes)
      .catch(console.error);
  }, []);

  if (episodes.length === 0) return null;

  return (
    <div className="continue-listening">
      <h2 className="section-title">Continue Listening</h2>
      <div className="continue-listening-list">
        {episodes.slice(0, 5).map(ep => (
          <EpisodeRow key={ep.id} episode={ep} showPodcast showTimeRemaining />
        ))}
      </div>
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
      <ContinueListening />

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
            recent.map(ep => (
              <EpisodeRow key={ep.id} episode={ep} showPodcast />
            ))
          )}
        </div>
      )}
    </div>
  );
}
