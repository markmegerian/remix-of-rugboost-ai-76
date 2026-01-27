import React, { useState, useEffect, useRef, useDeferredValue } from 'react';
import { Search, User, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';

interface Client {
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
}

interface ClientSearchProps {
  onSelectClient: (client: Client) => void;
  initialValue?: string;
}

const ClientSearch: React.FC<ClientSearchProps> = ({ onSelectClient, initialValue = '' }) => {
  const [query, setQuery] = useState(initialValue);
  const deferredQuery = useDeferredValue(query);
  const [results, setResults] = useState<Client[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Use deferred value for search to avoid blocking UI
  useEffect(() => {
    const searchClients = async () => {
      if (deferredQuery.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        // Search for unique clients from existing jobs
        const { data, error } = await supabase
          .from('jobs')
          .select('client_name, client_email, client_phone')
          .ilike('client_name', `%${deferredQuery}%`)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;

        // Deduplicate by client name
        const uniqueClients = data?.reduce((acc: Client[], curr) => {
          const exists = acc.find(c => c.client_name.toLowerCase() === curr.client_name.toLowerCase());
          if (!exists) {
            acc.push(curr);
          }
          return acc;
        }, []) || [];

        setResults(uniqueClients);
        setIsOpen(uniqueClients.length > 0);
      } catch (error) {
        console.error('Client search error:', error);
      } finally {
        setLoading(false);
      }
    };

    searchClients();
  }, [deferredQuery]);

  const handleSelect = (client: Client) => {
    setQuery(client.client_name);
    onSelectClient(client);
    setIsOpen(false);
  };

  const isStale = query !== deferredQuery;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.length >= 2) {
              setIsOpen(true);
            }
          }}
          onFocus={() => {
            if (results.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder="Search existing clients or enter new..."
          className="pl-10"
        />
      </div>

      {isOpen && results.length > 0 && (
        <div className={`absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden transition-opacity ${isStale ? 'opacity-70' : 'opacity-100'}`}>
          <div className="p-2 text-xs text-muted-foreground bg-muted/50">
            Existing Clients
          </div>
          <div className="max-h-48 overflow-y-auto">
            {results.map((client, index) => (
              <button
                key={`${client.client_name}-${index}`}
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-accent flex items-center gap-3 transition-colors"
                onClick={() => handleSelect(client)}
              >
                <div className="rounded-full bg-primary/10 p-2">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{client.client_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {client.client_email || client.client_phone || 'No contact info'}
                  </p>
                </div>
                <Check className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100" />
              </button>
            ))}
          </div>
        </div>
      )}

      {(loading || isStale) && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default ClientSearch;
