"use client";

import { useState, useCallback, useRef } from "react";
import { Bold, Italic, Quote, List, ListOrdered, Link as LinkIcon, Image as ImageIcon, Heading, Code, Eye, Edit3, CheckSquare } from "lucide-react";
import { cn } from "@/utils/cn";
import { processMarkdown } from "@/lib/markdown";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  maxHeight?: string;
  onImageUpload?: (file: File) => Promise<string>;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "마크다운으로 글을 작성하세요...",
  minHeight = "400px",
  maxHeight = "800px",
  onImageUpload,
}: MarkdownEditorProps) {
  const [preview, setPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const insertText = useCallback((before: string, after: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
    
    onChange(newText);
    
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [value, onChange]);

  const insertHeading = () => insertText("## ", "\n\n");
  const insertBold = () => insertText("**", "**");
  const insertItalic = () => insertText("*", "*");
  const insertQuote = () => insertText("> ", "\n");
  const insertUnorderedList = () => insertText("- ", "\n");
  const insertOrderedList = () => insertText("1. ", "\n");
  const insertChecklist = () => insertText("- [ ] ", "\n");
  const insertLink = () => insertText("[", "](url)");
  const insertCode = () => insertText("```\n", "\n```\n");

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImageUpload) return;

    setIsUploading(true);
    try {
      const url = await onImageUpload(file);
      const alt = file.name.replace(/\.[^/.]+$/, "");
      insertText(`![${alt}](${url})`, "\n");
    } catch {
      // 에러 처리
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // 클립보드 이미지 붙여넣기 처리
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    if (!onImageUpload) return;

    const items = e.clipboardData?.items;
    if (!items) return;

    // 클립보드에서 이미지 파일 찾기
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // 이미지 타입 확인
      if (item.type.indexOf("image") !== -1) {
        e.preventDefault();
        
        const blob = item.getAsFile();
        if (!blob) continue;

        // File 객체 생성 (이름 포함)
        const timestamp = Date.now();
        const file = new File([blob], `pasted-image-${timestamp}.png`, { type: item.type });

        setIsUploading(true);
        try {
          const url = await onImageUpload(file);
          insertText(`![이미지](${url})`, "\n");
        } catch {
          // 에러 처리
        } finally {
          setIsUploading(false);
        }
        
        return; // 첫 번째 이미지만 처리
      }
    }
  }, [onImageUpload, insertText]);

  const toolbarButtons = [
    { icon: Heading, action: insertHeading, title: "제목" },
    { icon: Bold, action: insertBold, title: "굵게" },
    { icon: Italic, action: insertItalic, title: "기울임" },
    { icon: Quote, action: insertQuote, title: "인용" },
    { icon: List, action: insertUnorderedList, title: "목록" },
    { icon: ListOrdered, action: insertOrderedList, title: "번호 목록" },
    { icon: CheckSquare, action: insertChecklist, title: "체크리스트" },
    { icon: LinkIcon, action: insertLink, title: "링크" },
    { icon: Code, action: insertCode, title: "코드 블록" },
  ];

  return (
    <div className="border border-rule rounded-sm bg-white overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-rule bg-cream flex-wrap">
        {toolbarButtons.map(({ icon: Icon, action, title }) => (
          <button
            key={title}
            type="button"
            onClick={action}
            className="p-2 text-muted hover:text-ink hover:bg-paper rounded-sm transition-colors touch-manipulation"
            title={title}
            aria-label={title}
          >
            <Icon size={18} />
          </button>
        ))}
        
        <div className="w-px h-6 bg-rule mx-1" />
        
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="p-2 text-muted hover:text-ink hover:bg-paper rounded-sm transition-colors touch-manipulation disabled:opacity-50"
          title="이미지 업로드"
          aria-label="이미지 업로드"
        >
          <ImageIcon size={18} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
          aria-hidden="true"
        />

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => setPreview(!preview)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-medium rounded-sm transition-colors",
            preview ? "bg-rust text-paper" : "text-muted hover:text-ink hover:bg-paper"
          )}
        >
          {preview ? <Edit3 size={14} /> : <Eye size={14} />}
          {preview ? "편집" : "미리보기"}
        </button>
      </div>

      {/* Editor Area */}
      <div className="relative">
        {preview ? (
          <div
            className="prose-journal p-4 overflow-y-auto bg-paper"
            style={{ minHeight, maxHeight }}
          >
            {value ? (
              <div
                className="markdown-preview prose-journal whitespace-pre-wrap font-serif text-base leading-loose text-ink"
                dangerouslySetInnerHTML={{
                  __html: processMarkdown(value)
                }}
              />
            ) : (
              <p className="text-muted italic">미리보기할 내용이 없습니다.</p>
            )}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onPaste={handlePaste}
            placeholder={placeholder}
            className="w-full p-4 bg-paper text-ink font-serif text-base leading-loose resize-y focus:outline-none focus:ring-2 focus:ring-rust/20"
            style={{ minHeight, maxHeight }}
            spellCheck={false}
          />
        )}
        
        {isUploading && (
          <div className="absolute inset-0 bg-paper/80 flex items-center justify-center">
            <div className="flex items-center gap-2 text-muted font-sans text-sm">
              <div className="w-4 h-4 border-2 border-rust/30 border-t-rust rounded-full animate-spin" />
              이미지 업로드 중...
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-rule bg-cream text-xs font-sans text-muted">
        <span>
          {value.length.toLocaleString()} 자
        </span>
        <span className="hidden sm:inline">
          마크다운 지원
        </span>
      </div>
    </div>
  );
}
