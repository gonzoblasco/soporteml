import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase-init';
import type { User, Session } from '@supabase/supabase-js';

type AppRole = 'admin' | 'agent' | null;

const LS_KEY = 'sml_current_company';

export interface Membership {
  company_id: string;
  role: AppRole;
  is_default: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  profileName: string | null;
  userRole: AppRole;
  /** @deprecated Use `currentCompanyId` en su lugar. Alias legacy que se eliminará en la próxima versión. */
  companyId: string | null;
  memberships: Membership[];
  currentCompanyId: string | null;
  setCurrentCompanyId: (id: string) => void;
  refreshMemberships: () => Promise<void>;
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
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [currentCompanyId, setCurrentCompanyIdState] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);

      if (session?.user) {
        setTimeout(async () => {
          const uid = session.user.id;

          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, company_id')
            .eq('id', uid)
            .single();
          setProfileName(profile?.full_name ?? null);
          const legacyCompanyId = profile?.company_id ?? null;

          const { data: membershipRows } = await supabase
            .from('memberships')
            .select('company_id, role, is_default')
            .eq('user_id', uid)
            .eq('status', 'active');

          const activeMemberships: Membership[] = (membershipRows ?? []).map(m => ({
            company_id: m.company_id,
            role: m.role as AppRole,
            is_default: m.is_default,
          }));
          setMemberships(activeMemberships);

          const stored = localStorage.getItem(LS_KEY);
          let resolved: string | null = null;

          if (stored && activeMemberships.some(m => m.company_id === stored)) {
            resolved = stored;
          } else if (activeMemberships.length > 0) {
            resolved =
              activeMemberships.find(m => m.is_default)?.company_id ??
              activeMemberships[0].company_id;
          } else {
            resolved = legacyCompanyId;
          }

          if (resolved) localStorage.setItem(LS_KEY, resolved);
          setCurrentCompanyIdState(resolved);
          setCompanyId(resolved);

          const matchedMembership = activeMemberships.find(m => m.company_id === resolved);
          if (matchedMembership) {
            setUserRole(matchedMembership.role);
          } else {
            const { data: roleData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', uid)
              .maybeSingle();
            setUserRole((roleData?.role as AppRole) ?? null);
          }
        }, 0);
      } else {
        setProfileName(null);
        setUserRole(null);
        setCompanyId(null);
        setCurrentCompanyIdState(null);
        setMemberships([]);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const setCurrentCompanyId = useCallback((newId: string) => {
    const membership = memberships.find(m => m.company_id === newId);

    if (!membership) {
      const fallback =
        memberships.find(m => m.is_default)?.company_id ??
        memberships[0]?.company_id ??
        null;
      if (fallback) {
        localStorage.setItem(LS_KEY, fallback);
        setCurrentCompanyIdState(fallback);
        setCompanyId(fallback);
        const fallbackRole = memberships.find(m => m.company_id === fallback)?.role ?? null;
        setUserRole(fallbackRole);
      }
      return;
    }

    localStorage.setItem(LS_KEY, newId);
    setCurrentCompanyIdState(newId);
    setCompanyId(newId);
    setUserRole(membership.role);
  }, [memberships]);

  /**
   * Re-fetch memberships from DB. Used after joining a new company
   * or when membership data may have changed externally.
   */
  const refreshMemberships = useCallback(async () => {
    if (!user) return;
    const uid = user.id;

    const { data: membershipRows } = await supabase
      .from('memberships')
      .select('company_id, role, is_default')
      .eq('user_id', uid)
      .eq('status', 'active');

    const activeMemberships: Membership[] = (membershipRows ?? []).map(m => ({
      company_id: m.company_id,
      role: m.role as AppRole,
      is_default: m.is_default,
    }));
    setMemberships(activeMemberships);

    // If current company is still valid, just update role
    const currentMatch = activeMemberships.find(m => m.company_id === currentCompanyId);
    if (currentMatch) {
      setUserRole(currentMatch.role);
    } else if (activeMemberships.length > 0) {
      // Switch to default or first active
      const first = activeMemberships.find(m => m.is_default) ?? activeMemberships[0];
      localStorage.setItem(LS_KEY, first.company_id);
      setCurrentCompanyIdState(first.company_id);
      setCompanyId(first.company_id);
      setUserRole(first.role);
    }
  }, [user, currentCompanyId]);

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
    localStorage.removeItem(LS_KEY);
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{
      user, session, isLoading, profileName, userRole,
      companyId,
      memberships, currentCompanyId, setCurrentCompanyId,
      refreshMemberships,
      login, signup, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
