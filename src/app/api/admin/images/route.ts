import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const makeAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function verifyAdminToken(request: Request) {
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '').trim();
  if (!token) return null;
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: { user }, error } = await anon.auth.getUser(token);
  if (error || !user) return null;
  const admin = makeAdmin();
  const { data: profile } = await admin.from('users').select('role').eq('id', user.id).single() as any;
  return profile?.role === 'admin' ? admin : null;
}

// GET /api/admin/images - 고아 이미지 목록 조회
export async function GET(request: Request) {
  try {
    const admin = await verifyAdminToken(request);
    if (!admin) return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    const serviceSupabase = admin;

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
          if (match[1]) {
            usedPaths.add(match[1]); // e.g., "uploads/123456.webp"
          }
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
    const admin = await verifyAdminToken(request);
    if (!admin) return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    const serviceSupabase = admin;

    // 삭제할 이미지 경로 목록
    const { paths } = await request.json();
    
    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      return NextResponse.json(
        { error: "No paths provided" },
        { status: 400 }
      );
    }

    // 경로 검증 — uploads/ 외부 파일 삭제 차단
    const invalidPaths = paths.filter((p: any) => typeof p !== "string" || !p.startsWith("uploads/"));
    if (invalidPaths.length > 0) {
      return NextResponse.json({ error: "유효하지 않은 경로가 포함되어 있습니다" }, { status: 400 });
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
