import { useState, useEffect } from 'react';
import { api } from '../api';
import { CreatePlaylistModal } from '../components/CreatePlaylistModal';
import { Plus, ListMusic, Zap } from 'lucide-react';
import type { Playlist, SmartPlaylistRules, Page } from '../types';

function formatDuration(secs: number): string {
  if (!secs) return '';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

interface PlaylistsProps {
  onNavigate: (page: Page) => void;
}

export function Playlists({ onNavigate }: PlaylistsProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    (api.getPlaylists() as Promise<Playlist[]>)
      .then(setPlaylists)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (data: { name: string; is_smart: boolean; rules?: SmartPlaylistRules; sort_order: string; auto_remove_completed: boolean }) => {
    try {
      const pl = await api.createPlaylist({
        name: data.name,
        is_smart: data.is_smart,
        rules: data.rules,
        sort_order: data.sort_order,
        auto_remove_completed: data.auto_remove_completed,
      }) as Playlist;
      setPlaylists(prev => [pl, ...prev]);
      setShowCreate(false);
      onNavigate({ type: 'playlist', id: pl.id });
    } catch (err) {
      console.error('Failed to create playlist:', err);
    }
  };

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="page playlists">
      <div className="page-header">
        <h1>Playlists</h1>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New
        </button>
      </div>

      {playlists.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-card">
            <div className="empty-state-icon-wrap">
              <ListMusic size={36} />
            </div>
            <p>No playlists yet. Create one to organize your episodes.</p>
            <button className="btn-primary" onClick={() => setShowCreate(true)}>
              Create Playlist
            </button>
          </div>
        </div>
      ) : (
        <div className="playlist-grid">
          {playlists.map(pl => (
            <button
              key={pl.id}
              className="playlist-card"
              onClick={() => onNavigate({ type: 'playlist', id: pl.id })}
            >
              <div className="playlist-card-icon">
                {pl.is_smart ? <Zap size={24} /> : <ListMusic size={24} />}
              </div>
              <div className="playlist-card-info">
                <div className="playlist-card-name">{pl.name}</div>
                <div className="playlist-card-meta">
                  {pl.episode_count ?? 0} episodes
                  {pl.total_duration ? ` · ${formatDuration(pl.total_duration)}` : ''}
                  {pl.is_smart && <span className="smart-badge">Smart</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {showCreate && (
        <CreatePlaylistModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
