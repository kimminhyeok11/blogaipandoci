import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get("title") || "法 BLOG";
    const subtitle = searchParams.get("subtitle") || "법률, 기술, 비즈니스 깊이 있는 분석";

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "center",
            backgroundColor: "#f5f0e8",
            padding: "60px",
            fontFamily: "Noto Sans KR",
          }}
        >
          {/* 상단 로고 영역 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "40px",
            }}
          >
            <div
              style={{
                width: "50px",
                height: "50px",
                backgroundColor: "#c45c26",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "28px",
                fontWeight: "bold",
                marginRight: "16px",
              }}
            >
              法
            </div>
            <div
              style={{
                fontSize: "24px",
                fontWeight: "600",
                color: "#2a2420",
              }}
            >
              BLOG
            </div>
          </div>

          {/* 제목 */}
          <div
            style={{
              fontSize: "48px",
              fontWeight: "700",
              color: "#2a2420",
              lineHeight: 1.3,
              marginBottom: "24px",
              maxWidth: "800px",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {title}
          </div>

          {/* 부제목 */}
          <div
            style={{
              fontSize: "24px",
              color: "#6b6b6b",
              maxWidth: "700px",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {subtitle}
          </div>

          {/* 하단 사이트 URL */}
          <div
            style={{
              position: "absolute",
              bottom: "60px",
              right: "60px",
              fontSize: "18px",
              color: "#c45c26",
              fontWeight: "500",
            }}
          >
            blogaipandoci.vercel.app
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          "Cache-Control": "public, max-age=86400",
        },
      }
    );
  } catch (e) {
    console.error("OG Image generation error:", e);
    return new Response("Failed to generate image", { status: 500 });
  }
}
