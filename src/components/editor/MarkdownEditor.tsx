"use client";

import { useState, useCallback, useRef } from "react";
import { Bold, Italic, Quote, List, ListOrdered, Link as LinkIcon, Image as ImageIcon, Heading, Code, Eye, Edit3, CheckSquare } from "lucide-react";
import { marked } from "marked";
import { cn } from "@/utils/cn";

// marked 설정 - GitHub Flavored Markdown (GFM) 지원
marked.setOptions({
  gfm: true,
  breaks: true,
});

// marked 렌더러 커스터마이징
const renderer = new marked.Renderer();

// 링크 새창에서 열기
renderer.link = ({ href, title, text }) => {
  return `<a href="${href}" class="text-rust underline hover:text-rust-light" target="_blank" rel="noopener noreferrer"${title ? ` title="${title}"` : ''}>${text}</a>`;
};

// 이미지 스타일링
renderer.image = ({ href, title, text }) => {
  return `<img src="${href}" alt="${text}" class="my-4 max-w-full h-auto rounded" loading="lazy"${title ? ` title="${title}"` : ''} />`;
};

// 코드 블록 스타일링
renderer.code = ({ text, lang }) => {
  return `<pre class="bg-cream p-4 rounded overflow-x-auto font-mono text-sm my-4"><code${lang ? ` class="language-${lang}"` : ''}>${text}</code></pre>`;
};

// 인라인 코드 스타일링
renderer.codespan = ({ text }) => {
  return `<code class="bg-cream px-1 py-0.5 rounded text-sm font-mono">${text}</code>`;
};

// 인용구 스타일링
renderer.blockquote = ({ text }) => {
  return `<blockquote class="border-l-4 border-rust pl-4 italic text-stone my-4">${text}</blockquote>`;
};

// 구분선 스타일링
renderer.hr = () => {
  return `<hr class="border-t border-rule my-6" />`;
};

// 리스트 스타일링 - 배경색과 구분선
renderer.list = ({ items, ordered }) => {
  const type = ordered ? 'ol' : 'ul';
  const listClass = ordered 
    ? 'list-decimal list-inside my-4 space-y-1 bg-cream/30 rounded-sm p-2 border-l-4 border-rust/30' 
    : 'list-disc list-inside my-4 space-y-1 bg-cream/30 rounded-sm p-2 border-l-4 border-rust/30';
  const body = items.map((item: { text: string }) => `<li class="py-1 pl-2 border-b border-rule/30 last:border-0">${item.text}</li>`).join('');
  return `<${type} class="${listClass}">${body}</${type}>`;
};

// 체크리스트 스타일링 (GFM) - 배경색 추가
renderer.listitem = ({ text, checked, task }) => {
  if (task) {
    const checkbox = checked 
      ? '<span class="inline-block w-4 h-4 bg-rust rounded flex items-center justify-center text-white text-xs flex-shrink-0">✓</span>'
      : '<span class="inline-block w-4 h-4 border-2 border-muted rounded flex-shrink-0"></span>';
    const textClass = checked ? 'line-through text-muted' : '';
    return `<li class="py-1 pl-2 border-b border-rule/30 last:border-0 flex items-center gap-2 list-none">${checkbox}<span class="${textClass}">${text}</span></li>`;
  }
  return `<li class="py-1 pl-2 border-b border-rule/30 last:border-0">${text}</li>`;
};

// 테이블 스타일링
renderer.table = ({ header, rows }) => {
  const headerHtml = header.map(cell => `<th class="border border-rule px-3 py-2 bg-cream font-bold text-left">${cell.text}</th>`).join('');
  const bodyHtml = rows.map(row => 
    `<tr>${row.map(cell => `<td class="border border-rule px-3 py-2">${cell.text}</td>`).join('')}</tr>`
  ).join('');
  return `<table class="w-full border-collapse my-4 text-sm"><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
};

// 헤딩 스타일링
renderer.heading = ({ text, depth }) => {
  const classes: Record<number, string> = {
    1: "text-3xl font-bold mt-8 mb-4",
    2: "text-2xl font-bold mt-6 mb-3",
    3: "text-xl font-bold mt-4 mb-2",
    4: "text-lg font-bold mt-3 mb-2",
    5: "text-base font-bold mt-3 mb-1",
    6: "text-sm font-bold mt-2 mb-1",
  };
  return `<h${depth} class="${classes[depth]}">${text}</h${depth}>`;
};

// 단락 스타일링
renderer.paragraph = ({ text }) => {
  return `<p class="my-4 leading-loose">${text}</p>`;
};

// 볼드 텍스트 렌더링
renderer.strong = ({ text }) => {
  return `<strong class="font-bold text-ink">${text}</strong>`;
};

// 이탤릭 텍스트 렌더링
renderer.em = ({ text }) => {
  return `<em class="italic">${text}</em>`;
};

// 마크다운 처리 함수
function processMarkdown(text: string): string {
  if (!text) return "";
  try {
    return marked.parse(text, { renderer }) as string;
  } catch {
    return text;
  }
}

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
    } catch (error) {
      console.error("Image upload failed:", error);
      alert("이미지 업로드에 실패했습니다.");
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
        } catch (error) {
          console.error("Clipboard image upload failed:", error);
          alert("클립보드 이미지 업로드에 실패했습니다.");
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
