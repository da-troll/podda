import { useState, useRef, useCallback, useEffect, createContext, useContext } from 'react';
import { api } from '../api';
import type { Episode, Podcast } from '../types';

interface PlayerState {
  episode: Episode | null;
  podcast: Podcast | null;
  playing: boolean;
  position: number;
  duration: number;
  speed: number;
  volume: number;
  loading: boolean;
}

interface PlayerContextType extends PlayerState {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  play: (episode: Episode, podcast?: Podcast | null) => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  skipForward: () => void;
  skipBackward: () => void;
  setSpeed: (speed: number) => void;
  setVolume: (vol: number) => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export function usePlayerContext() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayerContext must be used within PlayerProvider');
  return ctx;
}

// Smart rewind: if resuming after 12+ hours, rewind 15 seconds
function smartRewindPosition(position: number, progressUpdatedAt?: string | null): number {
  if (!progressUpdatedAt || position <= 15) return position;
  const elapsed = Date.now() - new Date(progressUpdatedAt).getTime();
  const TWELVE_HOURS = 12 * 60 * 60 * 1000;
  if (elapsed > TWELVE_HOURS) {
    return Math.max(0, position - 15);
  }
  return position;
}

export function usePlayerState(): PlayerContextType {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSavedPosRef = useRef<number>(0);

  const [state, setState] = useState<PlayerState>({
    episode: null,
    podcast: null,
    playing: false,
    position: 0,
    duration: 0,
    speed: 1,
    volume: 1,
    loading: false,
  });

  // Save progress to backend
  const saveProgress = useCallback((episodeId: number, pos: number, completed = false) => {
    const rounded = Math.floor(pos);
    if (rounded === lastSavedPosRef.current && !completed) return;
    lastSavedPosRef.current = rounded;
    api.saveProgress(episodeId, rounded, completed).catch(() => {});
  }, []);

  // Play an episode
  const play = useCallback((episode: Episode, podcast?: Podcast | null) => {
    const audio = audioRef.current;
    if (!audio) return;

    setState(prev => ({ ...prev, episode, podcast: podcast || prev.podcast, loading: true, playing: false }));

    audio.src = episode.audio_url;
    audio.playbackRate = state.speed;

    // Smart rewind: check if we should rewind a bit
    const rawPos = episode.listen_position || 0;
    const startPos = smartRewindPosition(rawPos, episode.progress_updated_at);
    if (startPos > 0) {
      audio.currentTime = startPos;
    }

    audio.play().then(() => {
      setState(prev => ({ ...prev, playing: true, loading: false }));
    }).catch(() => {
      setState(prev => ({ ...prev, loading: false }));
    });

    // Signal new session to backend (increments play_count)
    api.saveProgress(episode.id, Math.floor(startPos), false, true).catch(() => {});

    // Update Media Session
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: episode.title,
        artist: episode.podcast_title || podcast?.title || '',
        artwork: [{
          src: episode.artwork_url || episode.podcast_artwork_url || podcast?.artwork_url || '',
          sizes: '512x512',
        }],
      });
    }
  }, [state.speed]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !state.episode) return;
    if (audio.paused) {
      audio.play().then(() => setState(prev => ({ ...prev, playing: true })));
    } else {
      audio.pause();
      setState(prev => ({ ...prev, playing: false }));
      if (state.episode) saveProgress(state.episode.id, audio.currentTime);
    }
  }, [state.episode, saveProgress]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setState(prev => ({ ...prev, position: time }));
  }, []);

  const skipForward = useCallback(() => {
    const audio = audioRef.current;
    if (audio) audio.currentTime = Math.min(audio.currentTime + 15, audio.duration || Infinity);
  }, []);

  const skipBackward = useCallback(() => {
    const audio = audioRef.current;
    if (audio) audio.currentTime = Math.max(audio.currentTime - 15, 0);
  }, []);

  const setSpeed = useCallback((speed: number) => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = speed;
    setState(prev => ({ ...prev, speed }));
  }, []);

  const setVolume = useCallback((vol: number) => {
    const audio = audioRef.current;
    if (audio) audio.volume = vol;
    setState(prev => ({ ...prev, volume: vol }));
  }, []);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setState(prev => ({ ...prev, position: audio.currentTime, duration: audio.duration || 0 }));
    };

    const onEnded = () => {
      setState(prev => {
        if (prev.episode) saveProgress(prev.episode.id, audio.duration || 0, true);
        return { ...prev, playing: false };
      });
    };

    const onLoadedMetadata = () => {
      setState(prev => ({ ...prev, duration: audio.duration || 0, loading: false }));
      audio.playbackRate = state.speed;
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, [saveProgress, state.speed]);

  // Periodic progress save (every 15s)
  useEffect(() => {
    if (!state.playing || !state.episode) return;

    const timer = window.setInterval(() => {
      const audio = audioRef.current;
      if (audio && state.episode) {
        saveProgress(state.episode.id, audio.currentTime);
      }
    }, 15000);

    return () => clearInterval(timer);
  }, [state.playing, state.episode, saveProgress]);

  // Save on page unload
  useEffect(() => {
    const onBeforeUnload = () => {
      const audio = audioRef.current;
      if (audio && state.episode) {
        const data = JSON.stringify({ position: Math.floor(audio.currentTime), completed: false });
        navigator.sendBeacon(`/api/progress/${state.episode.id}`, new Blob([data], { type: 'application/json' }));
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [state.episode]);

  // Media Session action handlers
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.setActionHandler('play', togglePlay);
    navigator.mediaSession.setActionHandler('pause', togglePlay);
    navigator.mediaSession.setActionHandler('seekbackward', skipBackward);
    navigator.mediaSession.setActionHandler('seekforward', skipForward);
  }, [togglePlay, skipBackward, skipForward]);

  return {
    ...state,
    audioRef,
    play,
    togglePlay,
    seek,
    skipForward,
    skipBackward,
    setSpeed,
    setVolume,
  };
}

export { PlayerContext };
