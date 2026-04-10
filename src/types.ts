export interface User {
  id: number;
  username: string;
  displayName: string | null;
  isAdmin: boolean;
}

export interface Podcast {
  id: number;
  feed_url: string;
  title: string;
  author: string | null;
  description: string | null;
  artwork_url: string | null;
  link: string | null;
  language: string | null;
  last_fetched: string | null;
  episode_count?: number;
  completed_count?: number;
}

export interface Episode {
  id: number;
  podcast_id: number;
  guid: string;
  title: string;
  description: string | null;
  audio_url: string;
  audio_type: string | null;
  audio_length: number | null;
  duration: number | null;
  pub_date: string | null;
  artwork_url: string | null;
  podcast_title?: string;
  podcast_artwork_url?: string;
  podcast_author?: string;
  listen_position?: number | null;
  listen_completed?: boolean | null;
}

export interface SearchResult {
  name: string;
  artist: string;
  artworkUrl: string | null;
  feedUrl: string;
  genre: string | null;
  trackCount: number;
}

export type Page =
  | { type: 'library' }
  | { type: 'podcast'; id: number }
  | { type: 'discover' }
  | { type: 'queue' }
  | { type: 'settings' };
