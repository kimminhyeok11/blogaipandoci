"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import Link from "next/link";
import { 
  User, Mail, Edit3, Save, X, Loader2, LogOut, 
  CheckCircle, XCircle, Shield,
  BarChart3, MessageSquare, Link2, Flag, Settings,
  ChevronDown, ChevronUp
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { StickyNav } from "@/components/layout/StickyNav";

// 관리자 메뉴 아이템
interface AdminMenuItem {
  href: string;
  label: string;
  icon: React.ElementType;
  color?: string;
}

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
  const { user: authUser, isLoading: isAuthLoading } = useAuth();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState("");
  const [nicknameStatus, setNicknameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [nicknameMessage, setNicknameMessage] = useState("");
  const [isSavingNickname, setIsSavingNickname] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawConfirm, setWithdrawConfirm] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 관리자 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(e.target as Node)) {
        setShowAdminMenu(false);
      }
    };
    if (showAdminMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAdminMenu]);

  const adminMenuItems: AdminMenuItem[] = [
    { href: "/admin/stats", label: "통계 대시보드", icon: BarChart3 },
    { href: "/admin/comments", label: "댓글 관리", icon: MessageSquare },
    { href: "/admin/keywords", label: "키워드 관리", icon: Link2 },
    { href: "/admin/reports", label: "신고 관리", icon: Flag },
    { href: "/admin/settings", label: "설정", icon: Settings },
  ];

  useEffect(() => {
    if (isAuthLoading) return;

    if (!authUser) {
      router.push("/login");
      return;
    }

    const fetchProfile = async () => {
      try {
        // 사용자 프로필 정보 가져오기
        const { data: profile } = await supabase
          .from('users')
          .select("nickname, avatar_url")
          .eq("id", authUser.id)
          .single();

        setUser({
          id: authUser.id,
          email: authUser.email || "",
          nickname: profile?.nickname || null,
          avatar_url: profile?.avatar_url || null,
          created_at: authUser.created_at || "",
        });
      } catch {
        showToast("프로필 로딩 실패", "error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  // showToast는 useToast()의 stable reference로 의존성 불필요
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser, isAuthLoading, router]);

  const checkNickname = async (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setNicknameStatus("idle");
      setNicknameMessage("");
      return;
    }
    setNicknameStatus("checking");
    try {
      const res = await fetch(`/api/users/check-nickname?nickname=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      setNicknameStatus(data.available ? "available" : "taken");
      setNicknameMessage(data.message);
    } catch {
      setNicknameStatus("idle");
    }
  };

  const handleSaveNickname = async () => {
    if (!user || !newNickname.trim()) return;
    if (nicknameStatus === "taken") {
      showToast("이미 사용 중인 닉네임입니다.", "warning");
      return;
    }
    setIsSavingNickname(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/users/nickname", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { "Authorization": `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ nickname: newNickname.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUser((prev) => prev ? { ...prev, nickname: data.nickname } : prev);
      setIsEditingNickname(false);
      showToast("닉네임이 변경되었습니다.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "닉네임 변경 실패", "error");
    } finally {
      setIsSavingNickname(false);
    }
  };

  const handleWithdraw = async () => {
    if (withdrawConfirm !== "탈퇴") {
      showToast("\"탈퇴\"를 입력해주세요.", "warning");
      return;
    }
    setIsWithdrawing(true);

    const clearSession = async () => {
      try { await supabase.auth.signOut({ scope: "global" }); } catch {}
      Object.keys(localStorage).forEach((k) => { if (k.startsWith("sb-")) localStorage.removeItem(k); });
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        // 세션이 없어도 로컬 잔여 토큰 정리 후 홈으로
        await clearSession();
        window.location.href = "/";
        return;
      }

      const res = await fetch("/api/users/me", {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${session.access_token}` },
      });
      const data = await res.json();

      // API 성공/실패 무관하게 항상 세션 삭제
      await clearSession();

      if (!res.ok) {
        // API 실패 = Supabase에서 계정 삭제 실패 → 에러 메시지 표시 후 홈 이동
        showToast("탈퇴 처리 중 오류: " + (data.error || "알 수 없는 오류"), "error");
        window.location.href = "/";
        return;
      }

      showToast("탈퇴가 완료되었습니다.", "success");
      window.location.href = "/";
    } catch (err) {
      await clearSession();
      showToast(err instanceof Error ? err.message : "탈퇴 실패", "error");
      window.location.href = "/";
    } finally {
      setIsWithdrawing(false);
      setShowWithdrawModal(false);
    }
  };

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

      {/* Navigation - 스마트 스티키 헤더 */}
      <StickyNav backHref="/" backLabel="홈으로" />

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
              <div className="py-2 border-b border-rule/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-sans text-sm text-muted flex items-center gap-2">
                    <User size={14} />
                    닉네임
                  </span>
                  {!isEditingNickname && (
                    <button
                      onClick={() => {
                        setIsEditingNickname(true);
                        setNewNickname(user.nickname || "");
                        setNicknameStatus("idle");
                        setNicknameMessage("");
                      }}
                      className="text-xs text-rust hover:underline flex items-center gap-1"
                    >
                      <Edit3 size={12} />
                      변경
                    </button>
                  )}
                </div>
                {isEditingNickname ? (
                  <div className="mt-2 space-y-2">
                    <div className="relative">
                      <input
                        type="text"
                        value={newNickname}
                        onChange={(e) => {
                          setNewNickname(e.target.value);
                          checkNickname(e.target.value);
                        }}
                        placeholder="2~20자, 한글/영문/숫자/_"
                        className="w-full pl-3 pr-8 py-2 border border-rule rounded-sm text-sm focus:outline-none focus:border-rust bg-white"
                      />
                      {nicknameStatus === "checking" && <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted" />}
                      {nicknameStatus === "available" && <CheckCircle size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />}
                      {nicknameStatus === "taken" && <XCircle size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500" />}
                    </div>
                    {nicknameMessage && (
                      <p className={`text-xs ${nicknameStatus === "available" ? "text-green-600" : "text-red-500"}`}>{nicknameMessage}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveNickname}
                        disabled={isSavingNickname || nicknameStatus === "taken" || !newNickname.trim()}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-rust text-paper text-xs rounded-sm hover:bg-rust-light disabled:opacity-50 transition-colors"
                      >
                        {isSavingNickname ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                        저장
                      </button>
                      <button
                        onClick={() => setIsEditingNickname(false)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-rule text-muted text-xs rounded-sm hover:border-rust hover:text-rust transition-colors"
                      >
                        <X size={12} />
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <span className="font-sans text-sm text-ink">{user.nickname || "미설정"}</span>
                )}
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
            {/* 관리자 드롭다운 메뉴 */}
            {authUser?.role === 'admin' && (
              <div className="relative" ref={adminMenuRef}>
                <button
                  onClick={() => setShowAdminMenu(!showAdminMenu)}
                  className="flex items-center justify-between w-full px-4 py-3 bg-ink text-paper font-sans text-sm font-medium rounded-sm hover:bg-ink/80 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Shield size={16} />
                    <span>관리자 메뉴</span>
                  </div>
                  {showAdminMenu ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                
                {showAdminMenu && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-sm shadow-lg z-50 overflow-hidden">
                    {adminMenuItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setShowAdminMenu(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          <Icon size={16} className="text-gray-500" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {authUser?.role === 'admin' && (
              <Link
                href="/write"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-rust text-paper font-sans text-sm font-medium rounded-sm hover:bg-rust-light transition-colors"
              >
                <Edit3 size={16} />
                새 글 작성
              </Link>
            )}

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 border border-rule text-muted font-sans text-sm font-medium rounded-sm hover:border-rust hover:text-rust transition-colors disabled:opacity-50"
            >
              {isLoggingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
              로그아웃
            </button>

            <button
              onClick={() => { setShowWithdrawModal(true); setWithdrawConfirm(""); }}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 border border-red-200 text-red-400 font-sans text-sm font-medium rounded-sm hover:border-red-400 hover:text-red-600 transition-colors"
            >
              회원 탈퇴
            </button>
          </div>
        </div>
      </main>

      {/* 탈퇴 확인 모달 */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-sm border border-rule p-6 max-w-sm w-full">
            <h2 className="text-lg font-bold text-ink mb-2">정말 탈퇴하시겠습니까?</h2>
            <p className="text-sm text-muted mb-4">
              탈퇴 시 계정 및 모든 개인정보가 즉시 삭제됩니다.<br />
              작성하신 질문은 익명으로 유지됩니다.
            </p>
            <p className="text-sm text-ink mb-2">확인을 위해 아래에 <strong>탈퇴</strong>를 입력하세요.</p>
            <input
              type="text"
              value={withdrawConfirm}
              onChange={(e) => setWithdrawConfirm(e.target.value)}
              placeholder="탈퇴"
              className="w-full px-3 py-2 border border-rule rounded-sm text-sm focus:outline-none focus:border-red-400 mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={handleWithdraw}
                disabled={isWithdrawing || withdrawConfirm !== "탈퇴"}
                className="flex-1 py-2.5 bg-red-600 text-white text-sm font-medium rounded-sm hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
              >
                {isWithdrawing ? <Loader2 size={14} className="animate-spin" /> : "탈퇴 확인"}
              </button>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 py-2.5 border border-rule text-muted text-sm rounded-sm hover:border-rust hover:text-rust transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
