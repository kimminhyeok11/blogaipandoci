"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // URL에서 access_token 확인
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.includes("access_token")) {
      setError("유효하지 않은 접근입니다. 비밀번호 재설정 이메일의 링크를 확인해주세요.");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 유효성 검사
    if (password.length < 6) {
      setError("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;

      setIsSuccess(true);
      showToast("비밀번호가 성공적으로 변경되었습니다.", "success");

      // 3초 후 로그인 페이지로 이동
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "비밀번호 변경에 실패했습니다.";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  if (error && !isSuccess) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="bg-white border border-rule rounded-sm p-8">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="text-red-500" size={32} />
            </div>
            <h1 className="text-xl font-bold text-ink mb-2">접근 오류</h1>
            <p className="font-sans text-sm text-muted mb-6">{error}</p>
            <Link
              href="/login"
              className="inline-block px-4 py-2 bg-rust text-paper font-sans text-sm font-medium rounded-sm hover:bg-rust-light transition-colors"
            >
              로그인 페이지로
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="bg-white border border-rule rounded-sm p-8">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-green-500" size={32} />
            </div>
            <h1 className="text-xl font-bold text-ink mb-2">비밀번호 변경 완료</h1>
            <p className="font-sans text-sm text-muted mb-6">
              비밀번호가 성공적으로 변경되었습니다.<br />
              3초 후 로그인 페이지로 이동합니다.
            </p>
            <Link
              href="/login"
              className="inline-block px-4 py-2 bg-rust text-paper font-sans text-sm font-medium rounded-sm hover:bg-rust-light transition-colors"
            >
              로그인하러 가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-2xl font-black text-ink tracking-tight">法 BLOG</h1>
          </Link>
          <p className="mt-2 font-sans text-sm text-muted">새로운 비밀번호를 설정하세요</p>
        </div>

        {/* Form Card */}
        <div className="bg-white border border-rule rounded-sm p-6 sm:p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-sm">
              <p className="font-sans text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-sans text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">
                새 비밀번호
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-10 py-2.5 bg-cream border border-rule rounded-sm text-sm font-sans text-ink placeholder-muted focus:outline-none focus:border-rust transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
                  aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="mt-1 font-sans text-2xs text-muted">최소 6자 이상 입력하세요</p>
            </div>

            <div>
              <label className="block font-sans text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">
                비밀번호 확인
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-10 py-2.5 bg-cream border border-rule rounded-sm text-sm font-sans text-ink placeholder-muted focus:outline-none focus:border-rust transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
                  aria-label={showConfirmPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-rust text-paper font-sans text-sm font-medium rounded-sm hover:bg-rust-light transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                "비밀번호 변경"
              )}
            </button>
          </form>
        </div>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="font-sans text-xs text-muted hover:text-ink transition-colors"
          >
            ← 로그인 페이지로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
