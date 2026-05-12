"use client";

interface WriteMetaProps {
  title: string;
  setTitle: (value: string) => void;
  tags: string;
  setTags: (value: string) => void;
  excerpt: string;
  setExcerpt: (value: string) => void;
}

export function WriteMeta({
  title,
  setTitle,
  tags,
  setTags,
  excerpt,
  setExcerpt,
}: WriteMetaProps) {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-rule">
      {/* 제목 입력 */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="제목을 입력하세요"
        className="w-full text-2xl sm:text-3xl font-black text-ink placeholder-muted/50 bg-transparent border-none focus:outline-none focus:ring-0 mb-3"
      />

      {/* 태그/요약 - 가로 레이아웃 */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
        {/* 태그 */}
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs font-sans font-medium text-muted whitespace-nowrap">태그</span>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="저작권, 판례, 기술 (쉼표로 구분)"
            className="flex-1 font-sans text-sm text-ink placeholder:text-muted/40 bg-transparent border-b-2 border-rule/20 focus:border-rust focus:outline-none py-1.5 transition-colors"
          />
        </div>
        {/* 요약 */}
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs font-sans font-medium text-muted whitespace-nowrap">요약</span>
          <input
            type="text"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="미입력 시 본문에서 자동 생성됩니다"
            className="flex-1 font-sans text-sm text-ink placeholder:text-muted/40 bg-transparent border-b-2 border-rule/20 focus:border-rust focus:outline-none py-1.5 transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
