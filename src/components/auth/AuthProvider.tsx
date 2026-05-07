"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
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

    // onAuthStateChange가 INITIAL_SESSION 이벤트로 초기 세션도 전달해줌
    // 별도의 getSession() 호출 불필요 (lock 경쟁 방지)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: any, currentSession: any) => {
        if (!isMounted) return;
        
        console.log("Auth state changed:", event);
        setSession(currentSession);
        
        if (currentSession?.user) {
          const role = await fetchUserRole(currentSession.user.id);
          if (isMounted) {
            setUser({ ...currentSession.user, role });
          }
        } else {
          if (isMounted) setUser(null);
        }
        
        if (isMounted) setIsLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserRole]);

  return (
    <AuthContext.Provider value={{ session, user, isLoading, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
