"use client";

import { ArrowLeft, Loader2, Pencil, Eye, Save, Check, Send } from "lucide-react";
import Link from "next/link";

interface WriteHeaderProps {
  title: string;
  setTitle: (value: string) => void;
  preview: boolean;
  setPreview: (value: boolean) => void;
  isSubmitting: boolean;
  isEditMode: boolean;
  onSaveDraft: () => void;
  onPublish: () => void;
  lastSaved: Date | null;
}

export function WriteHeader({
  title,
  setTitle,
  preview,
  setPreview,
  isSubmitting,
  isEditMode,
  onSaveDraft,
  onPublish,
  lastSaved,
}: WriteHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-paper border-b border-rule">
      <div className="flex items-center h-12 px-3 sm:px-4 overflow-x-auto scrollbar-hide gap-2">
        {/* 좌측: 뒤로가기 + 제목 */}
        <Link
          href="/posts"
          className="p-2 text-muted hover:text-ink transition-colors shrink-0"
          title="뒤로가기"
        >
          <ArrowLeft size={18} />
        </Link>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목"
          className="flex-1 min-w-[120px] max-w-[200px] bg-transparent text-ink font-medium focus:outline-none truncate"
        />

        {lastSaved && (
          <span className="hidden sm:inline text-xs text-muted shrink-0">
            {lastSaved.toLocaleTimeString()} 저장됨
          </span>
        )}

        <div className="flex-1" />

        {/* 우측: 액션 버튼들 - 아이콘만 */}
        <button
          type="button"
          onClick={() => setPreview(!preview)}
          title={preview ? "편집" : "보기"}
          className={`p-2 rounded-sm transition-colors shrink-0 ${
            preview
              ? "bg-ink text-paper"
              : "border border-rule text-muted hover:border-muted"
          }`}
        >
          {preview ? <Pencil size={16} /> : <Eye size={16} />}
        </button>

        <button
          type="button"
          onClick={onSaveDraft}
          disabled={isSubmitting}
          title="임시저장"
          className="p-2 border border-rule text-muted rounded-sm hover:border-muted transition-colors disabled:opacity-50 shrink-0"
        >
          <Save size={16} />
        </button>

        <button
          type="button"
          onClick={onPublish}
          disabled={isSubmitting}
          title={isEditMode ? "저장" : "발행"}
          className="p-2 bg-rust text-paper rounded-sm hover:bg-rust-light transition-colors disabled:opacity-50 shrink-0"
        >
          {isSubmitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : isEditMode ? (
            <Check size={16} />
          ) : (
            <Send size={16} />
          )}
        </button>
      </div>
    </header>
  );
}
