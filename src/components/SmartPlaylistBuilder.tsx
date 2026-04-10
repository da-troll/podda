import { useState, useEffect } from 'react';
import { api } from '../api';
import type { Podcast, SmartPlaylistRules } from '../types';

interface SmartPlaylistBuilderProps {
  rules: SmartPlaylistRules;
  onChange: (rules: SmartPlaylistRules) => void;
}

const RELEASED_OPTIONS = [
  { value: 'any', label: 'Any time' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '3d', label: 'Last 3 days' },
  { value: '7d', label: 'Last week' },
  { value: '14d', label: 'Last 2 weeks' },
  { value: '30d', label: 'Last month' },
];

const STATUS_OPTIONS = [
  { value: 'any', label: 'Any status' },
  { value: 'unplayed', label: 'Unplayed' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'played', label: 'Played' },
];

const DURATION_PRESETS = [
  { value: '', label: 'No limit' },
  { value: '900', label: '15 min' },
  { value: '1800', label: '30 min' },
  { value: '3600', label: '1 hour' },
  { value: '7200', label: '2 hours' },
];

export function SmartPlaylistBuilder({ rules, onChange }: SmartPlaylistBuilderProps) {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);

  useEffect(() => {
    (api.getPodcasts() as Promise<Podcast[]>)
      .then(setPodcasts)
      .catch(console.error);
  }, []);

  const update = (partial: Partial<SmartPlaylistRules>) => {
    onChange({ ...rules, ...partial });
  };

  const togglePodcast = (id: number, list: 'podcasts' | 'exclude_podcasts') => {
    const current = rules[list] || [];
    const next = current.includes(id)
      ? current.filter(x => x !== id)
      : [...current, id];
    update({ [list]: next.length > 0 ? next : null });
  };

  const includeMode = (rules.podcasts && rules.podcasts.length > 0) ? 'include'
    : (rules.exclude_podcasts && rules.exclude_podcasts.length > 0) ? 'exclude'
    : 'all';

  const handleModeChange = (mode: string) => {
    if (mode === 'all') {
      update({ podcasts: null, exclude_podcasts: null });
    } else if (mode === 'include') {
      update({ podcasts: [], exclude_podcasts: null });
    } else {
      update({ podcasts: null, exclude_podcasts: [] });
    }
  };

  return (
    <div className="smart-builder">
      <div className="smart-builder-section">
        <label>
          <span>Episode Status</span>
          <select
            value={rules.status || 'any'}
            onChange={e => update({ status: e.target.value as SmartPlaylistRules['status'] })}
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="smart-builder-section">
        <label>
          <span>Released</span>
          <select
            value={rules.released_after || 'any'}
            onChange={e => update({ released_after: e.target.value as SmartPlaylistRules['released_after'] })}
          >
            {RELEASED_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="smart-builder-section">
        <span className="smart-builder-label">Duration</span>
        <div className="smart-builder-row">
          <label className="smart-builder-half">
            <span>Min</span>
            <select
              value={rules.duration_min?.toString() || ''}
              onChange={e => update({ duration_min: e.target.value ? parseInt(e.target.value) : null })}
            >
              {DURATION_PRESETS.map(o => (
                <option key={`min-${o.value}`} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="smart-builder-half">
            <span>Max</span>
            <select
              value={rules.duration_max?.toString() || ''}
              onChange={e => update({ duration_max: e.target.value ? parseInt(e.target.value) : null })}
            >
              {DURATION_PRESETS.map(o => (
                <option key={`max-${o.value}`} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="smart-builder-section">
        <span className="smart-builder-label">Podcasts</span>
        <div className="smart-builder-mode">
          {['all', 'include', 'exclude'].map(mode => (
            <button
              key={mode}
              className={`smart-mode-btn ${includeMode === mode ? 'active' : ''}`}
              onClick={() => handleModeChange(mode)}
            >
              {mode === 'all' ? 'All subscribed' : mode === 'include' ? 'Only these' : 'All except'}
            </button>
          ))}
        </div>
        {includeMode !== 'all' && podcasts.length > 0 && (
          <div className="smart-podcast-list">
            {podcasts.map(p => {
              const list = includeMode === 'include' ? 'podcasts' : 'exclude_podcasts';
              const selected = (rules[list] || []).includes(p.id);
              return (
                <button
                  key={p.id}
                  className={`smart-podcast-chip ${selected ? 'selected' : ''}`}
                  onClick={() => togglePodcast(p.id, list)}
                >
                  {p.artwork_url && <img src={p.artwork_url} alt="" className="smart-podcast-chip-art" />}
                  <span>{p.title}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** Human-readable summary of active filters */
export function filterSummary(rules: SmartPlaylistRules): string[] {
  const parts: string[] = [];

  if (rules.status && rules.status !== 'any') {
    const labels: Record<string, string> = { unplayed: 'Unplayed', 'in-progress': 'In progress', played: 'Played' };
    parts.push(labels[rules.status] || rules.status);
  }

  if (rules.released_after && rules.released_after !== 'any') {
    const labels: Record<string, string> = { '24h': 'Last 24h', '3d': 'Last 3 days', '7d': 'Last week', '14d': 'Last 2 weeks', '30d': 'Last month' };
    parts.push(labels[rules.released_after] || rules.released_after);
  }

  if (rules.duration_min != null || rules.duration_max != null) {
    const fmt = (s: number) => s >= 3600 ? `${s / 3600}h` : `${s / 60}m`;
    if (rules.duration_min != null && rules.duration_max != null) {
      parts.push(`${fmt(rules.duration_min)}–${fmt(rules.duration_max)}`);
    } else if (rules.duration_min != null) {
      parts.push(`>${fmt(rules.duration_min)}`);
    } else if (rules.duration_max != null) {
      parts.push(`<${fmt(rules.duration_max)}`);
    }
  }

  if (rules.podcasts && rules.podcasts.length > 0) {
    parts.push(`${rules.podcasts.length} podcast${rules.podcasts.length > 1 ? 's' : ''}`);
  }
  if (rules.exclude_podcasts && rules.exclude_podcasts.length > 0) {
    parts.push(`Excluding ${rules.exclude_podcasts.length}`);
  }

  return parts.length > 0 ? parts : ['All subscribed episodes'];
}
