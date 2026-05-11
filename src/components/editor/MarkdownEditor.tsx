"use client";

import { useState, useCallback, useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from "react";
import { Bold, Italic, Quote, List, ListOrdered, Link as LinkIcon, X } from "lucide-react";
import { cn } from "@/utils/cn";
import { processMarkdown } from "@/lib/markdown";
import { useToast } from "@/components/ui/Toast";

export interface MarkdownEditorRef {
  insertHeading: (level: number) => void;
  insertImage: (file?: File) => void;
  insertLink: () => void;
  insertBold: () => void;
  insertItalic: () => void;
  insertQuote: () => void;
  insertUnorderedList: () => void;
  insertOrderedList: () => void;
}

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  onImageUpload?: (file: File) => Promise<string>;
  preview?: boolean;
}

export const MarkdownEditor = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(function MarkdownEditorInternal({
  value,
  onChange,
  placeholder = "마크다운으로 글을 작성하세요...",
  minHeight = "400px",
  onImageUpload,
  preview = false,
}: MarkdownEditorProps, ref) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  // 클라이언트 렌더링 확인 (hydration 오류 방지)
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // 이미지 모달 상태
  const [showImageModal, setShowImageModal] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [imageLink, setImageLink] = useState("");
  const [imageCaption, setImageCaption] = useState("");
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();
  
  // 커서 위치 저장 (보기/편집 전환 시)
  const savedCursorPos = useRef<{ start: number; end: number } | null>(null);
  
  // 미리보기 HTML
  const previewHtml = useMemo(() => processMarkdown(value), [value]);
  
  // 보기/편집 모드 전환 시 커서 위치 저장/복원
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    if (preview) {
      // 보기 모드로 전환: 커서 위치 저장
      savedCursorPos.current = {
        start: textarea.selectionStart,
        end: textarea.selectionEnd
      };
    } else {
      // 편집 모드로 전환: 커서 위치 복원
      if (savedCursorPos.current) {
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(
            savedCursorPos.current!.start,
            savedCursorPos.current!.end
          );
        }, 0);
      }
    }
  }, [preview]);

  // 기본 텍스트 삽입
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

  // 텍스트 감싸기
  const wrapText = useCallback((before: string, after: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    if (!selectedText) {
      insertText(before, after);
      return;
    }

    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
    onChange(newText);
    
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = end + before.length + after.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [value, onChange, insertText]);

  // 키보드 단축키 및 Tab 처리
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab: 들여쓰기 / Shift+Tab: 내어쓰기
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const lines = value.substring(0, start).split('\n');
      const currentLineStart = value.lastIndexOf('\n', start - 1) + 1;
      
      if (e.shiftKey) {
        // 내어쓰기
        const currentLine = value.substring(currentLineStart, end);
        const newLine = currentLine.replace(/^  /, '').replace(/^\t/, '');
        const newValue = value.substring(0, currentLineStart) + newLine + value.substring(end);
        onChange(newValue);
        setTimeout(() => {
          textarea.setSelectionRange(start - (currentLine.length - newLine.length), end - (currentLine.length - newLine.length));
        }, 0);
      } else {
        // 들여쓰기
        const newValue = value.substring(0, start) + '  ' + value.substring(end);
        onChange(newValue);
        setTimeout(() => {
          textarea.setSelectionRange(start + 2, end + 2);
        }, 0);
      }
      return;
    }

    // Ctrl/Cmd + B: 굵게
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      wrapText('**', '**');
      return;
    }

    // Ctrl/Cmd + I: 기울임
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      wrapText('*', '*');
      return;
    }

    // Ctrl/Cmd + K: 링크
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.substring(start, end) || '링크텍스트';
      insertText(`[${selectedText}](`, ')');
      return;
    }

    // Ctrl/Cmd + Shift + K: 코드 블록
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'K') {
      e.preventDefault();
      wrapText('```\n', '\n```');
      return;
    }

    // Ctrl/Cmd + .: 인용구
    if ((e.ctrlKey || e.metaKey) && e.key === '.') {
      e.preventDefault();
      insertText('> ', '');
      return;
    }
  }, [value, onChange, insertText, wrapText]);

  // 제목 삽입
  const insertHeading = useCallback((level: number = 2) => {
    const hashes = '#'.repeat(level);
    insertText(`${hashes} `, '\n\n');
  }, [insertText]);

  // Bold
  const insertBold = useCallback(() => {
    wrapText("**", "**");
  }, [wrapText]);

  // Italic
  const insertItalic = useCallback(() => {
    wrapText("*", "*");
  }, [wrapText]);

  // Quote
  const insertQuote = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    const lines = selectedText.split('\n');
    const quotedLines = lines.map(line => "> " + line).join('\n');
    
    const newText = value.substring(0, start) + quotedLines + value.substring(end);
    onChange(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + quotedLines.length);
    }, 0);
  }, [value, onChange]);

  // Unordered List
  const insertUnorderedList = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    const lines = selectedText.split('\n');
    const bulletedLines = lines.map(line => "- " + line).join('\n');
    
    const newText = value.substring(0, start) + bulletedLines + value.substring(end);
    onChange(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + bulletedLines.length);
    }, 0);
  }, [value, onChange]);

  // Ordered List
  const insertOrderedList = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    const lines = selectedText.split('\n');
    const numberedLines = lines.map((line, index) => `${index + 1}. ${line}`).join('\n');
    
    const newText = value.substring(0, start) + numberedLines + value.substring(end);
    onChange(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + numberedLines.length);
    }, 0);
  }, [value, onChange]);

  // Link
  const insertLink = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    const linkText = selectedText || "링크 텍스트";
    const url = "https://";

    const newValue = value.substring(0, start) + `[${linkText}](${url})` + value.substring(end);
    onChange(newValue);

    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(start + `[${linkText}](`.length, start + `[${linkText}](`.length + url.length);
      }
    }, 0);
  }, [value, onChange]);

  // 이미지 모달 열기
  const openImageModal = useCallback(async (file: File) => {
    if (!file || !onImageUpload) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast("이미지 크기는 10MB 이하여야 합니다.", "error");
      return;
    }

    setIsUploading(true);
    try {
      const url = await onImageUpload(file);
      const defaultAlt = file.name.replace(/\.[^/.]+$/, "");
      
      setPendingImageFile(file);
      setImageUrl(url);
      setImageAlt(defaultAlt);
      setImageCaption("");
      setImageLink("");
      setShowImageModal(true);
    } catch (err) {
      showToast("이미지 업로드에 실패했습니다.", "error");
    } finally {
      setIsUploading(false);
    }
  }, [onImageUpload, showToast]);

  // 파일 선택
  const handleImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    await openImageModal(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [openImageModal]);

  // 클립보드 붙여넣기 (이미지 지원)
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    if (!onImageUpload) return;
    
    const items = e.clipboardData?.items;
    if (!items) return;

    // 이미지 파일 확인
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await openImageModal(file);
        }
        return;
      }
    }
  }, [onImageUpload, openImageModal]);

  // 드래그
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      showToast("이미지 파일만 업로드할 수 있습니다.", "error");
      return;
    }

    const file = imageFiles[0];
    await openImageModal(file);
  }, [openImageModal, showToast]);

  // 모달 확인
  const handleImageModalConfirm = useCallback(() => {
    if (!imageUrl) return;

    const alt = imageAlt.trim() || "이미지";
    const caption = imageCaption.trim();
    const link = imageLink.trim();

    // 캡션을 title 속성으로 포함
    let markdown = caption 
      ? `![${alt}](${imageUrl} "${caption}")` 
      : `![${alt}](${imageUrl})`;
    
    if (link) {
      markdown = `[${markdown}](${link})`;
    }

    insertText(markdown, '\n\n');
    
    setShowImageModal(false);
    setPendingImageFile(null);
    setImageUrl("");
    setImageAlt("");
    setImageCaption("");
    setImageLink("");
  }, [imageUrl, imageAlt, imageCaption, imageLink, insertText]);

  // 툴바용 메서드 노출
  useImperativeHandle(ref, () => ({
    insertHeading,
    insertImage: (file?: File) => {
      if (!file || !onImageUpload) {
        fileInputRef.current?.click();
        return;
      }
      // void 반환으로 타입 일치
      openImageModal(file).catch(() => {});
    },
    insertLink,
    insertBold,
    insertItalic,
    insertQuote,
    insertUnorderedList,
    insertOrderedList,
  }));

  return (
    <>
      <div 
        ref={editorRef}
        className={cn(
          "relative bg-transparent",
          isDragging && "ring-2 ring-rust ring-inset"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 bg-rust/10 z-20 flex items-center justify-center border-2 border-rust border-dashed m-2 rounded-sm">
            <span className="text-rust font-sans font-medium">이미지를 여기에 놓으세요</span>
          </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />
        
        {preview ? (
          <div className="prose-journal bg-paper min-h-[200px]">
            {value ? (
              isClient ? (
                <div
                  className="markdown-preview font-serif text-base leading-loose text-ink select-text p-4"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              ) : (
                <div className="p-4 text-muted">미리보기 로딩 중...</div>
              )
            ) : (
              <p className="text-muted italic p-4">미리보기할 내용이 없습니다.</p>
            )}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            suppressHydrationWarning
            className="w-full p-0 bg-transparent text-ink font-serif text-base leading-loose focus:outline-none focus:ring-0 resize-none min-h-[300px]"
            style={{ minHeight }}
            spellCheck={true}
          />
        )}
        
        {isUploading && (
          <div className="absolute inset-0 bg-paper/80 flex items-center justify-center z-30">
            <div className="flex items-center gap-2 text-muted font-sans text-sm">
              <div className="w-4 h-4 border-2 border-rust/30 border-t-rust rounded-full animate-spin" />
              이미지 업로드 중...
            </div>
          </div>
        )}
      </div>

      {/* 이미지 설정 모달 */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-lg shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-rule bg-cream">
              <h3 className="font-serif text-lg font-medium text-ink">이미지 설정</h3>
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="p-1 text-muted hover:text-ink transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {pendingImageFile && (
                <div className="flex items-center gap-3 p-3 bg-cream rounded-sm">
                  <div className="w-16 h-16 bg-rule/20 rounded-sm flex items-center justify-center">
                    <span className="text-xs text-muted">{pendingImageFile.name.slice(-3)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-sans text-sm text-ink truncate">{pendingImageFile.name}</p>
                    <p className="font-sans text-xs text-muted">
                      {(pendingImageFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              )}
              
              <div>
                <label className="block font-sans text-sm font-medium text-ink mb-1">
                  설명 (alt 텍스트)
                </label>
                <input
                  type="text"
                  value={imageAlt}
                  onChange={(e) => {
                    setImageAlt(e.target.value);
                    setImageCaption(e.target.value);
                  }}
                  placeholder="이미지에 대한 설명을 입력하세요"
                  className="w-full px-3 py-2 border border-rule rounded-sm bg-paper text-ink font-sans text-sm focus:outline-none focus:ring-2 focus:ring-rust/20"
                />
              </div>
              
              <div>
                <label className="block font-sans text-sm font-medium text-ink mb-1">
                  캡션 (선택사항)
                </label>
                <input
                  type="text"
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  placeholder="이미지 아래에 표시될 설명"
                  className="w-full px-3 py-2 border border-rule rounded-sm bg-paper text-ink font-sans text-sm focus:outline-none focus:ring-2 focus:ring-rust/20"
                />
              </div>
              
              <div>
                <label className="block font-sans text-sm font-medium text-ink mb-1">
                  링크 (선택사항)
                </label>
                <input
                  type="text"
                  value={imageLink}
                  onChange={(e) => setImageLink(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-rule rounded-sm bg-paper text-ink font-sans text-sm focus:outline-none focus:ring-2 focus:ring-rust/20"
                />
              </div>
              
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowImageModal(false)}
                  className="flex-1 px-4 py-2 border border-rule text-muted font-sans text-sm rounded-sm hover:border-muted transition-colors"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleImageModalConfirm}
                  className="flex-1 px-4 py-2 bg-rust text-paper font-sans text-sm rounded-sm hover:bg-rust-light transition-colors"
                >
                  삽입
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
});
