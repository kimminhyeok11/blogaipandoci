"use client";

import { useEffect, useState, memo } from "react";
import { Check, Copy, Share2 } from "lucide-react";

interface ShareButtonsProps {
  title: string;
}

function ShareButtonsComponent({ title }: ShareButtonsProps) {
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setShareUrl(window.location.href);
  }, []);

  const openShareWindow = (url: string) => {
    window.open(url, "_blank", "width=550,height=520,scrollbars=yes");
  };

  const handleTwitterShare = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`;
    openShareWindow(url);
  };

  const handleFacebookShare = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    openShareWindow(url);
  };

  const handleKakaoShare = () => {
    const url = `https://share.kakao.com/talk/link?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`;
    openShareWindow(url);
  };

  const handleNaverShare = () => {
    const url = `https://share.naver.com/web/shareView?title=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`;
    openShareWindow(url);
  };

  const handleLineShare = () => {
    const url = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}`;
    openShareWindow(url);
  };

  const handleKakaoStoryShare = () => {
    const url = `https://story.kakao.com/share?url=${encodeURIComponent(shareUrl)}`;
    openShareWindow(url);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = shareUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!shareUrl) {
    return (
      <div className="py-6">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="flex items-center justify-center gap-2 mb-4">
        <Share2 size={16} className="text-muted" />
        <span className="font-sans text-xs text-muted">공유하기</span>
      </div>
      
      <div className="flex flex-wrap items-center justify-center gap-3">
        {/* 트위터/X */}
        <button
          onClick={handleTwitterShare}
          className="flex items-center justify-center w-10 h-10 bg-[#1da1f2] text-white rounded-full hover:opacity-90 transition-opacity"
          title="트위터/X에 공유"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </button>

        {/* 페이스북 */}
        <button
          onClick={handleFacebookShare}
          className="flex items-center justify-center w-10 h-10 bg-[#4267B2] text-white rounded-full hover:opacity-90 transition-opacity"
          title="페이스북에 공유"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        </button>

        {/* 카카오톡 */}
        <button
          onClick={handleKakaoShare}
          className="flex items-center justify-center w-10 h-10 bg-[#FEE500] text-[#3C1E1E] rounded-full hover:opacity-90 transition-opacity"
          title="카카오톡에 공유"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M12 2C6.48 2 2 5.58 2 10c0 2.58 1.66 4.88 4.26 6.34-.19.72-.7 2.6-.73 2.77-.03.17.09.23.2.17.1-.06 3.45-2.34 4-2.73.75.21 1.54.32 2.27.32 5.52 0 10-3.58 10-8s-4.48-8-10-8z" />
          </svg>
        </button>

        {/* 네이버 */}
        <button
          onClick={handleNaverShare}
          className="flex items-center justify-center w-10 h-10 bg-[#03C75A] text-white rounded-full hover:opacity-90 transition-opacity"
          title="네이버에 공유"
        >
          <span className="font-bold text-sm">N</span>
        </button>

        {/* LINE */}
        <button
          onClick={handleLineShare}
          className="flex items-center justify-center w-10 h-10 bg-[#06C755] text-white rounded-full hover:opacity-90 transition-opacity"
          title="LINE에 공유"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M12 2C6.48 2 2 5.9 2 10.7c0 2.6 1.4 4.9 3.6 6.4.2.1.3.4.2.6l-.6 2.2c-.1.4.3.8.7.6l2.5-1.5c.2-.1.5-.2.7-.1.9.3 1.9.4 2.9.4 5.5 0 10-3.9 10-8.7S17.5 2 12 2zm4.9 8.5c0 .3-.2.5-.5.5h-3v3c0 .3-.2.5-.5.5s-.5-.2-.5-.5v-3h-3c-.3 0-.5-.2-.5-.5s.2-.5.5-.5h3v-3c0-.3.2-.5.5-.5s.5.2.5.5v3h3c.3 0 .5.2.5.5z" />
          </svg>
        </button>

        {/* 카카오스토리 */}
        <button
          onClick={handleKakaoStoryShare}
          className="flex items-center justify-center w-10 h-10 bg-[#FEC30C] text-[#3C1E1E] rounded-full hover:opacity-90 transition-opacity"
          title="카카오스토리에 공유"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M12 2C6.48 2 2 5.9 2 10.7c0 2.6 1.4 4.9 3.6 6.4.2.1.3.4.2.6l-.6 2.2c-.1.4.3.8.7.6l2.5-1.5c.2-.1.5-.2.7-.1.9.3 1.9.4 2.9.4 5.5 0 10-3.9 10-8.7S17.5 2 12 2z" />
          </svg>
        </button>

        {/* 링크 복사 */}
        <button
          onClick={handleCopyLink}
          className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
            copied 
              ? "bg-green-500 text-white" 
              : "bg-gray-100 text-muted hover:bg-gray-200"
          }`}
          title={copied ? "복사됨!" : "링크 복사"}
        >
          {copied ? <Check size={18} /> : <Copy size={18} />}
        </button>
      </div>

      {copied && (
        <p className="text-center mt-3 font-sans text-xs text-green-600">
          링크가 클립보드에 복사되었습니다!
        </p>
      )}
    </div>
  );
}

export const ShareButtons = memo(ShareButtonsComponent);
