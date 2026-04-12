import { useState, useEffect, useRef } from 'react';
import { X, Plus, Check } from 'lucide-react';
import { api } from '../api';
import type { Playlist } from '../types';

interface AddToPlaylistModalProps {
  episodeId: number;
  onClose: () => void;
}

export function AddToPlaylistModal({ episodeId, onClose }: AddToPlaylistModalProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<number | null>(null);
  const [added, setAdded] = useState<Set<number>>(new Set());
  const [newName, setNewName] = useState('');
  const [showNew, setShowNew] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (api.getPlaylists() as Promise<Playlist[]>)
      .then(p => setPlaylists(p.filter(pl => !pl.is_smart)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Scroll modal into view when virtual keyboard opens
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      if (modalRef.current) {
        modalRef.current.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
    };
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, []);

  const handleAdd = async (playlistId: number) => {
    setAdding(playlistId);
    try {
      await api.addToPlaylist(playlistId, [episodeId]);
      setAdded(prev => new Set(prev).add(playlistId));
    } catch (err) {
      console.error('Failed to add to playlist:', err);
    } finally {
      setAdding(null);
    }
  };

  const handleCreateAndAdd = async () => {
    if (!newName.trim()) return;
    try {
      const pl = await api.createPlaylist({ name: newName.trim() }) as Playlist;
      await api.addToPlaylist(pl.id, [episodeId]);
      setPlaylists(prev => [pl, ...prev]);
      setAdded(prev => new Set(prev).add(pl.id));
      setNewName('');
      setShowNew(false);
    } catch (err) {
      console.error('Failed to create playlist:', err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-compact" ref={modalRef} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add to Playlist</h2>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        {loading ? (
          <div className="page-loading" style={{ padding: '20px' }}>Loading...</div>
        ) : (
          <div className="add-to-playlist-list">
            {playlists.length === 0 && !showNew && (
              <p className="hint" style={{ padding: '12px 0' }}>No playlists yet.</p>
            )}
            {playlists.map(pl => (
              <button
                key={pl.id}
                className="add-to-playlist-item"
                onClick={() => !added.has(pl.id) && handleAdd(pl.id)}
                disabled={adding === pl.id || added.has(pl.id)}
              >
                <span>{pl.name}</span>
                {added.has(pl.id) ? <Check size={16} className="episode-check" /> : <Plus size={16} />}
              </button>
            ))}
            {showNew ? (
              <div className="add-to-playlist-new">
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Playlist name..."
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleCreateAndAdd()}
                />
                <button className="btn-primary" onClick={handleCreateAndAdd} disabled={!newName.trim()}>
                  Create
                </button>
              </div>
            ) : (
              <button className="add-to-playlist-item new-playlist-btn" onClick={() => setShowNew(true)}>
                <Plus size={16} /> New Playlist
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
