"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Bold, Italic, Quote, List, ListOrdered, Link as LinkIcon, Image as ImageIcon, Heading, Code, Eye, Edit3, CheckSquare, ChevronDown, Maximize2, Minimize2, X } from "lucide-react";
import { cn } from "@/utils/cn";
import { processMarkdown } from "@/lib/markdown";
import { useToast } from "@/components/ui/Toast";

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
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

  // 통계 계산
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const charCount = value.length;
  const readTime = Math.max(1, Math.ceil(wordCount / 200)); // 분당 200단어 기준
  const lineCount = value ? value.split('\n').length : 1;

  // 기본 텍스트 삽입 (선택 영역을 대체)
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

  // 선택한 텍스트 감싸기 (선택 영역 유지) - Bold, Italic 등에 사용
  const wrapText = useCallback((before: string, after: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    // 선택된 텍스트가 없으면 기본값 삽입
    if (!selectedText) {
      insertText(before, after);
      return;
    }

    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
    onChange(newText);
    
    // 선택 영역을 감싼 텍스트로 유지
    setTimeout(() => {
      textarea.focus();
      const newStart = start + before.length;
      const newEnd = newStart + selectedText.length;
      textarea.setSelectionRange(newStart, newEnd);
    }, 0);
  }, [value, onChange, insertText]);

  // 제목 삽입 (레벨 1~6)
  const insertHeading = useCallback((level: number = 2) => {
    const hashes = '#'.repeat(level);
    insertText(`${hashes} `, '\n\n');
  }, [insertText]);

  // 실제 전체 화면 API 토글
  const toggleFullscreen = useCallback(() => {
    const container = editorRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(() => {
        // 실패 시 CSS 전체 화면으로 폴백
        setIsFullscreen(true);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(() => {
        setIsFullscreen(false);
      });
    }
  }, []);

  // 전체 화면 변경 이벤트 감지
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);
  // 선택한 텍스트를 굵게/기울임으로 감싸기 (선택 영역 유지)
  const insertBold = useCallback(() => wrapText("**", "**"), [wrapText]);
  const insertItalic = useCallback(() => wrapText("*", "*"), [wrapText]);
  const insertCodeInline = useCallback(() => wrapText("`", "`"), [wrapText]);
  const insertQuote = useCallback(() => insertText("> ", "\n"), [insertText]);
  const insertUnorderedList = useCallback(() => insertText("- ", "\n"), [insertText]);
  const insertOrderedList = useCallback(() => insertText("1. ", "\n"), [insertText]);
  const insertChecklist = useCallback(() => insertText("- [ ] ", "\n"), [insertText]);
  // 링크 삽입 - url 부분이 선택된 상태로 시작
  const insertLink = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = "[";
    const linkText = value.substring(start, end) || "텍스트";
    const after = "](url)";
    const newText = value.substring(0, start) + before + linkText + after + value.substring(end);

    onChange(newText);

    // "url" 부분을 선택 (대체 가능하도록)
    setTimeout(() => {
      textarea.focus();
      const urlStart = start + before.length + linkText.length + 2; // ]( 이후
      const urlEnd = urlStart + 3; // "url" 길이
      textarea.setSelectionRange(urlStart, urlEnd);
    }, 0);
  }, [value, onChange]);
  // 코드 블록 삽입 - 커서를 중간(코드 입력 위치)으로 이동
  const insertCode = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = "```\n";
    const after = "\n```\n";
    const selectedText = value.substring(start, end);
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);

    onChange(newText);

    // 커서를 ``` 사이 중간으로 이동
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [value, onChange]);

  // 현재 줄의 내용과 커서 위치 분석
  const getCurrentLineInfo = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return null;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const linesBefore = textBeforeCursor.split('\n');
    const currentLineIndex = linesBefore.length - 1;
    const currentLine = linesBefore[currentLineIndex] || '';
    return { cursorPos, currentLine, currentLineIndex, textBeforeCursor };
  }, [value]);

  // 현재 줄의 리스트/인용 마커 제거 (Shift+Tab 기능)
  const unindentCurrentLine = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const textBeforeCursor = value.substring(0, start);
    const linesBefore = textBeforeCursor.split('\n');
    const currentLineIndex = linesBefore.length - 1;
    const allLines = value.split('\n');
    const currentLine = allLines[currentLineIndex] || '';

    // 마커 패턴들 제거
    const patterns = [
      /^-\s*\[([ x])\]\s*/,  // 체크리스트
      /^-\s*/,              // UL
      /^\d+\.\s*/,          // OL
      /^>\s*/,              // 인용구
    ];

    let newLine = currentLine;
    for (const pattern of patterns) {
      if (pattern.test(newLine)) {
        newLine = newLine.replace(pattern, '');
        break;
      }
    }

    if (newLine !== currentLine) {
      allLines[currentLineIndex] = newLine;
      const newValue = allLines.join('\n');
      onChange(newValue);

      // 커서 위치 조정
      const removedLength = currentLine.length - newLine.length;
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start - removedLength, end - removedLength);
      }, 0);
    }
  }, [value, onChange]);

  // 리스트 자동 생성 및 키보드 단축키 처리
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMod = e.ctrlKey || e.metaKey;

    // 단축키: Ctrl/Cmd + B (굵게)
    if (isMod && e.key === 'b') {
      e.preventDefault();
      insertBold();
      return;
    }

    // 단축키: Ctrl/Cmd + I (기울임)
    if (isMod && e.key === 'i') {
      e.preventDefault();
      insertItalic();
      return;
    }

    // 단축키: Ctrl/Cmd + K (링크)
    if (isMod && e.key === 'k') {
      e.preventDefault();
      insertLink();
      return;
    }

    // 단축키: Ctrl/Cmd + 숫자 1~6 (제목)
    if (isMod && e.key >= '1' && e.key <= '6') {
      e.preventDefault();
      const depth = parseInt(e.key, 10);
      const hashes = '#'.repeat(depth);
      insertText(`${hashes} `, '\n\n');
      return;
    }

    // 단축키: Ctrl/Cmd + . (인용구)
    if (isMod && e.key === '.') {
      e.preventDefault();
      insertQuote();
      return;
    }

    // 단축키: Ctrl/Cmd + Shift + U (순서 없는 목록 - U: Unordered)
    if (isMod && e.shiftKey && e.key === 'u') {
      e.preventDefault();
      insertUnorderedList();
      return;
    }

    // 단축키: Ctrl/Cmd + Shift + O (순서 있는 목록 - O: Ordered)
    if (isMod && e.shiftKey && e.key === 'o') {
      e.preventDefault();
      insertOrderedList();
      return;
    }

    // 단축키: F11 (전체 화면)
    if (e.key === 'F11') {
      e.preventDefault();
      toggleFullscreen();
      return;
    }

    // 단축키: ESC (전체 화면 종료 - 브라우저 기본 동작과 함께)
    if (e.key === 'Escape' && document.fullscreenElement) {
      document.exitFullscreen();
      return;
    }

    // Tab: 들여쓰기 (2칸 공백 추가)
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;
      
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      // 선택 영역이 여러 줄인 경우
      if (start !== end) {
        const selectedText = value.substring(start, end);
        const lines = selectedText.split('\n');
        const indentedLines = lines.map(line => '  ' + line);
        const newSelectedText = indentedLines.join('\n');
        const newValue = value.substring(0, start) + newSelectedText + value.substring(end);
        onChange(newValue);
        
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start, start + newSelectedText.length);
        }, 0);
      } else {
        // 단일 커서 위치
        insertText('  ', '');
      }
      return;
    }

    // 단축키: Shift + Tab (현재 줄 마커 제거 또는 들여쓰기 해제)
    if (e.shiftKey && e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;
      
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.substring(start, end);
      
      // 먼저 마커 제거 시도
      const textBeforeCursor = value.substring(0, start);
      const linesBefore = textBeforeCursor.split('\n');
      const currentLineIndex = linesBefore.length - 1;
      const allLines = value.split('\n');
      const currentLine = allLines[currentLineIndex] || '';
      
      // 마커 패턴 확인
      const hasMarker = /^-\s*\[([ x])\]\s*|^-\s*|^\d+\.\s*|^>\s*/.test(currentLine);
      
      if (hasMarker && selectedText === '') {
        unindentCurrentLine();
        return;
      }
      
      // 들여쓰기 해제 (2칸 공백 제거)
      if (start !== end) {
        const lines = selectedText.split('\n');
        const outdentedLines = lines.map(line => line.replace(/^  /, ''));
        const newSelectedText = outdentedLines.join('\n');
        const newValue = value.substring(0, start) + newSelectedText + value.substring(end);
        onChange(newValue);
        
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start, start + newSelectedText.length);
        }, 0);
      }
      return;
    }

    // Enter 키: 리스트 자동 생성
    if (e.key !== 'Enter') return;

    const lineInfo = getCurrentLineInfo();
    if (!lineInfo) return;
    const { currentLine } = lineInfo;

    // 현재 줄이 비어있으면 리스트 종료 (아무것도 안 함)
    if (!currentLine.trim()) return;

    // UL 패턴 (- 항목)
    const ulMatch = currentLine.match(/^-\s*(.*)$/);
    if (ulMatch) {
      e.preventDefault();
      insertText("\n- ", "");
      return;
    }

    // OL 패턴 (1. 2. 3. 항목)
    const olMatch = currentLine.match(/^(\d+)\.\s*(.*)$/);
    if (olMatch) {
      e.preventDefault();
      const nextNum = parseInt(olMatch[1], 10) + 1;
      insertText(`\n${nextNum}. `, "");
      return;
    }

    // 체크리스트 패턴 (- [ ] 또는 - [x])
    const checkMatch = currentLine.match(/^-\s*\[([ x])\]\s*(.*)$/);
    if (checkMatch) {
      e.preventDefault();
      insertText("\n- [ ] ", "");
      return;
    }

    // 인용구 패턴 (> 내용)
    const quoteMatch = currentLine.match(/^>\s*(.*)$/);
    if (quoteMatch) {
      e.preventDefault();
      insertText("\n> ", "");
      return;
    }
  }, [getCurrentLineInfo, insertText, insertBold, insertItalic, insertLink, insertQuote, insertUnorderedList, insertOrderedList, unindentCurrentLine, toggleFullscreen]);

  // 이미지 선택 (파일 선택 시 모달 열기)
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImageUpload) return;

    // 파일 크기 체크 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      showToast("이미지 크기는 10MB 이하여야 합니다.", "error");
      return;
    }

    // 먼저 이미지 업로드
    setIsUploading(true);
    try {
      const url = await onImageUpload(file);
      const defaultAlt = file.name.replace(/\.[^/.]+$/, "");
      
      // 모달 열기
      setPendingImageFile(file);
      setImageUrl(url);
      setImageAlt(defaultAlt);
      setImageCaption(defaultAlt); // 설명은 alt와 동일하게
      setImageLink("");
      setShowImageModal(true);
    } catch (err) {
      showToast("이미지 업로드에 실패했습니다. 다시 시도해 주세요.", "error");
      console.error("Image upload error:", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // 이미지 모달 확인 - 마크다운 삽입
  const handleImageModalConfirm = useCallback(() => {
    if (!imageUrl) return;

    const alt = imageAlt.trim() || "이미지";
    const caption = imageCaption.trim();
    const link = imageLink.trim();

    // 이미지 마크다운 생성
    const imageMarkdown = `![${alt}](${imageUrl})`;
    
    // 링크가 있으면 이미지를 링크로 감싸기
    const finalMarkdown = link 
      ? `[${imageMarkdown}](${link})`
      : imageMarkdown;

    // 캡션이 있으면 figure 형태로 (HTML)
    let insertContent;
    if (caption && !link) {
      // 설명이 있고 링크 없음: figure 태그 사용
      insertContent = `<figure class="my-6">\n${imageMarkdown}\n<figcaption class="text-center text-sm text-muted mt-2">${caption}</figcaption>\n</figure>`;
    } else if (caption && link) {
      // 설명과 링크 둘 다 있음
      insertContent = `<figure class="my-6">\n[${imageMarkdown}](${link})\n<figcaption class="text-center text-sm text-muted mt-2">${caption}</figcaption>\n</figure>`;
    } else {
      // 기본 마크다운
      insertContent = finalMarkdown;
    }

    insertText(insertContent, "\n\n");
    showToast("이미지가 삽입되었습니다.", "success");
    
    // 모달 닫기 및 상태 초기화
    closeImageModal();
  }, [imageUrl, imageAlt, imageCaption, imageLink, insertText, showToast]);

  // 이미지 모달 닫기
  const closeImageModal = useCallback(() => {
    setShowImageModal(false);
    setPendingImageFile(null);
    setImageUrl("");
    setImageAlt("");
    setImageCaption("");
    setImageLink("");
  }, []);

  // ...

  // 드래그 앤 드롭 이미지 업로드 처리
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
    if (!onImageUpload) return;

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    // 이미지 파일만 처리
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      showToast("이미지 파일만 업로드할 수 있습니다.", "error");
      return;
    }

    // 첫 번째 이미지만 처리
    const file = imageFiles[0];
    if (file.size > 10 * 1024 * 1024) {
      showToast("이미지 크기는 10MB 이하여야 합니다.", "error");
      return;
    }

    // 업로드 후 모달 열기
    setIsUploading(true);
    try {
      const url = await onImageUpload(file);
      const defaultAlt = file.name.replace(/\.[^/.]+$/, "");
      
      setPendingImageFile(file);
      setImageUrl(url);
      setImageAlt(defaultAlt);
      setImageCaption(defaultAlt);
      setImageLink("");
      setShowImageModal(true);
    } catch (err) {
      showToast("이미지 업로드에 실패했습니다.", "error");
      console.error("Drag drop error:", err);
    } finally {
      setIsDragging(false);
      setIsUploading(false);
    }
  }, [onImageUpload, showToast]);

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
          showToast("클립보드 이미지가 업로드되었습니다.", "success");
        } catch (err) {
          showToast("클립보드 이미지 업로드에 실패했습니다.", "error");
          console.error("Clipboard paste error:", err);
        } finally {
          setIsUploading(false);
        }
        
        return; // 첫 번째 이미지만 처리
      }
    }
  }, [onImageUpload, insertText, showToast]);

  // 툴바 버튼 정의 (단축키 설명 포함)
  const toolbarButtons = [
    { icon: Bold, action: insertBold, title: "굵게 (Ctrl+B)", shortcut: "Ctrl+B" },
    { icon: Italic, action: insertItalic, title: "기울임 (Ctrl+I)", shortcut: "Ctrl+I" },
    { icon: Quote, action: insertQuote, title: "인용 (Ctrl+.)", shortcut: "Ctrl+." },
    { icon: List, action: insertUnorderedList, title: "목록 (Ctrl+Shift+U)", shortcut: "Ctrl+Shift+U" },
    { icon: ListOrdered, action: insertOrderedList, title: "번호 목록 (Ctrl+Shift+O)", shortcut: "Ctrl+Shift+O" },
    { icon: CheckSquare, action: insertChecklist, title: "체크리스트 (- [ ])", shortcut: "- [ ]" },
    { icon: LinkIcon, action: insertLink, title: "링크 (Ctrl+K)", shortcut: "Ctrl+K" },
    { icon: Code, action: insertCodeInline, title: "인라인 코드 (`)", shortcut: "`" },
  ];

  // 제목 레벨 선택 상태
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const headingMenuRef = useRef<HTMLDivElement>(null);

  // 제목 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (headingMenuRef.current && !headingMenuRef.current.contains(e.target as Node)) {
        setShowHeadingMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="border border-rule rounded-sm bg-white overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-rule bg-cream flex-wrap">
        {/* 제목 드롭다운 */}
        <div ref={headingMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setShowHeadingMenu(!showHeadingMenu)}
            className="p-2 text-muted hover:text-ink hover:bg-paper rounded-sm transition-colors touch-manipulation flex items-center gap-0.5"
            title="제목 (Ctrl+1~6)"
            aria-label="제목"
          >
            <Heading size={18} />
            <ChevronDown size={14} />
          </button>
          {showHeadingMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-rule rounded-sm shadow-lg z-10 py-1 min-w-[80px]">
              {[1, 2, 3, 4, 5, 6].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => {
                    insertHeading(level);
                    setShowHeadingMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-cream flex items-center gap-2"
                >
                  <span className="font-bold text-muted">{'#'.repeat(level)}</span>
                  <span className="text-xs text-muted">Ctrl+{level}</span>
                </button>
              ))}
            </div>
          )}
        </div>

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
          onChange={handleImageSelect}
          className="hidden"
          aria-hidden="true"
        />

        <div className="flex-1" />

        {/* 전체 화면 토글 */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="p-2 text-muted hover:text-ink hover:bg-paper rounded-sm transition-colors touch-manipulation"
          title={isFullscreen ? "전체 화면 종료 (Esc)" : "전체 화면 (F11)"}
          aria-label={isFullscreen ? "전체 화면 종료" : "전체 화면"}
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>

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

      {/* Editor Area - 드래그앤드롭 + 전체화면 지원 */}
      <div 
        ref={editorRef}
        className={cn(
          "relative",
          isDragging && "ring-2 ring-rust ring-inset"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* 드래그 오버레이 */}
        {isDragging && (
          <div className="absolute inset-0 bg-rust/10 z-20 flex items-center justify-center border-2 border-rust border-dashed m-2 rounded-sm">
            <span className="text-rust font-sans font-medium">이미지를 여기에 놓으세요</span>
          </div>
        )}
        
        {preview ? (
          <div
            className={cn(
              "prose-journal p-4 overflow-y-auto bg-paper",
              isFullscreen && "h-[calc(100vh-120px)]"
            )}
            style={!isFullscreen ? { minHeight, maxHeight } : undefined}
          >
            {value ? (
              <div
                className="markdown-preview font-serif text-base leading-loose text-ink"
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
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn(
              "w-full p-4 bg-paper text-ink font-serif text-base leading-loose resize-y focus:outline-none focus:ring-2 focus:ring-rust/20",
              isFullscreen && "h-[calc(100vh-120px)] resize-none"
            )}
            style={!isFullscreen ? { minHeight, maxHeight } : undefined}
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

      {/* Status Bar - 상세 통계 */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-rule bg-cream text-xs font-sans text-muted">
        <div className="flex items-center gap-3">
          <span title="글자 수">{charCount.toLocaleString()} 자</span>
          <span className="hidden sm:inline" title="단어 수">{wordCount.toLocaleString()} 단어</span>
          <span className="hidden sm:inline" title="줄 수">{lineCount} 줄</span>
          <span className="hidden md:inline text-rust">약 {readTime}분 소요</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline">Tab: 들여쓰기</span>
          <span className="hidden sm:inline">Shift+Tab: 내어쓰기</span>
          <span className="hidden md:inline">드래그로 이미지 업로드</span>
        </div>
      </div>

      {/* 이미지 설정 모달 */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-lg shadow-xl overflow-hidden">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-rule bg-cream">
              <h3 className="font-serif text-lg font-medium text-ink">이미지 설정</h3>
              <button
                type="button"
                onClick={closeImageModal}
                className="p-1 text-muted hover:text-ink transition-colors"
                aria-label="닫기"
              >
                <X size={20} />
              </button>
            </div>

            {/* 모달 본문 */}
            <div className="p-4 space-y-4">
              {/* 이미지 미리보기 */}
              {imageUrl && (
                <div className="flex justify-center">
                  <img
                    src={imageUrl}
                    alt="미리보기"
                    className="max-h-40 rounded shadow-sm"
                  />
                </div>
              )}

              {/* Alt 텍스트 (이미지 설명) */}
              <div>
                <label className="block text-sm font-sans font-medium text-ink mb-1">
                  이미지 설명 (alt)
                </label>
                <input
                  type="text"
                  value={imageAlt}
                  onChange={(e) => {
                    setImageAlt(e.target.value);
                    setImageCaption(e.target.value); // 설명과 동기화
                  }}
                  placeholder="이미지에 대한 설명을 입력하세요"
                  className="w-full px-3 py-2 border border-rule rounded-sm bg-paper text-ink font-sans text-sm focus:outline-none focus:ring-2 focus:ring-rust/20"
                />
                <p className="mt-1 text-xs text-muted font-sans">
                  접근성을 위해 이미지 내용을 간결히 설명해주세요
                </p>
              </div>

              {/* 링크 URL */}
              <div>
                <label className="block text-sm font-sans font-medium text-ink mb-1">
                  링크 URL (선택사항)
                </label>
                <input
                  type="url"
                  value={imageLink}
                  onChange={(e) => setImageLink(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-rule rounded-sm bg-paper text-ink font-sans text-sm focus:outline-none focus:ring-2 focus:ring-rust/20"
                />
                <p className="mt-1 text-xs text-muted font-sans">
                  이미지를 클릭하면 해당 주소로 이동합니다
                </p>
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-rule bg-cream">
              <button
                type="button"
                onClick={closeImageModal}
                className="px-4 py-2 text-sm font-sans font-medium text-muted hover:text-ink transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleImageModalConfirm}
                className="px-4 py-2 bg-rust text-paper text-sm font-sans font-medium rounded-sm hover:bg-rust-light transition-colors"
              >
                삽입하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
