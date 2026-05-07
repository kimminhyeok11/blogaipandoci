"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";

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

  const fetchUserRole = async (userId: string): Promise<string> => {
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
  };

  const refreshSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setSession(session);
    
    if (session?.user) {
      const role = await fetchUserRole(session.user.id);
      setUser({ ...session.user, role });
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;
    let isMounted = true;

    // 초기 세션 복원
    refreshSession().then(() => {
      if (isMounted) setIsLoading(false);
    });

    // 세션 변경 구독
    const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(
      async (event: any, session: any) => {
        if (!isMounted) return;
        
        console.log("Auth state changed:", event);
        setSession(session);
        
        if (session?.user) {
          const role = await fetchUserRole(session.user.id);
          if (isMounted) {
            setUser({ ...session.user, role });
          }
        } else {
          if (isMounted) setUser(null);
        }
        
        if (isMounted) setIsLoading(false);
      }
    );
    subscription = sub;

    return () => {
      isMounted = false;
      // 타이머 지연으로 Strict Mode 언마운트/마운트 사이 lock 해제 시간 확보
      setTimeout(() => {
        subscription?.unsubscribe();
      }, 0);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, isLoading, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
