"use client";

import { useState, useEffect, memo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";

interface PostActionsProps {
  postId: string;
  slug: string;
  authorId: string;
}

function PostActionsComponent({ postId, slug, authorId }: PostActionsProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  // 현재 사용자 확인
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user?.id || null);
    });
  }, []);

  const handleDelete = async () => {
    if (!confirm("정말로 이 글을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await (supabase.from("posts") as any).delete().eq("id", postId);

      if (error) throw error;

      showToast("글이 삭제되었습니다.", "success");
      router.push("/posts");
      router.refresh();
    } catch {
      showToast("삭제에 실패했습니다.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // 작성자 본인이 아니면 버튼 표시 안 함
  if (currentUser !== authorId) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/write?edit=${slug}`}
        className="flex items-center gap-1 px-3 py-1.5 text-xs font-sans font-medium text-muted hover:text-rust hover:bg-cream rounded-sm transition-colors"
      >
        <Pencil size={14} />
        수정
      </Link>
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="flex items-center gap-1 px-3 py-1.5 text-xs font-sans font-medium text-muted hover:text-red-600 hover:bg-red-50 rounded-sm transition-colors disabled:opacity-50"
      >
        {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        삭제
      </button>
    </div>
  );
}

export const PostActions = memo(PostActionsComponent);
