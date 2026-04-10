import { useState } from 'react';
import { X } from 'lucide-react';
import { SmartPlaylistBuilder } from './SmartPlaylistBuilder';
import type { SmartPlaylistRules } from '../types';

interface CreatePlaylistModalProps {
  onClose: () => void;
  onCreate: (data: { name: string; is_smart: boolean; rules?: SmartPlaylistRules; sort_order: string; auto_remove_completed: boolean }) => void;
}

const DEFAULT_RULES: SmartPlaylistRules = {
  status: 'unplayed',
  released_after: '7d',
  duration_min: null,
  duration_max: null,
  podcasts: null,
  exclude_podcasts: null,
};

export function CreatePlaylistModal({ onClose, onCreate }: CreatePlaylistModalProps) {
  const [name, setName] = useState('');
  const [isSmart, setIsSmart] = useState(false);
  const [sortOrder, setSortOrder] = useState('manual');
  const [autoRemove, setAutoRemove] = useState(true);
  const [rules, setRules] = useState<SmartPlaylistRules>(DEFAULT_RULES);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({
      name: name.trim(),
      is_smart: isSmart,
      rules: isSmart ? rules : undefined,
      sort_order: isSmart ? (sortOrder === 'manual' ? 'newest' : sortOrder) : sortOrder,
      auto_remove_completed: autoRemove,
    });
  };

  const handleSmartToggle = (smart: boolean) => {
    setIsSmart(smart);
    if (smart && sortOrder === 'manual') {
      setSortOrder('newest');
    } else if (!smart) {
      setSortOrder('manual');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Playlist</h2>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <label>
              <span>Name</span>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={isSmart ? 'e.g. Quick Listens, Catch Up...' : 'e.g. Road Trip, Favorites...'}
                autoFocus
              />
            </label>

            <div className="playlist-type-toggle">
              <button type="button" className={`type-btn ${!isSmart ? 'active' : ''}`} onClick={() => handleSmartToggle(false)}>
                Manual
              </button>
              <button type="button" className={`type-btn ${isSmart ? 'active' : ''}`} onClick={() => handleSmartToggle(true)}>
                Smart
              </button>
            </div>

            {isSmart ? (
              <SmartPlaylistBuilder rules={rules} onChange={setRules} />
            ) : null}

            <label>
              <span>Sort Order</span>
              <select value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
                {!isSmart && <option value="manual">Manual (drag to reorder)</option>}
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
          </div>
          <div className="modal-footer">
            <button type="submit" className="btn-primary" disabled={!name.trim()}>
              Create Playlist
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
