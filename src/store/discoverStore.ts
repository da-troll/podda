import { create } from 'zustand';
import type { SearchResult } from '../types';

interface DiscoverState {
  query: string;
  results: SearchResult[];
  scrollY: number;
  setQuery: (q: string) => void;
  setResults: (r: SearchResult[]) => void;
  setScrollY: (y: number) => void;
}

export const useDiscoverStore = create<DiscoverState>((set) => ({
  query: '',
  results: [],
  scrollY: 0,
  setQuery: (query) => set({ query }),
  setResults: (results) => set({ results }),
  setScrollY: (scrollY) => set({ scrollY }),
}));
