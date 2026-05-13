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
    // 한글 slug가 디코딩된 상태면 인코딩된 canonical URL로 통일
    const { origin, pathname, search, hash } = window.location;
    const encodedPath = pathname.split('/').map(seg => encodeURIComponent(decodeURIComponent(seg))).join('/');
    setShareUrl(`${origin}${encodedPath}${search}${hash}`);
  }, []);

  const openShareWindow = (url: string) => {
    window.open(url, "_blank", "width=550,height=520,scrollbars=yes");
  };

  const handleTwitterShare = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`;
    openShareWindow(url);
  };

  const handleFacebookShare = () => {
    // 페이스북은 URL만 전달 - 제목/내용은 FB봇이 OG 태그 크롤링해서 자동 채움
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    openShareWindow(url);
  };

  const handleKakaoShare = () => {
    // layout.tsx에서 Kakao SDK가 전역 로드됨 - sendScrap으로 OG 미리보기 자동 크롤링
    const kakao = (window as Window & { Kakao?: { Share: { sendScrap: (opts: { requestUrl: string }) => void } } }).Kakao;
    if (kakao?.Share) {
      kakao.Share.sendScrap({ requestUrl: shareUrl });
    } else {
      // SDK 미로드 폴백 - 모바일: 카카오톡 앱 스킴, PC: URL 복사
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        window.location.href = `kakaolink://send?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`;
      } else {
        navigator.clipboard.writeText(shareUrl).catch(() => {});
        alert('카카오 JS 키가 설정되지 않았습니다.\n환경변수 NEXT_PUBLIC_KAKAO_JS_KEY를 설정해주세요.');
      }
    }
  };

  const handleNaverShare = () => {
    const url = `https://share.naver.com/web/shareView?title=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`;
    openShareWindow(url);
  };

  const handleLineShare = () => {
    const url = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}`;
    openShareWindow(url);
  };

  const handleInstagramShare = async () => {
    // 인스타그램은 외부 URL 직접 공유 불가 - URL 복사 후 앱 열기
    await navigator.clipboard.writeText(shareUrl).catch(() => {});
    window.open('https://www.instagram.com', '_blank');
  };

  const handleThreadsShare = () => {
    // 쓰레드 웹 공유
    const url = `https://www.threads.net/intent/post?text=${encodeURIComponent(title + '\n' + shareUrl)}`;
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

        {/* 인스타그램 */}
        <button
          onClick={handleInstagramShare}
          className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-[#f09433] via-[#e6683c] via-[#dc2743] via-[#cc2366] to-[#bc1888] text-white rounded-full hover:opacity-90 transition-opacity"
          title="인스타그램 (URL 복사 후 앱 열기)"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
        </button>

        {/* 쓰레드 */}
        <button
          onClick={handleThreadsShare}
          className="flex items-center justify-center w-10 h-10 bg-black text-white rounded-full hover:opacity-90 transition-opacity"
          title="쓰레드에 공유"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.729-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32L7.734 9.267c.98-1.454 2.568-2.256 4.478-2.256h.044c3.194.02 5.097 1.975 5.287 5.388.108.046.215.094.321.145 1.392.68 2.478 1.677 3.146 2.884.963 1.748 1.054 4.119-.026 6.17C19.143 23.083 16.659 24 12.186 24z"/>
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
