"use client";

import { useState, useCallback, useRef } from "react";
import { Bold, Italic, Quote, List, ListOrdered, Link as LinkIcon, Image as ImageIcon, Heading, Code, Eye, Edit3, CheckSquare } from "lucide-react";
import { cn } from "@/utils/cn";

// 마크다운 처리 함수
function processMarkdown(text: string): string {
  if (!text) return "";
  
  let html = text;
  
  // Escape HTML first
  html = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  
  // Code blocks (must be before inline code)
  html = html.replace(/```\n?([\s\S]*?)\n?```/g, '<pre class="bg-cream p-4 rounded overflow-x-auto font-mono text-sm my-4"><code>$1</code></pre>');
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-cream px-1 py-0.5 rounded text-sm font-mono">$1</code>');
  
  // Headers
  html = html.replace(/^###### (.*$)/gim, '<h6 class="text-base font-bold mt-2 mb-1">$1</h6>');
  html = html.replace(/^##### (.*$)/gim, '<h5 class="text-lg font-bold mt-3 mb-1">$1</h5>');
  html = html.replace(/^#### (.*$)/gim, '<h4 class="text-lg font-bold mt-3 mb-2">$1</h4>');
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold mt-4 mb-2">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-6 mb-3">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mt-8 mb-4">$1</h1>');
  
  // Strikethrough (must be before bold/italic)
  html = html.replace(/~~(.*?)~~/g, '<del class="line-through text-muted">$1</del>');
  
  // Bold + Italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/___(.*?)___/g, '<strong><em>$1</em></strong>');
  
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
  
  // Italic (but not inside words)
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');
  
  // Checklist items
  html = html.replace(/^\s*-\s+\[\s\]\s+(.*$)/gim, '<li class="ml-4 flex items-center gap-2"><span class="inline-block w-4 h-4 border-2 border-muted rounded"></span>$1</li>');
  html = html.replace(/^\s*-\s+\[x\]\s+(.*$)/gim, '<li class="ml-4 flex items-center gap-2"><span class="inline-block w-4 h-4 bg-rust rounded flex items-center justify-center text-white text-xs">✓</span><del class="line-through text-muted">$1</del></li>');
  html = html.replace(/^\s*-\s+\[X\]\s+(.*$)/gim, '<li class="ml-4 flex items-center gap-2"><span class="inline-block w-4 h-4 bg-rust rounded flex items-center justify-center text-white text-xs">✓</span><del class="line-through text-muted">$1</del></li>');
  
  // Unordered lists (not checklist)
  html = html.replace(/^\s*[-*]\s+(?!\[)(.*$)/gim, '<li class="ml-4 list-disc">$1</li>');
  
  // Ordered lists
  html = html.replace(/^\s*\d+\.\s+(.*$)/gim, '<li class="ml-4 list-decimal">$1</li>');
  
  // Quote
  html = html.replace(/^>\s+(.*$)/gim, '<blockquote class="border-l-4 border-rust pl-4 italic text-stone my-4">$1</blockquote>');
  
  // Horizontal Rule
  html = html.replace(/^(---|\*{3,}|_{3,})$/gim, '<hr class="border-t border-rule my-6" />');
  
  // Tables
  const lines = html.split('\n');
  const result: string[] = [];
  let inTable = false;
  let tableRows: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('|')) {
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      // Skip separator lines
      if (!line.match(/^\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?$/)) {
        const cells = line.split('|').filter(c => c.trim());
        const cellHtml = cells.map(c => `<td class="border border-rule px-3 py-2">${c.trim()}</td>`).join('');
        tableRows.push(`<tr>${cellHtml}</tr>`);
      }
    } else {
      if (inTable) {
        result.push(`<table class="w-full border-collapse my-4 text-sm">${tableRows.join('')}</table>`);
        inTable = false;
        tableRows = [];
      }
      result.push(line);
    }
  }
  if (inTable) {
    result.push(`<table class="w-full border-collapse my-4 text-sm">${tableRows.join('')}</table>`);
  }
  html = result.join('\n');
  
  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="my-4 max-w-full h-auto rounded" loading="lazy" />');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-rust underline hover:text-rust-light" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Auto links (URLs)
  html = html.replace(/(https?:\/\/[^\s<>"]+)/g, '<a href="$1" class="text-rust underline hover:text-rust-light" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Highlight / Mark
  html = html.replace(/==(.*?)==/g, '<mark class="bg-yellow-200 px-1">$1</mark>');
  
  // Superscript
  html = html.replace(/\^(\w+)\^/g, '<sup>$1</sup>');
  
  // Subscript
  html = html.replace(/~(\w+)~/g, '<sub>$1</sub>');
  
  // Line breaks (must be last)
  html = html.replace(/\n/g, '<br />');
  
  return html;
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
