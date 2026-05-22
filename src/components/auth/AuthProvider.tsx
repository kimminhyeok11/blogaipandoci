"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Session, User, AuthChangeEvent } from "@supabase/supabase-js";

interface AuthUser extends User {
  role?: string;
}

interface AuthContextType {
  session: Session | null;
  user: AuthUser | null;
  isLoading: boolean;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isLoading: true,
  refreshSession: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserRole = useCallback(async (userId: string): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .maybeSingle() as { data: { role: string } | null; error: Error | null };
      
      if (error) {
        console.warn('Role fetch warning:', error.message);
        return 'user';
      }
      
      return data?.role || 'user';
    } catch (err) {
      console.error('Role fetch error:', err);
      return 'user';
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      
      if (currentSession?.user) {
        const role = await fetchUserRole(currentSession.user.id);
        setUser({ ...currentSession.user, role });
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Session refresh error:', err);
    }
  }, [fetchUserRole]);

  useEffect(() => {
    let isMounted = true;

    // 초기 세션 확인 (onAuthStateChange가 지연될 경우 대비)
    supabase.auth.getSession().then((res: { data: { session: Session | null } }) => {
      if (!isMounted) return;
      if (!res.data.session) {
        setIsLoading(false);
      }
    });

    // onAuthStateChange 콜백 내에서는 Supabase DB 호출 금지 (auth lock deadlock 방지)
    // 세션만 동기적으로 세팅하고, role fetch는 별도 처리
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, currentSession: Session | null) => {
        if (!isMounted) return;
        
        setSession(currentSession);
        
        if (currentSession?.user) {
          // 우선 role 없이 user 세팅 (즉시 로그인 상태 반영)
          setUser((prev) => {
            if (prev?.id === currentSession.user.id) return prev;
            return { ...currentSession.user, role: prev?.role || 'user' };
          });
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // session 변경 시 role을 별도로 fetch (auth lock 바깥에서)
  // role fetch 완료 후 isLoading을 false로 설정
  useEffect(() => {
    if (!session?.user) return;
    
    let cancelled = false;
    fetchUserRole(session.user.id).then((role) => {
      if (!cancelled) {
        setUser((prev) => prev ? { ...prev, role } : null);
        setIsLoading(false);
      }
    });
    
    return () => { cancelled = true; };
  }, [session?.user?.id, fetchUserRole]);

  return (
    <AuthContext.Provider value={{ session, user, isLoading, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
