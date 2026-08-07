import { useState } from "react";
import { Decision, ActionItem, Risk, Disagreement } from "../types.js";
import { CheckCircle2, AlertTriangle, ListTodo, GitPullRequest, Quote, ArrowRight } from "lucide-react";

interface IntelligenceCardsProps {
  decisions: Decision[];
  actionItems: ActionItem[];
  risks: Risk[];
  disagreements: Disagreement[];
  selectedUtteranceId?: string | null;
  onSelectUtterance: (utteranceId: string, quote?: string) => void;
  activeFilterType: string;
}

export function IntelligenceCards({
  decisions,
  actionItems,
  risks,
  disagreements,
  selectedUtteranceId,
  onSelectUtterance,
  activeFilterType,
}: IntelligenceCardsProps) {
  const [activeTab, setActiveTab] = useState<"ALL" | "DECISIONS" | "ACTIONS" | "RISKS" | "DISAGREEMENTS">("ALL");

  const effectiveTab = activeFilterType !== "ALL" ? (activeFilterType as any) : activeTab;

  const showDecisions = effectiveTab === "ALL" || effectiveTab === "DECISIONS";
  const showActions = effectiveTab === "ALL" || effectiveTab === "ACTIONS";
  const showRisks = effectiveTab === "ALL" || effectiveTab === "RISKS";
  const showDisagreements = effectiveTab === "ALL" || effectiveTab === "DISAGREEMENTS";

  return (
    <div className="h-full flex flex-col bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
        <h2 className="text-sm font-bold font-['Space_Grotesk'] text-white flex items-center gap-2">
          <Quote className="w-4 h-4 text-[#D7F64A]" />
          Validated Intelligence Cards
        </h2>

        <div className="flex items-center space-x-1 text-xs font-mono bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
              effectiveTab === "ALL" ? "bg-[#D7F64A] text-slate-950 font-bold" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab("DECISIONS")}
            className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
              effectiveTab === "DECISIONS" ? "bg-[#D7F64A] text-slate-950 font-bold" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Decisions ({decisions.length})
          </button>
          <button
            onClick={() => setActiveTab("ACTIONS")}
            className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
              effectiveTab === "ACTIONS" ? "bg-[#D7F64A] text-slate-950 font-bold" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Actions ({actionItems.length})
          </button>
          <button
            onClick={() => setActiveTab("RISKS")}
            className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
              effectiveTab === "RISKS" ? "bg-[#D7F64A] text-slate-950 font-bold" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Risks ({risks.length})
          </button>
          <button
            onClick={() => setActiveTab("DISAGREEMENTS")}
            className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
              effectiveTab === "DISAGREEMENTS" ? "bg-[#D7F64A] text-slate-950 font-bold" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Disagreements ({disagreements.length})
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* DECISIONS */}
        {showDecisions &&
          decisions.map((dec) => {
            const isSelected = selectedUtteranceId === dec.sourceUtteranceId;
            return (
              <div
                key={dec.id}
                onClick={() => onSelectUtterance(dec.sourceUtteranceId, dec.exactQuote)}
                className={`p-4 rounded-xl border transition cursor-pointer ${
                  isSelected
                    ? "bg-[#D7F64A]/10 border-[#D7F64A]"
                    : "bg-slate-900/80 border-slate-800 hover:border-emerald-500/50"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    DECISION
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Conf: {(dec.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <h3 className="text-xs font-bold text-slate-100 font-['Space_Grotesk'] mb-2">
                  {dec.decision}
                </h3>

                <blockquote className="p-2.5 rounded-lg bg-slate-950/70 border-l-2 border-emerald-400 text-[11px] font-mono text-slate-300 italic mb-2">
                  "{dec.exactQuote}"
                </blockquote>

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>{dec.speaker} • {dec.timestamp}</span>
                  <span className="text-emerald-400 flex items-center gap-1 hover:underline">
                    Source quote <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}

        {/* ACTION ITEMS */}
        {showActions &&
          actionItems.map((act) => {
            const isSelected = selectedUtteranceId === act.sourceUtteranceId;
            return (
              <div
                key={act.id}
                onClick={() => onSelectUtterance(act.sourceUtteranceId, act.exactQuote)}
                className={`p-4 rounded-xl border transition cursor-pointer ${
                  isSelected
                    ? "bg-[#D7F64A]/10 border-[#D7F64A]"
                    : "bg-slate-900/80 border-slate-800 hover:border-blue-500/50"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[11px] font-mono font-semibold">
                    <ListTodo className="w-3.5 h-3.5" />
                    ACTION ITEM ({act.priority})
                  </span>
                  <span className="text-[11px] font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Owner: {act.owner}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-slate-100 font-['Space_Grotesk'] mb-2">
                  {act.action}
                </h3>

                <blockquote className="p-2.5 rounded-lg bg-slate-950/70 border-l-2 border-blue-400 text-[11px] font-mono text-slate-300 italic mb-2">
                  "{act.exactQuote}"
                </blockquote>

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Deadline: {act.deadline || "ASAP"} • {act.timestamp}</span>
                  <span className="text-blue-400 flex items-center gap-1 hover:underline">
                    Source quote <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}

        {/* RISKS */}
        {showRisks &&
          risks.map((r) => {
            const isSelected = selectedUtteranceId === r.sourceUtteranceId;
            return (
              <div
                key={r.id}
                onClick={() => onSelectUtterance(r.sourceUtteranceId, r.exactQuote)}
                className={`p-4 rounded-xl border transition cursor-pointer ${
                  isSelected
                    ? "bg-[#D7F64A]/10 border-[#D7F64A]"
                    : "bg-slate-900/80 border-slate-800 hover:border-amber-500/50"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[11px] font-mono font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    RISK ({r.riskType})
                  </span>
                  <span className="text-[11px] font-mono text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                    Severity: {r.severity}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-slate-100 font-['Space_Grotesk'] mb-2">
                  {r.risk}
                </h3>

                <blockquote className="p-2.5 rounded-lg bg-slate-950/70 border-l-2 border-amber-400 text-[11px] font-mono text-slate-300 italic mb-2">
                  "{r.exactQuote}"
                </blockquote>

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Reported by {r.speaker} • {r.timestamp}</span>
                  <span className="text-amber-400 flex items-center gap-1 hover:underline">
                    Source quote <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}

        {/* DISAGREEMENTS */}
        {showDisagreements &&
          disagreements.map((dis) => {
            const isSelected = selectedUtteranceId === dis.sourceUtteranceId1 || selectedUtteranceId === dis.sourceUtteranceId2;
            return (
              <div
                key={dis.id}
                onClick={() => onSelectUtterance(dis.sourceUtteranceId1)}
                className={`p-4 rounded-xl border transition cursor-pointer ${
                  isSelected
                    ? "bg-[#D7F64A]/10 border-[#D7F64A]"
                    : "bg-slate-900/80 border-slate-800 hover:border-purple-500/50"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30 text-[11px] font-mono font-semibold">
                    <GitPullRequest className="w-3.5 h-3.5" />
                    DISAGREEMENT
                  </span>
                  <span className="text-[11px] font-mono text-purple-300">
                    Conf: {(dis.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <h3 className="text-xs font-bold text-slate-100 font-['Space_Grotesk'] mb-3">
                  Topic: {dis.topic}
                </h3>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-purple-500/30">
                    <span className="text-[10px] font-mono text-purple-400 block mb-1 font-semibold">
                      POSITION 1 ({dis.speaker1})
                    </span>
                    <p className="text-[11px] font-sans text-slate-300 leading-snug">
                      {dis.position1}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-pink-500/30">
                    <span className="text-[10px] font-mono text-pink-400 block mb-1 font-semibold">
                      POSITION 2 ({dis.speaker2})
                    </span>
                    <p className="text-[11px] font-sans text-slate-300 leading-snug">
                      {dis.position2}
                    </p>
                  </div>
                </div>

                {dis.resolution && (
                  <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-[11px] font-mono text-emerald-300 mb-2">
                    <span className="font-bold text-emerald-400">Resolution:</span> {dis.resolution}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
