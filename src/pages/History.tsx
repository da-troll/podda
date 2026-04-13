import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../api';
import { EpisodeRow } from '../components/EpisodeRow';
import type { Episode, QueueSource } from '../types';

type HistoryFilter = 'all' | 'in-progress' | 'completed';

export function History() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(async (f: HistoryFilter, offset = 0) => {
    setLoading(true);
    try {
      const filterParam = f === 'all' ? undefined : f;
      const data = await api.getHistory(50, offset, filterParam) as Episode[];
      if (offset === 0) {
        setEpisodes(data);
      } else {
        setEpisodes(prev => [...prev, ...data]);
      }
      setHasMore(data.length === 50);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(filter);
  }, [filter, load]);

  const queueSource = useMemo<QueueSource>(() => ({
    type: 'history', filter: filter === 'all' ? undefined : filter,
  }), [filter]);

  const handleFilterChange = (f: HistoryFilter) => {
    setFilter(f);
  };

  const handleMarkPlayed = async (episodeId: number) => {
    await api.markPlayed(episodeId);
    setEpisodes(prev => prev.map(ep =>
      ep.id === episodeId ? { ...ep, listen_completed: true } : ep
    ));
  };

  const handleMarkUnplayed = async (episodeId: number) => {
    await api.markUnplayed(episodeId);
    setEpisodes(prev => prev.map(ep =>
      ep.id === episodeId ? { ...ep, listen_completed: false, listen_position: 0 } : ep
    ));
  };

  return (
    <div className="page history">
      <div className="page-header">
        <h1>History</h1>
        <div className="tab-bar">
          <button className={filter === 'all' ? 'active' : ''} onClick={() => handleFilterChange('all')}>
            All
          </button>
          <button className={filter === 'in-progress' ? 'active' : ''} onClick={() => handleFilterChange('in-progress')}>
            In Progress
          </button>
          <button className={filter === 'completed' ? 'active' : ''} onClick={() => handleFilterChange('completed')}>
            Completed
          </button>
        </div>
      </div>

      <div className="episode-list">
        {!loading && episodes.length === 0 && (
          <div className="empty-state">
            <p>{filter === 'all' ? 'No listening history yet. Start playing a podcast!' : `No ${filter} episodes.`}</p>
          </div>
        )}
        {episodes.map((ep, idx) => (
          <EpisodeRow
            key={ep.id}
            episode={ep}
            showPodcast
            queue={episodes.slice(idx + 1)}
            queueSource={queueSource}
            onMarkPlayed={!ep.listen_completed ? () => handleMarkPlayed(ep.id) : undefined}
            onMarkUnplayed={ep.listen_completed ? () => handleMarkUnplayed(ep.id) : undefined}
          />
        ))}
        {loading && <div className="page-loading">Loading...</div>}
        {!loading && hasMore && episodes.length > 0 && (
          <button className="btn-secondary load-more" onClick={() => load(filter, episodes.length)}>
            Load more
          </button>
        )}
      </div>
    </div>
  );
}
