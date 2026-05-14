"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "nickname" | "error">("loading");
  const [nickname, setNickname] = useState("");
  const [nicknameStatus, setNicknameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [nicknameMessage, setNicknameMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      // Supabase가 URL 해시에서 세션을 처리하도록 대기
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        setStatus("error");
        return;
      }

      const user = session.user;
      setUserId(user.id);

      // DB에서 닉네임 확인
      const { data: profile } = await supabase
        .from("users")
        .select("nickname")
        .eq("id", user.id)
        .single();

      const isKakaoUser = user.app_metadata?.provider === "kakao";
      const hasValidNickname =
        profile?.nickname &&
        profile.nickname !== user.email?.split("@")[0];

      if (isKakaoUser && !hasValidNickname) {
        // 카카오 첫 로그인 → 닉네임 설정 화면
        setStatus("nickname");
      } else {
        router.replace("/");
      }
    };

    handleCallback();
  }, [router]);

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
    if (!userId || !nickname.trim() || nicknameStatus === "taken") return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/users/nickname", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, nickname: nickname.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.replace("/");
    } catch (err) {
      setNicknameMessage(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setIsSaving(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-rust mx-auto mb-3" size={32} />
          <p className="font-sans text-sm text-muted">로그인 처리 중...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="font-medium text-ink mb-2">로그인에 실패했습니다</p>
          <p className="text-sm text-muted mb-4">다시 시도해주세요.</p>
          <a href="/login" className="px-4 py-2 bg-rust text-paper text-sm rounded-sm hover:bg-rust-light transition-colors">
            로그인 페이지로
          </a>
        </div>
      </div>
    );
  }

  // 카카오 첫 로그인 닉네임 설정
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-xl font-black text-ink mb-1">닉네임을 설정해주세요</h1>
          <p className="text-sm text-muted">사이트에서 표시될 이름입니다. 나중에 프로필에서 변경 가능합니다.</p>
        </div>
        <div className="bg-white border border-rule rounded-sm p-6 space-y-4">
          <div className="relative">
            <input
              type="text"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                checkNickname(e.target.value);
              }}
              placeholder="2~20자, 한글/영문/숫자/_"
              className="w-full px-3 py-2.5 border border-rule rounded-sm text-sm focus:outline-none focus:border-rust bg-cream"
            />
            {nicknameStatus === "checking" && (
              <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted" />
            )}
          </div>
          {nicknameMessage && (
            <p className={`text-xs ${nicknameStatus === "available" ? "text-green-600" : "text-red-500"}`}>
              {nicknameMessage}
            </p>
          )}
          <button
            onClick={handleSaveNickname}
            disabled={isSaving || nicknameStatus === "taken" || nickname.trim().length < 2}
            className="w-full py-2.5 bg-rust text-paper text-sm font-medium rounded-sm hover:bg-rust-light disabled:opacity-50 transition-colors"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin mx-auto" /> : "완료"}
          </button>
          <button
            onClick={() => router.replace("/")}
            className="w-full py-2 text-xs text-muted hover:text-ink transition-colors"
          >
            나중에 설정하기
          </button>
        </div>
      </div>
    </div>
  );
}
