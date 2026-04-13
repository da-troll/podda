import { useState } from 'react';
import { api } from '../api';
import { Search, Plus, Check, Loader, X, Link } from 'lucide-react';
import type { SearchResult, Page } from '../types';

interface DiscoverProps {
  onNavigate: (page: Page) => void;
}

export function Discover({ onNavigate }: DiscoverProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState<Set<string>>(new Set());
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    (document.activeElement as HTMLElement)?.blur();
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

  const handleCardClick = async (feedUrl: string) => {
    if (opening) return;
    setOpening(feedUrl);
    try {
      const data = await api.fetchPodcast(feedUrl) as { id: number };
      onNavigate({ type: 'podcast', id: data.id });
    } catch (err: any) {
      setError(`Could not open podcast: ${err.message}`);
    }
    setOpening(null);
  };

  const handleSubscribe = async (feedUrl: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSubscribing(feedUrl);
    try {
      await api.subscribe(feedUrl);
      setSubscribed(prev => new Set(prev).add(feedUrl));
    } catch (err: any) {
      setError(`Failed to subscribe: ${err.message}`);
    }
    setSubscribing(null);
  };

  const handleUrlSubscribe = async () => {
    const url = urlInput.trim();
    if (!url.startsWith('http')) {
      setUrlError('Please enter a valid URL starting with http:// or https://');
      return;
    }
    setUrlError('');
    setSubscribing(url);
    try {
      await api.subscribe(url);
      setSubscribed(prev => new Set(prev).add(url));
      setShowUrlModal(false);
      setUrlInput('');
    } catch (err: any) {
      setUrlError(`Failed to subscribe: ${err.message}`);
    }
    setSubscribing(null);
  };

  const closeUrlModal = () => {
    setShowUrlModal(false);
    setUrlInput('');
    setUrlError('');
  };

  return (
    <div className="page discover">
      <div className="page-header">
        <h1>Discover</h1>
        <button className="btn-secondary" onClick={() => setShowUrlModal(true)}>
          <Link size={15} /> RSS URL
        </button>
      </div>

      <form className="search-form" onSubmit={handleSearch}>
        <div className="search-input-wrapper">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search podcasts…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button type="button" className="search-clear-btn" onClick={() => { setQuery(''); setResults([]); setError(''); }}>
              <X size={14} />
            </button>
          )}
        </div>
        <button type="submit" className="btn-primary" disabled={searching}>
          {searching ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error && <div className="error-msg">{error}</div>}

      <div className="search-results">
        {results.map(r => (
          <div
            key={r.feedUrl}
            className={`search-result-card clickable ${opening === r.feedUrl ? 'opening' : ''}`}
            onClick={() => handleCardClick(r.feedUrl)}
          >
            <div className="search-result-artwork-wrap">
              {opening === r.feedUrl ? (
                <div className="search-result-artwork search-result-artwork-loading">
                  <Loader size={22} className="spinning" />
                </div>
              ) : r.artworkUrl ? (
                <img src={r.artworkUrl} alt="" className="search-result-artwork" loading="lazy" />
              ) : (
                <div className="search-result-artwork search-result-artwork-placeholder" />
              )}
            </div>
            <div className="search-result-info">
              <div className="search-result-name">{r.name}</div>
              <div className="search-result-artist">{r.artist}</div>
              {r.genre && <div className="search-result-genre">{r.genre} · {r.trackCount} episodes</div>}
            </div>
            <button
              className={`btn-subscribe ${subscribed.has(r.feedUrl) ? 'subscribed' : ''}`}
              onClick={(e) => handleSubscribe(r.feedUrl, e)}
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

      {showUrlModal && (
        <div className="modal-overlay" onClick={closeUrlModal}>
          <div className="modal modal-compact" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Subscribe by URL</h2>
              <button className="btn-icon" onClick={closeUrlModal}><X size={18} /></button>
            </div>
            <label>
              <span>RSS feed URL</span>
              <input
                type="url"
                placeholder="https://feeds.example.com/podcast.rss"
                value={urlInput}
                onChange={e => { setUrlInput(e.target.value); setUrlError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleUrlSubscribe()}
                autoFocus
              />
            </label>
            {urlError && <div className="error-msg">{urlError}</div>}
            <div className="confirm-modal-actions">
              <button className="btn-secondary" onClick={closeUrlModal}>Cancel</button>
              <button
                className="btn-primary"
                onClick={handleUrlSubscribe}
                disabled={subscribing !== null}
              >
                {subscribing ? <><Loader size={14} className="spinning" /> Subscribing…</> : 'Subscribe'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
