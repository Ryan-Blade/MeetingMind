import { useEffect, useRef } from "react";
import { Utterance } from "../types.js";
import { MessageSquare, User, Clock } from "lucide-react";

interface TranscriptTimelineProps {
  utterances: Utterance[];
  selectedUtteranceId?: string | null;
  highlightQuote?: string | null;
}

export function TranscriptTimeline({
  utterances,
  selectedUtteranceId,
  highlightQuote,
}: TranscriptTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (selectedUtteranceId && itemRefs.current.has(selectedUtteranceId)) {
      const el = itemRefs.current.get(selectedUtteranceId);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selectedUtteranceId]);

  return (
    <div className="h-full flex flex-col bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
        <h2 className="text-sm font-bold font-['Space_Grotesk'] text-white flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#D7F64A]" />
          Transcript Timeline
        </h2>
        <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
          {utterances.length} turns
        </span>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {utterances.map((utt) => {
          const isSelected = selectedUtteranceId === utt.utteranceId;

          return (
            <div
              key={utt.id || utt.utteranceId}
              ref={(el) => {
                if (el) itemRefs.current.set(utt.utteranceId, el);
              }}
              className={`p-4 rounded-xl border transition duration-200 ${
                isSelected
                  ? "bg-[#D7F64A]/10 border-[#D7F64A] shadow-[0_0_15px_rgba(215,246,74,0.15)]"
                  : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-[#D7F64A]">
                    <User className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-xs font-semibold text-slate-200">{utt.speaker}</span>
                </div>
                <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {utt.timestamp}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-500">{utt.utteranceId}</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {highlightQuote && isSelected ? (
                  <span className="bg-[#D7F64A]/30 text-white font-mono px-1 py-0.5 rounded border border-[#D7F64A]/50">
                    {utt.text}
                  </span>
                ) : (
                  utt.text
                )}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
