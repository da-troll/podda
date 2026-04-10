import { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import { EpisodeRow } from '../components/EpisodeRow';
import { ConfirmModal } from '../components/ConfirmModal';
import { ArrowLeft, RefreshCw, Trash2 } from 'lucide-react';
import type { Podcast, Episode, Page } from '../types';

type SortOrder = 'newest' | 'oldest';

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
  const [showUnsubConfirm, setShowUnsubConfirm] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

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

  const sortedEpisodes = useMemo(() => {
    const sorted = [...episodes].sort((a, b) => {
      const da = a.pub_date ? new Date(a.pub_date).getTime() : 0;
      const db = b.pub_date ? new Date(b.pub_date).getTime() : 0;
      return sortOrder === 'newest' ? db - da : da - db;
    });
    return sorted;
  }, [episodes, sortOrder]);

  const handleUnsubscribe = async () => {
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
            <button className="btn-danger" onClick={() => setShowUnsubConfirm(true)}>
              <Trash2 size={14} /> Unsubscribe
            </button>
          </div>
        </div>
      </div>

      <div className="episode-list-header">
        <span>{total} episodes</span>
        <div className="episode-list-header-actions">
          <select
            className="sort-select"
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value as SortOrder)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
          <button className="btn-icon" onClick={handleRefresh} disabled={refreshing} title="Refresh">
            <RefreshCw size={16} className={refreshing ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      <div className="episode-list">
        {sortedEpisodes.map(ep => (
          <EpisodeRow key={ep.id} episode={ep} podcast={podcast} />
        ))}
      </div>

      {showUnsubConfirm && (
        <ConfirmModal
          title="Unsubscribe"
          message={`Unsubscribe from "${podcast.title}"? Your listen progress will be kept.`}
          confirmLabel="Unsubscribe"
          danger
          onConfirm={handleUnsubscribe}
          onCancel={() => setShowUnsubConfirm(false)}
        />
      )}
    </div>
  );
}
