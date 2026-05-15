"use client";

import { forwardRef, useState, useCallback, useRef, useEffect } from "react";
import { MarkdownEditor, MarkdownEditorRef } from "@/components/editor/MarkdownEditor";
import { 
  Bold, Italic, Link, Image, Quote, 
  Heading, List, ListOrdered, Code, 
  ChevronUp, ChevronDown, Keyboard
} from "lucide-react";

interface WriteEditorProps {
  content: string;
  setContent: (value: string) => void;
  preview: boolean;
  onImageUpload: (file: File) => Promise<string>;
  onImageInsert?: (url: string, alt: string) => void;
}

export const WriteEditor = forwardRef<MarkdownEditorRef, WriteEditorProps>(
  function WriteEditor({ content, setContent, preview, onImageUpload, onImageInsert }, ref) {
    const [showShortcuts, setShowShortcuts] = useState(false);
    const [showMoreTools, setShowMoreTools] = useState(false);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const moreMenuRef = useRef<HTMLDivElement>(null);

    // 외부 클릭 시 더보기 메뉴 닫기
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
          setShowMoreTools(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // 키보드 가시성 감지 (모바일)
    useEffect(() => {
      const handleResize = () => {
        // 키보드가 열리면 화면 높이가 줄어듦
        const isKeyboard = window.innerHeight < window.outerHeight * 0.7;
        setIsKeyboardVisible(isKeyboard);
      };
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, []);

    // 툴바 액션
    const toolbarActions = useCallback((action: string) => {
      const editor = ref as React.RefObject<MarkdownEditorRef>;
      if (!editor.current) return;

      switch (action) {
        case "bold": editor.current.insertBold(); break;
        case "italic": editor.current.insertItalic(); break;
        case "link": editor.current.insertLink(); break;
        case "image": editor.current.insertImage(); break;
        case "quote": editor.current.insertQuote(); break;
        case "heading": editor.current.insertHeading(2); break;
        case "list": editor.current.insertUnorderedList(); break;
        case "ordered": editor.current.insertOrderedList(); break;
        case "code": editor.current.insertHeading(0); break; // 임시
      }
      setShowMoreTools(false);
    }, [ref]);

    return (
      <div className="flex flex-col h-full relative">
        {/* 메인 에디터 영역 - 풀스크린 입력 */}
        <div className="flex-1 min-h-0 overflow-auto px-4 sm:px-6 lg:px-8 pb-20 sm:pb-16">
          <MarkdownEditor
            ref={ref}
            value={content}
            onChange={setContent}
            preview={preview}
            placeholder="마크다운으로 글을 작성하세요..."
            onImageUpload={onImageUpload}
            onImageInsert={onImageInsert}
            className="min-h-[calc(100vh-280px)] sm:min-h-[calc(100vh-240px)]"
          />
        </div>

        {/* 플로팅 이미지 업로드 버튼 (모바일) */}
        <button
          onClick={() => toolbarActions("image")}
          className="sm:hidden fixed bottom-20 right-4 z-40 w-12 h-12 bg-rust text-paper rounded-full shadow-lg flex items-center justify-center hover:bg-rust-light transition-colors"
          title="이미지 업로드"
        >
          <Image size={20} />
        </button>

        {/* 하단 컴팩트 툴바 - 키보드 입력 최대화 */}
        <div className="fixed bottom-12 left-0 right-0 z-30 bg-paper border-t border-rule/50 shadow-sm">
          {/* 단축키 가이드 (접을 수 있음) */}
          {showShortcuts && (
            <div className="px-3 py-2 bg-cream/50 border-b border-rule/30 text-xs text-muted">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span><kbd className="px-1 bg-paper border rounded">⌘B</kbd> 굵게</span>
                <span><kbd className="px-1 bg-paper border rounded">⌘I</kbd> 기울임</span>
                <span><kbd className="px-1 bg-paper border rounded">⌘K</kbd> 링크</span>
                <span><kbd className="px-1 bg-paper border rounded">Tab</kbd> 들여쓰기</span>
                <span><kbd className="px-1 bg-paper border rounded">⇧Tab</kbd> 내어쓰기</span>
              </div>
            </div>
          )}

          {/* 메인 툴바 - 핵심 기능만 */}
          <div className="flex items-center justify-between px-2 py-1.5">
            {/* 좌측: 핵심 포맷팅 (자주 사용) */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => toolbarActions("bold")}
                className="p-2 text-muted hover:text-ink hover:bg-cream rounded-sm transition-colors"
                title="굵게 (⌘B)"
              >
                <Bold size={18} />
              </button>
              <button
                onClick={() => toolbarActions("italic")}
                className="p-2 text-muted hover:text-ink hover:bg-cream rounded-sm transition-colors"
                title="기울임 (⌘I)"
              >
                <Italic size={18} />
              </button>
              <button
                onClick={() => toolbarActions("link")}
                className="p-2 text-muted hover:text-ink hover:bg-cream rounded-sm transition-colors"
                title="링크 (⌘K)"
              >
                <Link size={18} />
              </button>
              <button
                onClick={() => toolbarActions("quote")}
                className="p-2 text-muted hover:text-ink hover:bg-cream rounded-sm transition-colors"
                title="인용"
              >
                <Quote size={18} />
              </button>
              
              {/* 구분선 */}
              <div className="w-px h-5 bg-rule mx-1" />
              
              {/* 더보기 버튼 */}
              <div className="relative" ref={moreMenuRef}>
                <button
                  onClick={() => setShowMoreTools(!showMoreTools)}
                  className={`p-2 rounded-sm transition-colors ${showMoreTools ? "text-ink bg-cream" : "text-muted hover:text-ink hover:bg-cream"}`}
                  title="더보기"
                >
                  {showMoreTools ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                </button>
                
                {/* 더보기 드롭다운 */}
                {showMoreTools && (
                  <div className="absolute bottom-full left-0 mb-1 bg-paper border border-rule rounded-sm shadow-lg py-1 min-w-[140px]">
                    <button
                      onClick={() => toolbarActions("heading")}
                      className="w-full px-3 py-2 text-left text-sm text-ink hover:bg-cream flex items-center gap-2"
                    >
                      <Heading size={16} /> 제목
                    </button>
                    <button
                      onClick={() => toolbarActions("list")}
                      className="w-full px-3 py-2 text-left text-sm text-ink hover:bg-cream flex items-center gap-2"
                    >
                      <List size={16} /> 목록
                    </button>
                    <button
                      onClick={() => toolbarActions("ordered")}
                      className="w-full px-3 py-2 text-left text-sm text-ink hover:bg-cream flex items-center gap-2"
                    >
                      <ListOrdered size={16} /> 번호 목록
                    </button>
                    <div className="border-t border-rule my-1" />
                    <button
                      onClick={() => toolbarActions("image")}
                      className="w-full px-3 py-2 text-left text-sm text-ink hover:bg-cream flex items-center gap-2"
                    >
                      <Image size={16} /> 이미지
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 우측: 단축키 토글 */}
            <button
              onClick={() => setShowShortcuts(!showShortcuts)}
              className={`p-2 rounded-sm transition-colors ${showShortcuts ? "text-rust bg-rust/10" : "text-muted hover:text-ink hover:bg-cream"}`}
              title="단축키 가이드"
            >
              <Keyboard size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }
);
