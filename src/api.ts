async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () =>
    request('/api/auth/logout', { method: 'POST' }),
  me: () =>
    request('/api/auth/me'),

  // Podcasts
  getPodcasts: () =>
    request('/api/podcasts'),
  subscribe: (feedUrl: string) =>
    request('/api/podcasts/subscribe', { method: 'POST', body: JSON.stringify({ feedUrl }) }),
  unsubscribe: (id: number) =>
    request(`/api/podcasts/${id}/unsubscribe`, { method: 'DELETE' }),
  refreshPodcast: (id: number) =>
    request(`/api/podcasts/${id}/refresh`, { method: 'POST' }),
  importOpml: (opml: string) =>
    request('/api/podcasts/import-opml', { method: 'POST', body: JSON.stringify({ opml }) }),

  // Episodes
  getEpisodes: (podcastId: number, limit = 50, offset = 0) =>
    request(`/api/episodes/podcast/${podcastId}?limit=${limit}&offset=${offset}`),
  getRecentEpisodes: (limit = 50) =>
    request(`/api/episodes/recent?limit=${limit}`),
  getEpisode: (id: number) =>
    request(`/api/episodes/${id}`),

  // Progress
  saveProgress: (episodeId: number, position: number, completed = false) =>
    request(`/api/progress/${episodeId}`, { method: 'PUT', body: JSON.stringify({ position, completed }) }),
  getInProgress: () =>
    request('/api/progress/in-progress'),

  // Search
  search: (q: string) =>
    request(`/api/search?q=${encodeURIComponent(q)}`),
};
