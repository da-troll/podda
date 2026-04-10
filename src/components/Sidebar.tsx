import { Library, Search, Settings, Headphones, Clock, ListMusic } from 'lucide-react';
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
  return (
    <nav className="sidebar">
      <div className="sidebar-brand">
        <Headphones size={24} />
        <span>PappaPod</span>
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
    </nav>
  );
}
