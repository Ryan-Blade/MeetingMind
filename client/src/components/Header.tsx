import { Upload, Sparkles, ShieldCheck } from "lucide-react";

interface HeaderProps {
  onOpenUpload: () => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
}

export function Header({ onOpenUpload, onAnalyze, isAnalyzing }: HeaderProps) {
  return (
    <header className="border-b border-slate-800 bg-[#0D1627]/90 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-[#D7F64A] flex items-center justify-center text-slate-950 font-bold font-mono text-sm">
            MM
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white font-['Space_Grotesk'] flex items-center gap-2">
              MeetingMind
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#D7F64A]/10 text-[#D7F64A] border border-[#D7F64A]/30">
                SIGNAL ROOM
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-sans flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#D7F64A]" />
              Zero-Hallucination Citation Verification Engine
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#D7F64A] hover:bg-[#c5e43a] text-slate-950 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${isAnalyzing ? "animate-spin" : ""}`} />
            {isAnalyzing ? "Analyzing Extractions..." : "Run AI Extraction Agents"}
          </button>

          <button
            onClick={onOpenUpload}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 flex items-center gap-2 transition cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Upload Transcript
          </button>
        </div>
      </div>
    </header>
  );
}
