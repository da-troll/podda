import { useState } from 'react';
import { X } from 'lucide-react';

interface CreatePlaylistModalProps {
  onClose: () => void;
  onCreate: (name: string, sortOrder: string, autoRemove: boolean) => void;
}

export function CreatePlaylistModal({ onClose, onCreate }: CreatePlaylistModalProps) {
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState('manual');
  const [autoRemove, setAutoRemove] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), sortOrder, autoRemove);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Playlist</h2>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <label>
            <span>Name</span>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Road Trip, Favorites..."
              autoFocus
            />
          </label>
          <label>
            <span>Sort Order</span>
            <select value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
              <option value="manual">Manual (drag to reorder)</option>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="shortest">Shortest first</option>
              <option value="longest">Longest first</option>
            </select>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={autoRemove}
              onChange={e => setAutoRemove(e.target.checked)}
            />
            <span>Auto-hide completed episodes</span>
          </label>
          <button type="submit" className="btn-primary" disabled={!name.trim()}>
            Create Playlist
          </button>
        </form>
      </div>
    </div>
  );
}
