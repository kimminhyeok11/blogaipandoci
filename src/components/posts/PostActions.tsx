"use client";

import { useState, memo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/components/auth/AuthProvider";

interface PostActionsProps {
  postId: string;
  slug: string;
  authorId: string;
}

function PostActionsComponent({ postId, slug, authorId }: PostActionsProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const currentUser = user?.id || null;

  const handleDelete = async () => {
    if (!confirm("정말로 이 글을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      return;
    }

    // 작성자 본인 확인 (API 호출 전 이중 검증)
    if (!currentUser || currentUser !== authorId) {
      showToast("삭제 권한이 없습니다.", "error");
      return;
    }

    setIsDeleting(true);
    try {
      // API 호출로 삭제 (slug 기반)
      const response = await fetch(`/api/posts/${slug}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${currentUser}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "삭제 실패");
      }

      showToast("글이 삭제되었습니다.", "success");
      router.push("/posts");
      router.refresh();
    } catch (err) {
      console.error("Delete error:", err);
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
