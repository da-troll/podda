import { useState, useEffect, useCallback } from 'react';
import { X, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { api } from '../api';
import type { Announcement } from '../types';

const typeIcons = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle,
};

export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const load = useCallback(() => {
    (api.getAnnouncements() as Promise<Announcement[]>)
      .then(setAnnouncements)
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const onVisChange = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisChange);
    return () => document.removeEventListener('visibilitychange', onVisChange);
  }, [load]);

  const dismiss = async (id: number) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    api.dismissAnnouncement(id).catch(() => {});
  };

  if (announcements.length === 0) return null;

  return (
    <div className="announcement-banners">
      {announcements.map(a => {
        const Icon = typeIcons[a.type] || Info;
        return (
          <div key={a.id} className={`announcement-banner announcement-${a.type}`}>
            <Icon size={16} className="announcement-icon" />
            <div className="announcement-content">
              <strong>{a.title}</strong>
              {a.body && <span className="announcement-body">{a.body}</span>}
            </div>
            <button className="announcement-dismiss" onClick={() => dismiss(a.id)} aria-label="Dismiss">
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
