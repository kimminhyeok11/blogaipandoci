"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const CASE_TYPES = ["상속·유언", "채무·금전", "형사·고소", "전세·임대차", "이혼·가족", "계약·거래", "행정·기타"];
const EXPERT_LEVELS = ["직접가능", "법무사권장", "변호사권장"];

interface ProcedureMeta {
  case_type: string;
  current_stage: string;
  next_stage: string;
  estimated_duration: string;
  involved_agencies: string;
  common_mistakes: string;
  expert_level: string;
}

interface WriteMetaProps {
  title: string;
  setTitle: (value: string) => void;
  tags: string;
  setTags: (value: string) => void;
  excerpt: string;
  setExcerpt: (value: string) => void;
  procedureMeta: ProcedureMeta;
  setProcedureMeta: (value: ProcedureMeta) => void;
}

export function WriteMeta({
  title,
  setTitle,
  tags,
  setTags,
  excerpt,
  setExcerpt,
  procedureMeta,
  setProcedureMeta,
}: WriteMetaProps) {
  const [showProcedure, setShowProcedure] = useState(false);

  const updateMeta = (key: keyof ProcedureMeta, value: string) => {
    setProcedureMeta({ ...procedureMeta, [key]: value });
  };

  const hasProcedureData = Object.values(procedureMeta).some(v => v.trim() !== "");

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

      {/* 절차 정보 (접기/펼치기) */}
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setShowProcedure(!showProcedure)}
          className="flex items-center gap-1.5 text-xs font-sans font-medium text-muted hover:text-rust transition-colors"
        >
          {showProcedure ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          절차 정보 {hasProcedureData && <span className="text-rust">●</span>}
          <span className="text-muted/50">(법률 절차 글에만 입력)</span>
        </button>

        {showProcedure && (
          <div className="mt-3 p-3 bg-cream/40 rounded-sm border border-rule/30 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 사건 유형 */}
            <div>
              <label className="block text-xs text-muted mb-1">사건 유형</label>
              <select
                value={procedureMeta.case_type}
                onChange={(e) => updateMeta("case_type", e.target.value)}
                className="w-full font-sans text-sm text-ink bg-paper border border-rule/30 rounded-sm px-2 py-1.5 focus:border-rust focus:outline-none"
              >
                <option value="">선택 안 함</option>
                {CASE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* 전문가 필요도 */}
            <div>
              <label className="block text-xs text-muted mb-1">전문가 필요도</label>
              <select
                value={procedureMeta.expert_level}
                onChange={(e) => updateMeta("expert_level", e.target.value)}
                className="w-full font-sans text-sm text-ink bg-paper border border-rule/30 rounded-sm px-2 py-1.5 focus:border-rust focus:outline-none"
              >
                <option value="">선택 안 함</option>
                {EXPERT_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            {/* 현재 단계 */}
            <div>
              <label className="block text-xs text-muted mb-1">현재 단계</label>
              <input
                type="text"
                value={procedureMeta.current_stage}
                onChange={(e) => updateMeta("current_stage", e.target.value)}
                placeholder="예: 한정승인 완료"
                className="w-full font-sans text-sm text-ink bg-paper border border-rule/30 rounded-sm px-2 py-1.5 focus:border-rust focus:outline-none placeholder:text-muted/40"
              />
            </div>

            {/* 다음 단계 */}
            <div>
              <label className="block text-xs text-muted mb-1">다음 단계</label>
              <input
                type="text"
                value={procedureMeta.next_stage}
                onChange={(e) => updateMeta("next_stage", e.target.value)}
                placeholder="예: 상속재산파산 신청"
                className="w-full font-sans text-sm text-ink bg-paper border border-rule/30 rounded-sm px-2 py-1.5 focus:border-rust focus:outline-none placeholder:text-muted/40"
              />
            </div>

            {/* 예상 기간 */}
            <div>
              <label className="block text-xs text-muted mb-1">예상 소요 기간</label>
              <input
                type="text"
                value={procedureMeta.estimated_duration}
                onChange={(e) => updateMeta("estimated_duration", e.target.value)}
                placeholder="예: 2~4주, 1년 이상"
                className="w-full font-sans text-sm text-ink bg-paper border border-rule/30 rounded-sm px-2 py-1.5 focus:border-rust focus:outline-none placeholder:text-muted/40"
              />
            </div>

            {/* 방문 기관 */}
            <div>
              <label className="block text-xs text-muted mb-1">방문 기관</label>
              <input
                type="text"
                value={procedureMeta.involved_agencies}
                onChange={(e) => updateMeta("involved_agencies", e.target.value)}
                placeholder="법원, 은행, 보험사 (쉼표로 구분)"
                className="w-full font-sans text-sm text-ink bg-paper border border-rule/30 rounded-sm px-2 py-1.5 focus:border-rust focus:outline-none placeholder:text-muted/40"
              />
            </div>

            {/* 자주 하는 실수 */}
            <div className="sm:col-span-2">
              <label className="block text-xs text-muted mb-1">자주 하는 실수</label>
              <input
                type="text"
                value={procedureMeta.common_mistakes}
                onChange={(e) => updateMeta("common_mistakes", e.target.value)}
                placeholder="보험해지 시기 착각, 답변서 미제출 (쉼표로 구분)"
                className="w-full font-sans text-sm text-ink bg-paper border border-rule/30 rounded-sm px-2 py-1.5 focus:border-rust focus:outline-none placeholder:text-muted/40"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
