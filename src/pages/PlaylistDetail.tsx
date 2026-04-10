import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api';
import { EpisodeRow } from '../components/EpisodeRow';
import { ArrowLeft, Play, Trash2, GripVertical, SkipForward, ListEnd, Settings2 } from 'lucide-react';
import type { Playlist, Episode, Page } from '../types';

interface PlaylistDetailProps {
  playlistId: number;
  onNavigate: (page: Page) => void;
}

const SORT_LABELS: Record<string, string> = {
  manual: 'Manual order',
  newest: 'Newest first',
  oldest: 'Oldest first',
  shortest: 'Shortest first',
  longest: 'Longest first',
};

export function PlaylistDetail({ playlistId, onNavigate }: PlaylistDetailProps) {
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editSort, setEditSort] = useState('manual');
  const [editAutoRemove, setEditAutoRemove] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const dragItem = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.getPlaylistEpisodes(playlistId) as { playlist: Playlist; episodes: Episode[] };
      setPlaylist(data.playlist);
      setEpisodes(data.episodes);
      setEditName(data.playlist.name);
      setEditSort(data.playlist.sort_order);
      setEditAutoRemove(data.playlist.auto_remove_completed);
    } catch (err) {
      console.error('Failed to load playlist:', err);
    } finally {
      setLoading(false);
    }
  }, [playlistId]);

  useEffect(() => { load(); }, [load]);

  const handleRemove = async (episodeId: number) => {
    await api.removeFromPlaylist(playlistId, episodeId);
    setEpisodes(prev => prev.filter(ep => ep.id !== episodeId));
  };

  const handleQueuePlaylist = async (mode: 'next' | 'last') => {
    try {
      const result = await api.queuePlaylist(playlistId, mode) as { ok: boolean; added: number };
      if (result.added > 0) {
        // Visual feedback could go here
      }
    } catch (err) {
      console.error('Failed to queue playlist:', err);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${playlist?.name}"? This cannot be undone.`)) return;
    await api.deletePlaylist(playlistId);
    onNavigate({ type: 'playlists' });
  };

  const handleSaveSettings = async () => {
    try {
      const updated = await api.updatePlaylist(playlistId, {
        name: editName,
        sort_order: editSort,
        auto_remove_completed: editAutoRemove,
      }) as Playlist;
      setPlaylist(updated);
      setShowSettings(false);
      // Reload episodes if sort changed
      if (updated.sort_order !== playlist?.sort_order || updated.auto_remove_completed !== playlist?.auto_remove_completed) {
        load();
      }
    } catch (err) {
      console.error('Failed to update playlist:', err);
    }
  };

  // Drag reorder (manual playlists only)
  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOver.current = index;
  };

  const handleDragEnd = async () => {
    if (dragItem.current === null || dragOver.current === null || dragItem.current === dragOver.current) {
      dragItem.current = null;
      dragOver.current = null;
      return;
    }

    const reordered = [...episodes];
    const [removed] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOver.current, 0, removed);
    setEpisodes(reordered);

    dragItem.current = null;
    dragOver.current = null;

    // Persist new order
    try {
      await api.reorderPlaylist(playlistId, reordered.map(ep => ep.id));
    } catch (err) {
      console.error('Failed to save reorder:', err);
      load(); // reload on failure
    }
  };

  if (loading) return <div className="page-loading">Loading...</div>;
  if (!playlist) return <div className="empty-state">Playlist not found.</div>;

  const isManual = !playlist.is_smart && playlist.sort_order === 'manual';

  return (
    <div className="page playlist-detail">
      <div className="playlist-detail-header">
        <button className="btn-icon" onClick={() => onNavigate({ type: 'playlists' })}>
          <ArrowLeft size={20} />
        </button>
        <div className="playlist-detail-info">
          <h1>{playlist.name}</h1>
          <div className="playlist-detail-meta">
            {episodes.length} episodes · {SORT_LABELS[playlist.sort_order]}
            {playlist.auto_remove_completed && ' · Auto-hide completed'}
          </div>
        </div>
        <button className="btn-icon" onClick={() => setShowSettings(!showSettings)}>
          <Settings2 size={18} />
        </button>
      </div>

      {showSettings && (
        <div className="playlist-settings">
          <label>
            <span>Name</span>
            <input type="text" value={editName} onChange={e => setEditName(e.target.value)} />
          </label>
          <label>
            <span>Sort Order</span>
            <select value={editSort} onChange={e => setEditSort(e.target.value)}>
              <option value="manual">Manual (drag to reorder)</option>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="shortest">Shortest first</option>
              <option value="longest">Longest first</option>
            </select>
          </label>
          <label className="checkbox-label">
            <input type="checkbox" checked={editAutoRemove} onChange={e => setEditAutoRemove(e.target.checked)} />
            <span>Auto-hide completed episodes</span>
          </label>
          <div className="playlist-settings-actions">
            <button className="btn-primary" onClick={handleSaveSettings}>Save</button>
            <button className="btn-danger" onClick={handleDelete}>
              <Trash2 size={14} /> Delete Playlist
            </button>
          </div>
        </div>
      )}

      {episodes.length > 0 && (
        <div className="playlist-actions">
          <button className="btn-secondary" onClick={() => handleQueuePlaylist('next')}>
            <SkipForward size={14} /> Play Next
          </button>
          <button className="btn-secondary" onClick={() => handleQueuePlaylist('last')}>
            <ListEnd size={14} /> Play Last
          </button>
        </div>
      )}

      <div className="episode-list">
        {episodes.length === 0 ? (
          <div className="empty-state">
            <p>This playlist is empty. Add episodes from any podcast or episode list.</p>
          </div>
        ) : (
          episodes.map((ep, index) => (
            <div
              key={ep.id}
              className="playlist-episode-row"
              draggable={isManual}
              onDragStart={() => handleDragStart(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragEnd={handleDragEnd}
              onDragOver={e => e.preventDefault()}
            >
              {isManual && (
                <div className="drag-handle">
                  <GripVertical size={16} />
                </div>
              )}
              <div className="playlist-episode-content">
                <EpisodeRow
                  episode={ep}
                  showPodcast
                  onMarkPlayed={!ep.listen_completed ? async () => {
                    await api.markPlayed(ep.id);
                    load();
                  } : undefined}
                  onMarkUnplayed={ep.listen_completed ? async () => {
                    await api.markUnplayed(ep.id);
                    load();
                  } : undefined}
                  onRemoveFromPlaylist={() => handleRemove(ep.id)}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
