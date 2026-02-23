import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

type AppRole = 'admin' | 'agent' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  profileName: string | null;
  userRole: AppRole;
  companyId: string | null;
  login: (email: string, password: string) => Promise<string | null>;
  signup: (email: string, password: string, fullName: string, opts?: { companyName?: string; inviteCode?: string }) => Promise<string | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<AppRole>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);

      if (session?.user) {
        setTimeout(async () => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, company_id')
            .eq('id', session.user.id)
            .single();
          setProfileName(profile?.full_name ?? null);
          setCompanyId(profile?.company_id ?? null);

          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .maybeSingle();
          setUserRole((roleData?.role as AppRole) ?? null);
        }, 0);
      } else {
        setProfileName(null);
        setUserRole(null);
        setCompanyId(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  }, []);

  const signup = useCallback(async (email: string, password: string, fullName: string, opts?: { companyName?: string; inviteCode?: string }): Promise<string | null> => {
    const metadata: Record<string, string> = { full_name: fullName };
    if (opts?.companyName) metadata.company_name = opts.companyName;
    if (opts?.inviteCode) metadata.invite_code = opts.inviteCode;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: window.location.origin,
      },
    });
    return error ? error.message : null;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, isLoading, profileName, userRole, companyId, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
