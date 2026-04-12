import { useState } from 'react';
import { Library, Search, Settings, Headphones, Clock, ListMusic } from 'lucide-react';
import { FeedbackModal } from './FeedbackModal';
import type { Page } from '../types';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onClose?: () => void;
}

const NAV_ITEMS: { page: Page; icon: typeof Library; label: string }[] = [
  { page: { type: 'library' }, icon: Library, label: 'Library' },
  { page: { type: 'playlists' }, icon: ListMusic, label: 'Playlists' },
  { page: { type: 'history' }, icon: Clock, label: 'History' },
  { page: { type: 'discover' }, icon: Search, label: 'Discover' },
  { page: { type: 'settings' }, icon: Settings, label: 'Settings' },
];

export function Sidebar({ currentPage, onNavigate, onClose }: SidebarProps) {
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <nav className="sidebar">
      <div className="sidebar-brand">
        <Headphones size={24} />
        <img src="/podda-logo.png" alt="podda" className="brand-logo brand-logo--sidebar" />
      </div>
      <ul className="sidebar-nav">
        {NAV_ITEMS.map(({ page, icon: Icon, label }) => (
          <li key={page.type}>
            <button
              className={`sidebar-link ${currentPage.type === page.type ? 'active' : ''}`}
              onClick={() => { onNavigate(page); onClose?.(); }}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="sidebar-footer">
        <p className="sidebar-footer-label">Bugs? Feature requests?</p>
        <button className="section-link" onClick={() => setShowFeedback(true)}>
          Submit feedback or a feature request
        </button>
      </div>
      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
    </nav>
  );
}
