import { NextResponse } from "next/server";
import { supabase, getServiceSupabase } from "@/lib/supabase";

// POST /api/upload - 이미지 업로드
export async function POST(request: Request) {
  try {
    // 요청에서 사용자 ID 추출 (헤더)
    const authHeader = request.headers.get('authorization');
    const userId = authHeader?.replace('Bearer ', '');
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized: No user ID" },
        { status: 401 }
      );
    }

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

    // 파일명 생성
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const fileExt = file.name.split(".").pop();
    const fileName = `${timestamp}-${randomString}.${fileExt}`;
    const filePath = `uploads/${userId}/${fileName}`;

    // 서비스 역할로 Supabase Storage에 업로드 (RLS 우회)
    const serviceSupabase = getServiceSupabase();
    const { error: uploadError } = await serviceSupabase.storage
      .from("images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
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

    return NextResponse.json({
      url: publicUrl,
      path: filePath,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
