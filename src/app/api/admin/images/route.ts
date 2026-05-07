import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

// GET /api/admin/images - 고아 이미지 목록 조회
export async function GET(request: Request) {
  try {
    // 요청에서 사용자 ID 추출 (헤더)
    const authHeader = request.headers.get('authorization');
    const userId = authHeader?.replace('Bearer ', '');
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized: No user ID" }, { status: 401 });
    }

    const serviceSupabase = getServiceSupabase();

    // 관리자 권한 확인
    const { data: userData, error: roleError } = await serviceSupabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single() as { data: { role: string } | null; error: Error | null };

    if (roleError || userData?.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // 모든 게시글의 content에서 이미지 URL 추출
    const { data: posts, error: postsError } = await serviceSupabase
      .from('posts')
      .select('content');

    if (postsError) throw postsError;

    // 사용 중인 이미지 경로 추출
    const usedPaths = new Set<string>();
    const urlPattern = /https:\/\/[^\/]+\.supabase\.co\/storage\/v1\/object\/public\/images\/([^"'\s)]+)/g;

    (posts as { content: string | null }[])?.forEach(post => {
      if (post.content) {
        const matches = post.content.matchAll(urlPattern);
        Array.from(matches).forEach(match => {
          usedPaths.add(match[1]); // e.g., "uploads/123456.webp"
        });
      }
    });

    // Storage에서 모든 파일 목록 조회
    const { data: files, error: filesError } = await serviceSupabase
      .storage
      .from('images')
      .list('uploads', { limit: 1000 });

    if (filesError) throw filesError;

    // 고아 이미지 필터링
    const orphans = files
      ?.filter((file: any) => !usedPaths.has(`uploads/${file.name}`))
      .map((file: any) => ({
        name: file.name,
        path: `uploads/${file.name}`,
        url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/uploads/${file.name}`,
        size: file.metadata?.size || 0,
        created_at: file.created_at,
      })) || [];

    // 총 용량 계산
    const totalSize = orphans.reduce((sum: number, img: any) => sum + img.size, 0);

    return NextResponse.json({
      orphans,
      count: orphans.length,
      totalSize,
    });
  } catch (error) {
    console.error("Admin images API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch orphaned images" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/images - 고아 이미지 삭제
export async function DELETE(request: Request) {
  try {
    // 요청에서 사용자 ID 추출 (헤더)
    const authHeader = request.headers.get('authorization');
    const userId = authHeader?.replace('Bearer ', '');
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized: No user ID" }, { status: 401 });
    }

    const serviceSupabase = getServiceSupabase();

    // 관리자 권한 확인
    const { data: userData, error: roleError } = await serviceSupabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single() as { data: { role: string } | null; error: Error | null };

    if (roleError || userData?.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // 삭제할 이미지 경로 목록
    const { paths } = await request.json();
    
    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      return NextResponse.json(
        { error: "No paths provided" },
        { status: 400 }
      );
    }

    // Storage에서 삭제
    const { data, error } = await serviceSupabase
      .storage
      .from('images')
      .remove(paths);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      deleted: paths.length,
      data,
    });
  } catch (error) {
    console.error("Admin images delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete images" },
      { status: 500 }
    );
  }
}
