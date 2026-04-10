import { useState, useEffect } from 'react';
import { api } from '../api';
import { EpisodeRow } from '../components/EpisodeRow';
import { ArrowLeft, RefreshCw, Trash2 } from 'lucide-react';
import type { Podcast, Episode, Page } from '../types';

interface PodcastDetailProps {
  podcastId: number;
  onNavigate: (page: Page) => void;
}

export function PodcastDetail({ podcastId, onNavigate }: PodcastDetailProps) {
  const [podcast, setPodcast] = useState<Podcast | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = () => {
    Promise.all([
      api.getPodcasts() as Promise<Podcast[]>,
      api.getEpisodes(podcastId, 100) as Promise<{ episodes: Episode[]; total: number }>,
    ]).then(([pods, data]) => {
      setPodcast(pods.find(p => p.id === podcastId) || null);
      setEpisodes(data.episodes);
      setTotal(data.total);
    }).catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, [podcastId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await api.refreshPodcast(podcastId);
      load();
    } catch (err) {
      console.error(err);
    }
    setRefreshing(false);
  };

  const handleUnsubscribe = async () => {
    if (!confirm('Unsubscribe from this podcast?')) return;
    await api.unsubscribe(podcastId);
    onNavigate({ type: 'library' });
  };

  if (loading) return <div className="page-loading">Loading...</div>;
  if (!podcast) return <div className="page-loading">Podcast not found</div>;

  return (
    <div className="page podcast-detail">
      <div className="page-header">
        <button className="btn-icon" onClick={() => onNavigate({ type: 'library' })}>
          <ArrowLeft size={20} />
        </button>
        <h1>{podcast.title}</h1>
      </div>

      <div className="podcast-hero">
        {podcast.artwork_url && (
          <img src={podcast.artwork_url} alt={podcast.title} className="podcast-hero-artwork" />
        )}
        <div className="podcast-hero-info">
          {podcast.author && <div className="podcast-hero-author">{podcast.author}</div>}
          {podcast.description && (
            <p className="podcast-hero-desc">{podcast.description.slice(0, 300)}</p>
          )}
          <div className="podcast-hero-actions">
            <button className="btn-secondary" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw size={14} className={refreshing ? 'spinning' : ''} /> Refresh
            </button>
            <button className="btn-danger" onClick={handleUnsubscribe}>
              <Trash2 size={14} /> Unsubscribe
            </button>
          </div>
        </div>
      </div>

      <div className="episode-list-header">
        <span>{total} episodes</span>
      </div>

      <div className="episode-list">
        {episodes.map(ep => (
          <EpisodeRow key={ep.id} episode={ep} podcast={podcast} />
        ))}
      </div>
    </div>
  );
}
