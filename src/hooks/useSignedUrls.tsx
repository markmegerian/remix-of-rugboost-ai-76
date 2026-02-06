import React, { useState, useEffect, useCallback, useRef, createContext, useContext, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SignedUrlCache {
  url: string;
  expiresAt: number;
}

interface SignedUrlContextValue {
  getSignedUrl: (filePath: string) => string | null;
  preloadUrls: (filePaths: string[]) => Promise<void>;
  isLoading: boolean;
}

const SignedUrlContext = createContext<SignedUrlContextValue | null>(null);

const BUCKET = 'rug-photos';
const EXPIRES_IN = 3600;
const REFRESH_BUFFER = 300;

const urlCache = new Map<string, SignedUrlCache>();

const extractFilePath = (input: string): string => {
  if (!input.startsWith('http')) {
    return input;
  }
  const match = input.match(/\/rug-photos\/([^?]+)/);
  if (match && match[1]) {
    return decodeURIComponent(match[1]);
  }
  return input;
};

const isUrlValid = (cached: SignedUrlCache | undefined): boolean => {
  if (!cached) return false;
  return Date.now() < cached.expiresAt - REFRESH_BUFFER * 1000;
};

export const batchSignUrls = async (filePaths: string[]): Promise<Map<string, string>> => {
  const results = new Map<string, string>();
  
  if (filePaths.length === 0) return results;

  const pathsToSign = filePaths.filter(path => {
    const cleanPath = extractFilePath(path);
    const cached = urlCache.get(cleanPath);
    if (isUrlValid(cached)) {
      results.set(cleanPath, cached!.url);
      return false;
    }
    return true;
  });

  if (pathsToSign.length === 0) return results;

  const cleanPaths = pathsToSign.map(extractFilePath);

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(cleanPaths, EXPIRES_IN);

    if (error) {
      console.error('Batch URL signing error:', error);
      return results;
    }

    const expiresAt = Date.now() + EXPIRES_IN * 1000;

    data?.forEach((item, index) => {
      if (item.signedUrl) {
        const path = cleanPaths[index];
        urlCache.set(path, { url: item.signedUrl, expiresAt });
        results.set(path, item.signedUrl);
      }
    });
  } catch (err) {
    console.error('Failed to batch sign URLs:', err);
  }

  return results;
};

interface SignedUrlProviderProps {
  children: React.ReactNode;
}

export const SignedUrlProvider: React.FC<SignedUrlProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);

  const getSignedUrl = useCallback((filePath: string): string | null => {
    if (!filePath) return null;
    const cleanPath = extractFilePath(filePath);
    const cached = urlCache.get(cleanPath);
    if (isUrlValid(cached)) {
      return cached!.url;
    }
    return null;
  }, []);

  const preloadUrls = useCallback(async (filePaths: string[]) => {
    if (filePaths.length === 0) return;
    
    setIsLoading(true);
    try {
      await batchSignUrls(filePaths);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value = useMemo(() => ({
    getSignedUrl,
    preloadUrls,
    isLoading,
  }), [getSignedUrl, preloadUrls, isLoading]);

  return (
    <SignedUrlContext.Provider value={value}>
      {children}
    </SignedUrlContext.Provider>
  );
};

export const useSignedUrls = () => {
  const context = useContext(SignedUrlContext);
  if (!context) {
    throw new Error('useSignedUrls must be used within a SignedUrlProvider');
  }
  return context;
};

interface CachedSignedUrlResult {
  signedUrl: string | null;
  loading: boolean;
  error: Error | null;
}

export const useCachedSignedUrl = (filePath: string | null | undefined): CachedSignedUrlResult => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!filePath) {
      setSignedUrl(null);
      return;
    }

    const cleanPath = extractFilePath(filePath);
    
    const cached = urlCache.get(cleanPath);
    if (isUrlValid(cached)) {
      setSignedUrl(cached!.url);
      return;
    }

    setLoading(true);
    setError(null);

    batchSignUrls([filePath])
      .then(results => {
        const url = results.get(cleanPath);
        if (url) {
          setSignedUrl(url);
        } else {
          setError(new Error('Failed to sign URL'));
        }
      })
      .catch(err => {
        setError(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [filePath]);

  return { signedUrl, loading, error };
};

export default useSignedUrls;
