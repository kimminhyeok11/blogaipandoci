"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, User, Mail, LogOut, Loader2, Edit3 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";

interface UserProfile {
  id: string;
  email: string;
  nickname: string | null;
  avatar_url: string | null;
  created_at: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (!authUser) {
          router.push("/login");
          return;
        }

        // 사용자 프로필 정보 가져오기
        const { data: profile } = await (supabase.from("users") as any)
          .select("nickname, avatar_url")
          .eq("id", authUser.id)
          .single();

        setUser({
          id: authUser.id,
          email: authUser.email || "",
          nickname: profile?.nickname || null,
          avatar_url: profile?.avatar_url || null,
          created_at: authUser.created_at,
        });
      } catch {
        showToast("프로필 로딩 실패", "error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut();
      showToast("로그아웃되었습니다.", "success");
      router.push("/");
    } catch {
      showToast("로그아웃에 실패했습니다.", "error");
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <Loader2 className="animate-spin text-rust" size={32} />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-paper">
      {/* Header */}
      <header className="masthead">
        <div className="masthead-pub">깊이 있는 분석과 인사이트</div>
        <Link href="/" className="masthead-title">
          法 BLOG
        </Link>
      </header>

      {/* Navigation */}
      <nav className="border-b border-rule bg-paper">
        <div className="max-w-content mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-12">
            <Link
              href="/"
              className="flex items-center gap-1 font-sans text-xs font-medium text-muted hover:text-rust transition-colors"
            >
              <ArrowLeft size={14} />
              홈으로
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-content mx-auto px-4 sm:px-6 py-16">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-rust/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <User size={40} className="text-rust" />
            </div>
            <h1 className="text-2xl font-black text-ink">
              {user.nickname || "사용자"}
            </h1>
            <p className="font-sans text-sm text-muted mt-1">{user.email}</p>
          </div>

          <div className="bg-cream/30 border border-rule rounded-sm p-6 mb-6">
            <h2 className="font-bold text-ink mb-4">계정 정보</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-rule/50">
                <span className="font-sans text-sm text-muted flex items-center gap-2">
                  <Mail size={14} />
                  이메일
                </span>
                <span className="font-sans text-sm text-ink">{user.email}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-rule/50">
                <span className="font-sans text-sm text-muted flex items-center gap-2">
                  <User size={14} />
                  닉네임
                </span>
                <span className="font-sans text-sm text-ink">
                  {user.nickname || "미설정"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="font-sans text-sm text-muted">가입일</span>
                <span className="font-sans text-sm text-ink">
                  {new Date(user.created_at).toLocaleDateString("ko-KR")}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              href="/write"
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-rust text-paper font-sans text-sm font-medium rounded-sm hover:bg-rust-light transition-colors"
            >
              <Edit3 size={16} />
              새 글 작성
            </Link>

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 border border-rule text-muted font-sans text-sm font-medium rounded-sm hover:border-rust hover:text-rust transition-colors disabled:opacity-50"
            >
              {isLoggingOut ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <LogOut size={16} />
              )}
              로그아웃
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-3 border-double border-ink text-center py-6 px-4 mt-16">
        <div className="font-sans text-xs text-muted tracking-wider">
          <p className="mb-2">法 BLOG · 깊이 있는 분석과 인사이트</p>
          <p>© {new Date().getFullYear()} All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
