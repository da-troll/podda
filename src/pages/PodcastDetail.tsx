import { useState, useEffect, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { api } from '../api';
import { EpisodeRow } from '../components/EpisodeRow';
import { ConfirmModal } from '../components/ConfirmModal';
import { ArrowLeft, RefreshCw, Trash2, Plus, Loader } from 'lucide-react';
import type { Podcast, Episode, Page, QueueSource } from '../types';

const PAGE_SIZE = 50;

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
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [showUnsubConfirm, setShowUnsubConfirm] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

  const load = () => {
    Promise.all([
      api.getPodcast(podcastId) as Promise<Podcast>,
      api.getEpisodes(podcastId, PAGE_SIZE, 0) as Promise<{ episodes: Episode[]; total: number }>,
    ]).then(([pod, data]) => {
      setPodcast(pod);
      setEpisodes(data.episodes);
      setTotal(data.total);
    }).catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, [podcastId]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const data = await api.getEpisodes(podcastId, PAGE_SIZE, episodes.length) as { episodes: Episode[]; total: number };
      setEpisodes(prev => [...prev, ...data.episodes]);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  };

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

  const handleSubscribe = async () => {
    if (!podcast) return;
    setSubscribing(true);
    try {
      await api.subscribe(podcast.feed_url);
      setPodcast(prev => prev ? { ...prev, is_subscribed: true } : prev);
    } catch (err) {
      console.error(err);
    }
    setSubscribing(false);
  };

  const handleUnsubscribe = async () => {
    await api.unsubscribe(podcastId);
    onNavigate({ type: 'library' });
  };

  const sortedEpisodes = useMemo(() => {
    const sorted = [...episodes].sort((a, b) => {
      const da = a.pub_date ? new Date(a.pub_date).getTime() : 0;
      const db = b.pub_date ? new Date(b.pub_date).getTime() : 0;
      return sortOrder === 'newest' ? db - da : da - db;
    });
    return sorted;
  }, [episodes, sortOrder]);

  const queueSource = useMemo<QueueSource>(() => ({
    type: 'podcast', podcastId, sortOrder,
  }), [podcastId, sortOrder]);

  const hasMore = episodes.length < total;

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
            <div
              className="podcast-hero-desc"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(podcast.description) }}
            />
          )}
          <div className="podcast-hero-actions">
            {podcast.is_subscribed ? (
              <button className="btn-danger" onClick={() => setShowUnsubConfirm(true)}>
                <Trash2 size={14} /> Unsubscribe
              </button>
            ) : (
              <button className="btn-primary" onClick={handleSubscribe} disabled={subscribing}>
                {subscribing ? <><Loader size={14} className="spinning" /> Subscribing…</> : <><Plus size={14} /> Subscribe</>}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="episode-list-header">
        <span>{episodes.length < total ? `${episodes.length} of ${total} episodes` : `${total} episodes`}</span>
        <div className="episode-list-header-actions">
          <select
            className="sort-select"
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value as SortOrder)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
          {podcast.is_subscribed && (
            <button className="btn-icon" onClick={handleRefresh} disabled={refreshing} title="Refresh">
              <RefreshCw size={16} className={refreshing ? 'spinning' : ''} />
            </button>
          )}
        </div>
      </div>

      <div className="episode-list">
        {sortedEpisodes.map((ep, idx) => (
          <EpisodeRow
            key={ep.id}
            episode={ep}
            podcast={podcast}
            queue={sortedEpisodes.slice(idx + 1)}
            queueSource={queueSource}
          />
        ))}
      </div>

      {hasMore && (
        <div className="load-more-container">
          <button className="btn-secondary" onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading…' : `Load more (${total - episodes.length} remaining)`}
          </button>
        </div>
      )}

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
