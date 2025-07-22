import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { toast } from '@/hooks/use-toast';

type Language = Database['public']['Enums']['language'];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string, preferredLanguage?: Language) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: { display_name?: string; preferred_language?: Language }) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Log activity and update status for authenticated users
        if (session?.user) {
          setTimeout(async () => {
            if (event === 'SIGNED_IN') {
              await supabase.rpc('update_user_status', { 
                p_user_id: session.user.id, 
                p_status: 'online' 
              });
              await supabase.rpc('log_activity', {
                p_user_id: session.user.id,
                p_activity_type: 'sign_in',
                p_description: 'User signed in'
              });
            }
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          // Update status to offline on sign out
          setTimeout(async () => {
            const { data: { user: lastUser } } = await supabase.auth.getUser();
            if (lastUser) {
              await supabase.rpc('update_user_status', { 
                p_user_id: lastUser.id, 
                p_status: 'offline' 
              });
            }
          }, 0);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName?: string, preferredLanguage: Language = 'english') => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName,
          preferred_language: preferredLanguage
        }
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error };
  };

  const signOut = async () => {
    if (user) {
      await supabase.rpc('update_user_status', { 
        p_user_id: user.id, 
        p_status: 'offline' 
      });
    }
    await supabase.auth.signOut();
  };

  const updateProfile = async (updates: { display_name?: string; preferred_language?: Language }) => {
    if (!user) return { error: new Error('No user found') };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id);

    if (!error) {
      await supabase.rpc('log_activity', {
        p_user_id: user.id,
        p_activity_type: 'profile_update',
        p_description: 'Profile updated',
        p_metadata: updates
      });
    }

    return { error };
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signUp,
      signIn,
      signOut,
      updateProfile
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