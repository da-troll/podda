import { useState, useEffect, useCallback } from 'react';
import { AuthContext, useAuthState } from './hooks/useAuth';
import { PlayerContext, usePlayerState } from './hooks/usePlayer';
import { Sidebar } from './components/Sidebar';
import { Player } from './components/Player';
import { Login } from './pages/Login';
import { Library } from './pages/Library';
import { PodcastDetail } from './pages/PodcastDetail';
import { Discover } from './pages/Discover';
import { Settings } from './pages/Settings';
import { History } from './pages/History';
import { Playlists } from './pages/Playlists';
import { PlaylistDetail } from './pages/PlaylistDetail';
import { Menu, X } from 'lucide-react';
import type { Page } from './types';

function parseHash(): Page {
  const hash = window.location.hash.slice(1) || 'library';
  if (hash.startsWith('podcast/')) {
    const id = parseInt(hash.split('/')[1]);
    if (!isNaN(id)) return { type: 'podcast', id };
  }
  if (hash === 'discover') return { type: 'discover' };
  if (hash === 'history') return { type: 'history' };
  if (hash === 'playlists') return { type: 'playlists' };
  if (hash.startsWith('playlist/')) {
    const id = parseInt(hash.split('/')[1]);
    if (!isNaN(id)) return { type: 'playlist', id };
  }
  if (hash === 'settings') return { type: 'settings' };
  if (hash === 'queue') return { type: 'queue' };
  return { type: 'library' };
}

function pageToHash(page: Page): string {
  switch (page.type) {
    case 'library': return '#library';
    case 'podcast': return `#podcast/${page.id}`;
    case 'discover': return '#discover';
    case 'history': return '#history';
    case 'playlists': return '#playlists';
    case 'playlist': return `#playlist/${page.id}`;
    case 'settings': return '#settings';
    case 'queue': return '#queue';
  }
}

function AppContent() {
  const [page, setPage] = useState<Page>(parseHash);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const player = usePlayerState();

  const navigate = useCallback((p: Page) => {
    window.location.hash = pageToHash(p);
    setPage(p);
  }, []);

  useEffect(() => {
    const onHashChange = () => setPage(parseHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const renderPage = () => {
    switch (page.type) {
      case 'library': return <Library onNavigate={navigate} />;
      case 'podcast': return <PodcastDetail podcastId={page.id} onNavigate={navigate} />;
      case 'discover': return <Discover />;
      case 'history': return <History />;
      case 'playlists': return <Playlists onNavigate={navigate} />;
      case 'playlist': return <PlaylistDetail playlistId={page.id} onNavigate={navigate} />;
      case 'settings': return <Settings />;
      default: return <Library onNavigate={navigate} />;
    }
  };

  return (
    <PlayerContext.Provider value={player}>
      <div className={`app-layout ${player.episode ? 'has-player' : ''}`}>
        {/* Mobile sidebar overlay */}
        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

        <div className={`sidebar-container ${sidebarOpen ? 'open' : ''}`}>
          <Sidebar currentPage={page} onNavigate={navigate} onClose={() => setSidebarOpen(false)} />
        </div>

        <div className="main-area">
          <header className="app-header">
            <button className="btn-icon mobile-menu" onClick={() => setSidebarOpen(o => !o)}>
              {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <img src="/podda-logo.png" alt="podda" className="brand-logo brand-logo--header" />
          </header>
          <main className="main-content">
            {renderPage()}
          </main>
        </div>

        <Player />
      </div>
    </PlayerContext.Provider>
  );
}

export default function App() {
  const auth = useAuthState();

  if (auth.loading) {
    return <div className="app-loading">Loading...</div>;
  }

  return (
    <AuthContext.Provider value={auth}>
      {auth.user ? <AppContent /> : <Login />}
    </AuthContext.Provider>
  );
}
