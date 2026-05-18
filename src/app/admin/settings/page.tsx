"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { 
  Send,
  MessageCircle,
  CheckCircle,
  AlertTriangle,
  Loader2,
  RefreshCw
} from "lucide-react";

export default function AdminSettingsPage() {
  const { showToast } = useToast();
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const testTelegram = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch("/api/admin/test-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "🧪 테스트 메시지입니다.\n\n시간: " + new Date().toLocaleString("ko-KR"),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setTestResult({ success: true, message: "텔레그램 메시지 전송 성공!" });
        showToast("텔레그램 메시지가 전송되었습니다", "success");
      } else {
        setTestResult({ 
          success: false, 
          message: data.error || "전송 실패" 
        });
        showToast(data.error || "전송 실패", "error");
      }
    } catch (error) {
      setTestResult({ 
        success: false, 
        message: error instanceof Error ? error.message : "알 수 없는 오류" 
      });
      showToast("네트워크 오류", "error");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">관리자 설정</h2>
      </div>

      {/* 텔레그램 알림 설정 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              텔레그램 알림
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              댓글이 작성되면 텔레그램으로 알림이 전송됩니다. 
              테스트 버튼으로 설정을 확인해보세요.
            </p>

            {/* 테스트 결과 */}
            {testResult && (
              <div className={`mb-4 p-3 rounded-lg ${
                testResult.success 
                  ? "bg-green-50 border border-green-200" 
                  : "bg-red-50 border border-red-200"
              }`}>
                <div className="flex items-start gap-2">
                  {testResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${
                      testResult.success ? "text-green-800" : "text-red-800"
                    }`}>
                      {testResult.success ? "성공" : "실패"}
                    </p>
                    <p className={`text-sm ${
                      testResult.success ? "text-green-700" : "text-red-700"
                    }`}>
                      {testResult.message}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 테스트 버튼 */}
            <button
              onClick={testTelegram}
              disabled={isTesting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  테스트 중...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  테스트 메시지 보내기
                </>
              )}
            </button>
          </div>
        </div>

        {/* 환경 변수 정보 */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <h4 className="text-sm font-medium text-gray-900 mb-3">환경 변수 상태</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-gray-600">TELEGRAM_BOT_TOKEN</span>
              <span className="text-green-600 font-medium">설정됨</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-gray-600">TELEGRAM_CHAT_ID</span>
              <span className="text-green-600 font-medium">설정됨</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            * 환경 변수는 Vercel Dashboard에서 확인/수정할 수 있습니다.
          </p>
        </div>
      </div>

      {/* 시스템 정보 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">시스템 정보</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">Next.js 버전</span>
            <span className="text-gray-900">14.x</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">Node.js 버전</span>
            <span className="text-gray-900">18.x</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-600">배포 환경</span>
            <span className="text-gray-900">Production</span>
          </div>
        </div>
      </div>
    </div>
  );
}
