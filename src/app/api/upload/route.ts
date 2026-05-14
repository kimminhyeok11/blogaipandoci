import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const makeAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// POST /api/upload - 이미지 업로드 (WebP 변환 + 최적화)
export async function POST(request: Request) {
  try {
    // JWT 토큰 검증
    const token = (request.headers.get('authorization') || '').replace('Bearer ', '').trim();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: { user }, error: authErr } = await anon.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "인증 실패" }, { status: 401 });

    const serviceSupabase = makeAdmin();
    const { data: profile } = await serviceSupabase.from("users").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "관리자만 업로드 가능" }, { status: 403 });

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // 파일 유형 검증
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are allowed" },
        { status: 400 }
      );
    }

    // 파일 크기 검증 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size too large (max 10MB)" },
        { status: 400 }
      );
    }

    // 파일 버퍼 읽기
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // sharp로 이미지 최적화 (WebP 변환, 리사이즈, 압축)
    const processedBuffer = await sharp(buffer)
      .resize(1920, 1080, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({
        quality: 85,
        effort: 4,
      })
      .toBuffer();

    // 파일명 생성 (webp 확장자)
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const fileName = `${timestamp}-${randomString}.webp`;
    const filePath = `uploads/${fileName}`;

    // 서비스 역할로 Supabase Storage에 업로드 (RLS 우회)
    const { error: uploadError } = await serviceSupabase.storage
      .from("images")
      .upload(filePath, processedBuffer, {
        cacheControl: "3600",
        upsert: false,
        contentType: "image/webp",
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    // 공개 URL 가져오기
    const { data: { publicUrl } } = serviceSupabase.storage
      .from("images")
      .getPublicUrl(filePath);

    // 원본 vs 최적화 크기 계산
    const originalSize = buffer.length;
    const optimizedSize = processedBuffer.length;
    const savings = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);

    return NextResponse.json({
      url: publicUrl,
      path: filePath,
      format: "webp",
      originalSize,
      optimizedSize,
      savings: `${savings}%`,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
