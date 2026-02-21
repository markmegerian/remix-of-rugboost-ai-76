import React, { createContext, useContext, useState, useCallback } from 'react';

interface SearchContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  openSearch: () => void;
}

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const openSearch = useCallback(() => setOpen(true), []);

  return (
    <SearchContext.Provider value={{ open, setOpen, openSearch }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearchContext() {
  const ctx = useContext(SearchContext);
  if (!ctx) return null;
  return ctx;
}
