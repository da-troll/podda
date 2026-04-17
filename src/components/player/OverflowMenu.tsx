import { useState } from 'react';
import { MoreVertical, CheckCircle2, Share2, ExternalLink } from 'lucide-react';
import { usePlayerContext } from '../../hooks/usePlayer';
import { api } from '../../api';
import { hapticSelection } from './haptics';
import type { Page } from '../../types';

interface Props {
  onNavigate: (page: Page) => void;
}

export function OverflowMenu({ onNavigate }: Props) {
  const player = usePlayerContext();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  const markPlayed = async () => {
    if (!player.episode) return;
    hapticSelection();
    await api.markPlayed(player.episode.id).catch(() => {});
    close();
  };

  const goToPodcast = () => {
    if (!player.episode) return;
    hapticSelection();
    close();
    onNavigate({ type: 'podcast', id: player.episode.podcast_id });
  };

  const share = async () => {
    if (!player.episode) return;
    hapticSelection();
    const title = player.episode.title;
    const text = player.episode.podcast_title || player.podcast?.title || 'Podda';
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${title} — ${url}`);
      }
    } catch { /* user cancelled or unavailable */ }
    close();
  };

  return (
    <div className="player-overflow-wrap">
      <button
        className="secondary-btn"
        onClick={() => setOpen(o => !o)}
        title="More"
        aria-label="More options"
      >
        <MoreVertical size={20} />
      </button>
      {open && (
        <>
          <div className="player-overflow-backdrop" onClick={close} />
          <div className="player-overflow-menu" role="menu">
            <button onClick={markPlayed}>
              <CheckCircle2 size={16} /> Mark played
            </button>
            <button onClick={goToPodcast}>
              <ExternalLink size={16} /> Go to podcast
            </button>
            <button onClick={share}>
              <Share2 size={16} /> Share
            </button>
          </div>
        </>
      )}
    </div>
  );
}
