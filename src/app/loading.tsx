import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center">
      <Loader2 className="animate-spin text-rust mb-4" size={40} />
      <p className="font-sans text-sm text-muted">불러오는 중...</p>
    </div>
  );
}
