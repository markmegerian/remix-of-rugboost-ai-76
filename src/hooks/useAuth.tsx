import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'staff' | 'client' | 'admin';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  isClient: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);

  const fetchUserRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching roles:', error);
        return [];
      }

      return (data || []).map(r => r.role as AppRole);
    } catch (err) {
      console.error('Error fetching roles:', err);
      return [];
    }
  };

  // Ensure user has staff role and profile (for OAuth signups where triggers may not fire)
  const ensureUserSetup = async (userId: string, userEmail: string, fullName?: string) => {
    try {
      // Ensure staff role exists
      await supabase
        .from('user_roles')
        .upsert({ user_id: userId, role: 'staff' as AppRole }, { onConflict: 'user_id,role' });

      // Ensure profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!existingProfile) {
        await supabase
          .from('profiles')
          .insert({ user_id: userId, full_name: fullName || userEmail?.split('@')[0] || 'User' });
      }
    } catch (err) {
      console.error('Error ensuring user setup:', err);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer to avoid deadlock - ensure setup for new signups (especially OAuth)
          setTimeout(async () => {
            // For new signups or OAuth, ensure user has required records
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
              const fullName = session.user.user_metadata?.full_name || 
                               session.user.user_metadata?.name ||
                               session.user.email?.split('@')[0];
              await ensureUserSetup(session.user.id, session.user.email || '', fullName);
            }
            
            const userRoles = await fetchUserRoles(session.user.id);
            setRoles(userRoles);
            setLoading(false);
          }, 0);
        } else {
          setRoles([]);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Ensure user setup on initial load too
        const fullName = session.user.user_metadata?.full_name || 
                         session.user.user_metadata?.name ||
                         session.user.email?.split('@')[0];
        await ensureUserSetup(session.user.id, session.user.email || '', fullName);
        
        const userRoles = await fetchUserRoles(session.user.id);
        setRoles(userRoles);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error: error as Error | null };
  };

  const signOut = async () => {
    // Always clear local state, even if the server call fails
    // (handles stale sessions that were invalidated elsewhere)
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('Sign out API call failed, clearing local session:', error);
    }
    // Clear state regardless of API result
    setUser(null);
    setSession(null);
    setRoles([]);
  };

  // Compute role booleans
  const isClient = roles.includes('client');
  const isStaff = roles.includes('staff');
  const isAdmin = roles.includes('admin');

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      roles,
      isClient,
      isStaff,
      isAdmin,
      signUp, 
      signIn, 
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
