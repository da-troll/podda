import { useEffect } from 'react';
import { usePlayerContext } from './usePlayer';

/**
 * Refetch list data when:
 *  - the active player episode changes (auto-advance, manual selection)
 *  - the page becomes visible (desktop tab refocus, mobile foreground resume)
 *  - the Capacitor bridge fires `podda:appResumed`
 *
 * Used by PodcastDetail, PlaylistDetail, History, Library to keep
 * listen-progress / completion state fresh while the user stays on the page.
 */
export function useListRefresh(reload: () => void): void {
  const player = usePlayerContext();

  useEffect(() => {
    if (!player.episode) return;
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.episode?.id]);

  useEffect(() => {
    const onVisible = () => { if (!document.hidden) reload(); };
    const onResume = () => reload();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('podda:appResumed', onResume);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('podda:appResumed', onResume);
    };
  }, [reload]);
}
