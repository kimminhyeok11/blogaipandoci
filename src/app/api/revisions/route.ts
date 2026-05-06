import { NextResponse } from "next/server";
import { getServiceSupabase, ApiError } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

// 타입 정의
type Post = Database['public']['Tables']['posts']['Row'];
type PostRevision = Database['public']['Tables']['post_revisions']['Row'];

// 표준 에러 응답 생성기
const createErrorResponse = (message: string, status: number, code: string) => {
  return NextResponse.json(
    { error: { message, code, status } },
    { status }
  );
};

// GET /api/revisions?slug=xxx - 특정 글의 히스토리 조회
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    // 입력 검증
    if (!slug || typeof slug !== 'string') {
      return createErrorResponse("Slug is required", 400, "MISSING_SLUG");
    }

    // 인증 헤더 검증
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return createErrorResponse("Missing or invalid authorization header", 401, "UNAUTHORIZED");
    }

    const userId = authHeader.replace('Bearer ', '').trim();
    if (!userId) {
      return createErrorResponse("User ID is required", 401, "MISSING_USER_ID");
    }

    // 서비스 역할 클라이언트 초기화
    const serviceSupabase = getServiceSupabase();

    // 글 조회 (RLS 우회)
    const { data: post, error: postError } = await serviceSupabase
      .from("posts")
      .select("id, user_id")
      .eq("slug", slug)
      .single();

    if (postError) {
      console.error("[Revisions API] Post fetch error:", postError);
      if (postError.code === 'PGRST116') {
        return createErrorResponse("Post not found", 404, "POST_NOT_FOUND");
      }
      throw new ApiError("Failed to fetch post", 500, "POST_FETCH_ERROR");
    }

    if (!post) {
      return createErrorResponse("Post not found", 404, "POST_NOT_FOUND");
    }

    // 작성자 권한 확인
    if (post.user_id !== userId) {
      return createErrorResponse("You don't have permission to view this post's revisions", 403, "FORBIDDEN");
    }

    // 리비전 조회
    const { data: revisions, error: revisionsError } = await serviceSupabase
      .from("post_revisions")
      .select("id, title, content, excerpt, created_at, revision_number")
      .eq("post_id", post.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (revisionsError) {
      console.error("[Revisions API] Revisions fetch error:", revisionsError);
      throw new ApiError("Failed to fetch revisions", 500, "REVISIONS_FETCH_ERROR");
    }

    return NextResponse.json({ 
      success: true,
      data: { revisions: revisions || [] }
    });

  } catch (error) {
    console.error("[Revisions API] GET error:", error);
    
    if (error instanceof ApiError) {
      return createErrorResponse(error.message, error.statusCode, error.code);
    }

    return createErrorResponse(
      error instanceof Error ? error.message : "An unexpected error occurred",
      500,
      "INTERNAL_ERROR"
    );
  }
}

// POST /api/revisions - 리비전 저장
export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      post_id?: string;
      title?: string;
      content?: string;
      excerpt?: string;
      revision_number?: number;
    };

    const { post_id, title, content, excerpt, revision_number } = body;

    // 입력 검증
    const missingFields: string[] = [];
    if (!post_id) missingFields.push("post_id");
    if (!title) missingFields.push("title");
    if (!content) missingFields.push("content");

    if (missingFields.length > 0) {
      return createErrorResponse(
        `Missing required fields: ${missingFields.join(', ')}`,
        400,
        "MISSING_FIELDS"
      );
    }

    // 인증 헤더 검증
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return createErrorResponse("Missing or invalid authorization header", 401, "UNAUTHORIZED");
    }

    const userId = authHeader.replace('Bearer ', '').trim();
    if (!userId) {
      return createErrorResponse("User ID is required", 401, "MISSING_USER_ID");
    }

    // 서비스 역할 클라이언트 초기화
    const serviceSupabase = getServiceSupabase();

    // 글 조회 및 작성자 확인
    const { data: post, error: postError } = await serviceSupabase
      .from("posts")
      .select("user_id")
      .eq("id", post_id)
      .single();

    if (postError) {
      console.error("[Revisions API] Post fetch error:", postError);
      if (postError.code === 'PGRST116') {
        return createErrorResponse("Post not found", 404, "POST_NOT_FOUND");
      }
      throw new ApiError("Failed to fetch post", 500, "POST_FETCH_ERROR");
    }

    if (!post) {
      return createErrorResponse("Post not found", 404, "POST_NOT_FOUND");
    }

    // 작성자 권한 확인
    if (post.user_id !== userId) {
      return createErrorResponse("You don't have permission to create revisions for this post", 403, "FORBIDDEN");
    }

    // 리비전 저장
    const { data: revision, error: insertError } = await serviceSupabase
      .from("post_revisions")
      .insert({
        post_id,
        title,
        content,
        excerpt: excerpt || null,
        revision_number: revision_number || 1,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[Revisions API] Revision insert error:", insertError);
      throw new ApiError("Failed to save revision", 500, "REVISION_SAVE_ERROR");
    }

    return NextResponse.json({
      success: true,
      data: { revision }
    }, { status: 201 });

  } catch (error) {
    console.error("[Revisions API] POST error:", error);

    if (error instanceof ApiError) {
      return createErrorResponse(error.message, error.statusCode, error.code);
    }

    return createErrorResponse(
      error instanceof Error ? error.message : "An unexpected error occurred",
      500,
      "INTERNAL_ERROR"
    );
  }
}

    // 리비전 저장 (최신 10개만 유지)
    const revisionData = {
      post_id: post_id as string,
      title: title as string,
      content: content as string,
      excerpt: (excerpt || "") as string,
      revision_number: (revision_number || 1) as number,
      created_by: userId,
    };
    
    const { data: revision, error } = await (serviceSupabase as any)
      .from("post_revisions")
      .insert(revisionData)
      .select()
      .single();

    if (error) {
      console.error("Revision save error:", error);
      return NextResponse.json(
        { error: "Failed to save revision" },
        { status: 500 }
      );
    }

    // 오래된 리비전 정리 (최신 10개만 유지)
    const { data: oldRevisions } = await serviceSupabase
      .from("post_revisions")
      .select("id")
      .eq("post_id", post_id)
      .order("created_at", { ascending: false })
      .range(10, 100);

    if (oldRevisions && oldRevisions.length > 0) {
      const idsToDelete = (oldRevisions as { id: string }[]).map((r) => r.id);
      if (idsToDelete.length > 0) {
        await (serviceSupabase as any).from("post_revisions").delete().in("id", idsToDelete);
      }
    }

    return NextResponse.json({ revision });
  } catch (error) {
    console.error("Revision save API error:", error);
    return NextResponse.json(
      { error: "Failed to save revision" },
      { status: 500 }
    );
  }
}

// DELETE /api/revisions?id=xxx - 특정 리비전 삭제
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const revisionId = searchParams.get("id");

    if (!revisionId) {
      return NextResponse.json(
        { error: "Revision ID is required" },
        { status: 400 }
      );
    }

    // 요청에서 사용자 ID 추출 (헤더)
    const authHeader = request.headers.get('authorization');
    const userId = authHeader?.replace('Bearer ', '');
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized: No user ID" }, { status: 401 });
    }

    // 서비스 역할로 삭제 (RLS 우회)
    const serviceSupabase = getServiceSupabase();
    
    // 관리자 권한 확인
    const { data: userData } = await serviceSupabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single() as { data: { role: string } | null; error: Error | null };
    
    const isAdmin = userData?.role === 'admin';
    
    // 작성자 또는 관리자만 삭제 가능
    const { data: revision } = await serviceSupabase
      .from("post_revisions")
      .select("created_by")
      .eq("id", revisionId)
      .single() as { data: { created_by: string } | null; error: Error | null };
    
    if (!revision || (revision.created_by !== userId && !isAdmin)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await (serviceSupabase as any)
      .from("post_revisions")
      .delete()
      .eq("id", revisionId);

    if (error) {
      console.error("Revision delete error:", error);
      return NextResponse.json(
        { error: "Failed to delete revision" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Revision delete API error:", error);
    return NextResponse.json(
      { error: "Failed to delete revision" },
      { status: 500 }
    );
  }
}
