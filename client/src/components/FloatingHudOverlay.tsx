import React, { useState, useEffect, useRef } from "react";
import {
  Minimize2,
  Maximize2,
  Sparkles,
  CheckCircle2,
  ListTodo,
  AlertTriangle,
  X,
  Move,
  Monitor,
  Volume2,
  Users,
} from "lucide-react";
import { Decision, ActionItem, Risk } from "../types.js";

interface FloatingHudOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onExpandToFullRoom: () => void;
}

export function FloatingHudOverlay({ isOpen, onClose, onExpandToFullRoom }: FloatingHudOverlayProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  // Position for dragging
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: 30 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
  });

  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [speakerSet, setSpeakerSet] = useState<Set<string>>(new Set(["Speaker 1"]));
  const [liveUtterance, setLiveUtterance] = useState<{ speaker: string; text: string; timestamp: string } | null>(null);

  const [liveDecisions, setLiveDecisions] = useState<Decision[]>([]);
  const [liveActions, setLiveActions] = useState<ActionItem[]>([]);
  const [liveRisks, setLiveRisks] = useState<Risk[]>([]);

  // Mouse Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPosition({
        x: Math.max(10, Math.min(window.innerWidth - 300, dragRef.current.initialX + dx)),
        y: Math.max(10, Math.min(window.innerHeight - 100, dragRef.current.initialY + dy)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // WebSocket Live Stream Connection
  useEffect(() => {
    if (!isOpen) return;

    const host = window.location.hostname || "localhost";
    const ws = new WebSocket(`ws://${host}:3001/ws/live-meeting`);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "START_LIVE_SESSION", title: "Universal Call Live Overlay" }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "UTTERANCE_ADDED") {
        setLiveUtterance({
          speaker: data.utterance.speaker,
          text: data.utterance.text,
          timestamp: data.utterance.timestamp,
        });
        setSpeakerSet((prev) => new Set([...prev, data.utterance.speaker]));
      }
      if (data.type === "EXTRACTION_ADDED") {
        if (data.cardType === "DECISION") setLiveDecisions((prev) => [data.card, ...prev]);
        if (data.cardType === "ACTION_ITEM") setLiveActions((prev) => [data.card, ...prev]);
        if (data.cardType === "RISK") setLiveRisks((prev) => [data.card, ...prev]);
      }
    };

    return () => {
      ws.close();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Toggle Screen Capture (Screen Reading / OCR Context)
  const toggleScreenCapture = async () => {
    if (!isScreenSharing) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        setIsScreenSharing(true);
        stream.getVideoTracks()[0].onended = () => setIsScreenSharing(false);
      } catch (err) {
        console.warn("Screen capture permission cancelled or fallback active:", err);
      }
    } else {
      setIsScreenSharing(false);
    }
  };

  const simulateSpeechBurst = () => {
    const host = window.location.hostname || "localhost";
    const ws = new WebSocket(`ws://${host}:3001/ws/live-meeting`);
    ws.onopen = () => {
      const samples = [
        { speaker: "Speaker 1 (Voice ID #84)", text: "We decided to approve the zero-trust security policy immediately." },
        { speaker: "Speaker 2 (Voice ID #19)", text: "Alex Rivera will configure the mTLS certificate proxies by 4 PM today." },
        { speaker: "Speaker 3 (OCR Screen Tag)", text: "There is a concern that old mobile apps might fail during certificate rotation." },
      ];
      setSpeakerSet(new Set(samples.map((s) => s.speaker)));
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
        }, idx * 1100);
      });
    };
  };

  // --- 1. MINIMIZED FLOATING PILL MODE ---
  if (isMinimized) {
    return (
      <div
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
        className="fixed z-50 cursor-move select-none"
      >
        <div className="bg-[#0D1627]/95 border border-[#D7F64A]/60 rounded-full px-4 py-2 shadow-[0_0_20px_rgba(215,246,74,0.3)] backdrop-blur-md flex items-center space-x-3 text-xs font-mono">
          <div className="flex items-center space-x-1.5" onMouseDown={handleMouseDown}>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D7F64A] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#D7F64A]"></span>
            </span>
            <span className="font-bold text-white font-['Space_Grotesk']">HUD</span>
          </div>

          <span className="text-[#D7F64A] font-bold">
            {liveDecisions.length + liveActions.length + liveRisks.length} Extractions
          </span>

          <button
            onClick={() => setIsMinimized(false)}
            className="text-slate-400 hover:text-white transition cursor-pointer p-0.5"
            title="Expand HUD"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // --- 2. FULL DRAGGABLE HUD OVERLAY ---
  return (
    <div
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      className="fixed z-50 transition-shadow duration-300 select-none"
    >
      <div className="bg-[#0D1627]/95 border border-slate-700/80 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.85)] backdrop-blur-md overflow-hidden w-96">
        {/* DRAGGABLE HUD HEADER */}
        <div
          onMouseDown={handleMouseDown}
          className="bg-slate-900/90 p-3.5 border-b border-slate-800 flex items-center justify-between cursor-move"
        >
          <div className="flex items-center space-x-2">
            <Move className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" />
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D7F64A] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#D7F64A]"></span>
            </span>
            <span className="text-xs font-bold font-['Space_Grotesk'] text-white flex items-center gap-1.5">
              Universal Meeting HUD
            </span>
          </div>

          <div className="flex items-center space-x-1.5" onMouseDown={(e) => e.stopPropagation()}>
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1 text-slate-400 hover:text-slate-200 transition cursor-pointer"
              title="Minimize to Pill"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-200 transition cursor-pointer"
              title="Close HUD"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* STATUS BAR: WASAPI Audio + Voice Diarization + Screen Reader */}
        <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800/60 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 gap-2">
          <div className="flex items-center space-x-2">
            <Volume2 className="w-3.5 h-3.5 text-[#D7F64A]" />
            <span>WASAPI Audio</span>
          </div>

          <div className="flex items-center space-x-2">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span>Voice ID ({speakerSet.size} Dynamic Speakers)</span>
          </div>

          <button
            onClick={toggleScreenCapture}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition cursor-pointer border ${
              isScreenSharing
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
            }`}
          >
            <Monitor className="w-3 h-3" />
            {isScreenSharing ? "Screen Reader Active" : "+ Screen Reader"}
          </button>
        </div>

        {/* LIVE STREAM FEED */}
        <div className="p-4 space-y-3">
          <div className="bg-slate-950/90 p-3 rounded-xl border border-slate-800/90">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono text-[#D7F64A] font-bold">
                {liveUtterance?.speaker || "Voice Recognition Listening..."}
              </span>
              <span className="text-[10px] font-mono text-slate-500">{liveUtterance?.timestamp || "LIVE"}</span>
            </div>
            <p className="text-xs font-sans text-slate-200 leading-snug">
              {liveUtterance?.text ? `"${liveUtterance.text}"` : "Capturing Zoom, Teams, WhatsApp, Skype or Meet..."}
            </p>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            <span className="text-[10px] font-mono text-[#D7F64A] uppercase tracking-wider block">
              Zero-Hallucination Extractions ({liveDecisions.length + liveActions.length + liveRisks.length})
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

          {/* ACTION CONTROLS */}
          <div className="pt-2 flex items-center justify-between gap-2">
            <button
              onClick={simulateSpeechBurst}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-mono flex items-center gap-1.5 cursor-pointer border border-slate-700"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D7F64A]" />
              Simulate Live Call
            </button>
            <button
              onClick={onExpandToFullRoom}
              className="px-3 py-1.5 bg-[#D7F64A] text-slate-950 font-bold rounded-lg text-[11px] font-mono cursor-pointer"
            >
              Full Command Room
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
