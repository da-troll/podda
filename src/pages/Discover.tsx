import { useState } from 'react';
import { api } from '../api';
import { Search, Plus, Check, Loader } from 'lucide-react';
import type { SearchResult } from '../types';

export function Discover() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length < 2) return;

    setSearching(true);
    setError('');
    try {
      const data = await api.search(query) as SearchResult[];
      setResults(data);
    } catch (err: any) {
      setError(err.message);
    }
    setSearching(false);
  };

  const handleSubscribe = async (feedUrl: string) => {
    setSubscribing(feedUrl);
    try {
      await api.subscribe(feedUrl);
      setSubscribed(prev => new Set(prev).add(feedUrl));
    } catch (err: any) {
      setError(`Failed to subscribe: ${err.message}`);
    }
    setSubscribing(null);
  };

  const isUrl = query.trim().startsWith('http');

  return (
    <div className="page discover">
      <div className="page-header">
        <h1>Discover</h1>
        <button
          className="btn-primary"
          disabled={!isUrl || subscribing !== null}
          onClick={() => { if (isUrl) handleSubscribe(query.trim()); }}
        >
          <Plus size={16} /> Subscribe by URL
        </button>
      </div>

      <form className="search-form" onSubmit={handleSearch}>
        <div className="search-input-wrapper">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search podcasts or paste an RSS feed URL…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        <button type="submit" className="btn-primary" disabled={searching || isUrl}>
          {searching ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error && <div className="error-msg">{error}</div>}

      <div className="search-results">
        {results.map(r => (
          <div key={r.feedUrl} className="search-result-card">
            {r.artworkUrl && <img src={r.artworkUrl} alt="" className="search-result-artwork" loading="lazy" />}
            <div className="search-result-info">
              <div className="search-result-name">{r.name}</div>
              <div className="search-result-artist">{r.artist}</div>
              {r.genre && <div className="search-result-genre">{r.genre} · {r.trackCount} episodes</div>}
            </div>
            <button
              className={`btn-subscribe ${subscribed.has(r.feedUrl) ? 'subscribed' : ''}`}
              onClick={() => handleSubscribe(r.feedUrl)}
              disabled={subscribed.has(r.feedUrl) || subscribing === r.feedUrl}
            >
              {subscribed.has(r.feedUrl) ? (
                <><Check size={14} /> Added</>
              ) : subscribing === r.feedUrl ? (
                <><Loader size={14} className="spinning" /> Adding…</>
              ) : (
                <><Plus size={14} /> Subscribe</>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
