import { useState, useEffect } from "react";
import { Radio, Minimize2, Maximize2, Sparkles, CheckCircle2, ListTodo, AlertTriangle, X } from "lucide-react";
import { Decision, ActionItem, Risk } from "../types.js";

interface FloatingHudOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onExpandToFullRoom: () => void;
}

export function FloatingHudOverlay({ isOpen, onClose, onExpandToFullRoom }: FloatingHudOverlayProps) {
  const [isCompact, setIsCompact] = useState(false);
  const [liveUtterance, setLiveUtterance] = useState<{ speaker: string; text: string; timestamp: string } | null>(null);

  const [liveDecisions, setLiveDecisions] = useState<Decision[]>([]);
  const [liveActions, setLiveActions] = useState<ActionItem[]>([]);
  const [liveRisks, setLiveRisks] = useState<Risk[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    const ws = new WebSocket("ws://localhost:3001/ws/live-meeting");

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "START_LIVE_SESSION", title: "Zoom Overlay Live Capture" }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "UTTERANCE_ADDED") {
        setLiveUtterance({
          speaker: data.utterance.speaker,
          text: data.utterance.text,
          timestamp: data.utterance.timestamp,
        });
      }
      if (data.type === "EXTRACTION_ADDED") {
        if (data.cardType === "DECISION") {
          setLiveDecisions((prev) => [data.card, ...prev]);
        }
        if (data.cardType === "ACTION_ITEM") {
          setLiveActions((prev) => [data.card, ...prev]);
        }
        if (data.cardType === "RISK") {
          setLiveRisks((prev) => [data.card, ...prev]);
        }
      }
    };

    return () => {
      ws.close();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const simulateSpeechBurst = () => {
    const ws = new WebSocket("ws://localhost:3001/ws/live-meeting");
    ws.onopen = () => {
      const samples = [
        { speaker: "Alex Rivera", text: "We decided to deploy the emergency database index patch immediately." },
        { speaker: "Marcus Vance", text: "Marcus Vance will execute the production SQL migration script by 11:30 AM." },
        { speaker: "Sarah Chen", text: "There is a concern that concurrent index creation on the active DB could lock queries." },
      ];
      samples.forEach((s, idx) => {
        setTimeout(() => {
          ws.send(
            JSON.stringify({
              type: "LIVE_UTTERANCE",
              meetingId: "live_hud_session",
              speaker: s.speaker,
              text: s.text,
              timestamp: new Date().toISOString().substring(11, 19),
            })
          );
        }, idx * 1000);
      });
    };
  };

  return (
    <div className="fixed top-6 right-6 z-50 transition-all duration-300">
      <div
        className={`bg-[#0D1627]/95 border border-slate-700/80 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-md overflow-hidden ${
          isCompact ? "w-80" : "w-96"
        }`}
      >
        {/* HUD Top Bar */}
        <div className="bg-slate-900/90 p-3.5 border-b border-slate-800 flex items-center justify-between cursor-move">
          <div className="flex items-center space-x-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D7F64A] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#D7F64A]"></span>
            </span>
            <span className="text-xs font-bold font-['Space_Grotesk'] text-white flex items-center gap-1.5">
              MeetingMind HUD
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#D7F64A]/10 text-[#D7F64A] border border-[#D7F64A]/30">
                LIVE
              </span>
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setIsCompact(!isCompact)}
              className="p-1 text-slate-400 hover:text-slate-200 transition cursor-pointer"
              title={isCompact ? "Expand HUD" : "Compact HUD"}
            >
              {isCompact ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-200 transition cursor-pointer"
              title="Close Overlay"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Audio Waveform Signal Bar */}
        <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <div className="flex items-center space-x-2">
            <Radio className="w-3.5 h-3.5 text-[#D7F64A] animate-pulse" />
            <span>WASAPI System Audio Active</span>
          </div>
          {/* Simulated Audio EQ Visualizer */}
          <div className="flex items-end space-x-1 h-3">
            <span className="w-1 bg-[#D7F64A] h-2 animate-bounce" />
            <span className="w-1 bg-[#D7F64A] h-3 animate-pulse" />
            <span className="w-1 bg-[#D7F64A] h-1.5 animate-bounce" />
            <span className="w-1 bg-[#D7F64A] h-2.5 animate-pulse" />
          </div>
        </div>

        {/* Live Utterance Feed */}
        <div className="p-4 space-y-3">
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] font-mono text-slate-400 block mb-1">
              CURRENT SPEAKER ({liveUtterance?.speaker || "Listening..."})
            </span>
            <p className="text-xs font-sans text-slate-200 leading-snug">
              {liveUtterance?.text ? `"${liveUtterance.text}"` : "Waiting for live speech on Zoom/Meet call..."}
            </p>
          </div>

          {!isCompact && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              <span className="text-[10px] font-mono text-[#D7F64A] uppercase tracking-wider block">
                Validated Extractions ({liveDecisions.length + liveActions.length + liveRisks.length})
              </span>

              {liveDecisions.map((d, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-xs">
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 font-bold block mb-0.5">
                    <CheckCircle2 className="w-3 h-3" /> DECISION
                  </span>
                  <p className="text-slate-200 font-sans text-[11px]">{d.decision}</p>
                </div>
              ))}

              {liveActions.map((a, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-blue-950/40 border border-blue-500/30 text-xs">
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-blue-400 font-bold block mb-0.5">
                    <ListTodo className="w-3 h-3" /> ACTION ITEM ({a.owner})
                  </span>
                  <p className="text-slate-200 font-sans text-[11px]">{a.action}</p>
                </div>
              ))}

              {liveRisks.map((r, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-xs">
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-400 font-bold block mb-0.5">
                    <AlertTriangle className="w-3 h-3" /> RISK ({r.severity})
                  </span>
                  <p className="text-slate-200 font-sans text-[11px]">{r.risk}</p>
                </div>
              ))}
            </div>
          )}

          {/* Quick HUD Controls */}
          <div className="pt-2 flex items-center justify-between gap-2">
            <button
              onClick={simulateSpeechBurst}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-mono flex items-center gap-1.5 cursor-pointer border border-slate-700"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D7F64A]" />
              Test Speech Burst
            </button>
            <button
              onClick={onExpandToFullRoom}
              className="px-3 py-1.5 bg-[#D7F64A] text-slate-950 font-bold rounded-lg text-[11px] font-mono cursor-pointer"
            >
              Full Room
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
