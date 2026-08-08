import { useState, useEffect, useRef } from "react";
import { Mic, Radio, X, Sparkles } from "lucide-react";
import { MeetingData } from "../types.js";

interface LiveStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLiveMeetingCreated: (meeting: MeetingData) => void;
}

export function LiveStreamModal({ isOpen, onClose, onLiveMeetingCreated: _onLiveMeetingCreated }: LiveStreamModalProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState("Live Product Sync");
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);
  const [speakerName, setSpeakerName] = useState("Alex Rivera");
  const [liveText, setLiveText] = useState("");
  const [streamLog, setStreamLog] = useState<string[]>([]);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const host = window.location.hostname || "localhost";
    const ws = new WebSocket(`ws://${host}:3001/ws/live-meeting`);
    socketRef.current = ws;

    ws.onopen = () => {
      setStreamLog((prev) => [...prev, "Connected to WebSocket stream"]);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "SESSION_STARTED") {
        setActiveMeetingId(data.meetingId);
        setStreamLog((prev) => [...prev, `Session created: ${data.meetingId}`]);
      }
      if (data.type === "UTTERANCE_ADDED") {
        setStreamLog((prev) => [...prev, `[Live Speech] ${data.utterance.speaker}: "${data.utterance.text}"`]);
      }
      if (data.type === "EXTRACTION_ADDED") {
        setStreamLog((prev) => [
          ...prev,
          `✨ [VALIDATED ${data.cardType}] ${data.card.exactQuote || data.card.decision || data.card.action}`,
        ]);
      }
    };

    return () => {
      ws.close();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const startLiveSession = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "START_LIVE_SESSION", title: meetingTitle }));
      setIsRecording(true);
    }
  };

  const sendUtterance = (textToSend?: string) => {
    const text = textToSend || liveText;
    if (!text.trim() || !activeMeetingId || !socketRef.current) return;

    const timestamp = new Date().toISOString().substring(11, 19);
    socketRef.current.send(
      JSON.stringify({
        type: "LIVE_UTTERANCE",
        meetingId: activeMeetingId,
        speaker: speakerName,
        text: text.trim(),
        timestamp,
      })
    );
    setLiveText("");
  };

  const simulateSpeechSequence = () => {
    if (!activeMeetingId) startLiveSession();

    const sampleSequence = [
      { speaker: "Sarah Chen", text: "We decided to approve the zero-trust security policy immediately." },
      { speaker: "Alex Rivera", text: "Alex Rivera will configure the mTLS certificate proxies by 4 PM today." },
      { speaker: "Marcus Vance", text: "There is a concern that old mobile apps might fail during certificate rotation." },
    ];

    sampleSequence.forEach((item, index) => {
      setTimeout(() => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          const timestamp = new Date().toISOString().substring(11, 19);
          socketRef.current.send(
            JSON.stringify({
              type: "LIVE_UTTERANCE",
              meetingId: activeMeetingId || "mtg_live_demo",
              speaker: item.speaker,
              text: item.text,
              timestamp,
            })
          );
        }
      }, (index + 1) * 1200);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-[#0D1627] border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-lg font-bold font-['Space_Grotesk'] text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-[#D7F64A] animate-pulse" />
            Real-Time Live Meeting Capture
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Meeting Title</label>
              <input
                type="text"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                disabled={isRecording}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-[#D7F64A]"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Active Speaker</label>
              <input
                type="text"
                value={speakerName}
                onChange={(e) => setSpeakerName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-[#D7F64A]"
              />
            </div>
          </div>

          {!isRecording ? (
            <div className="flex gap-3 pt-2">
              <button
                onClick={startLiveSession}
                className="flex-1 py-3 bg-[#D7F64A] hover:bg-[#c5e43a] text-slate-950 font-bold rounded-xl text-xs font-mono flex items-center justify-center gap-2 cursor-pointer"
              >
                <Mic className="w-4 h-4" />
                Start Live Stream Session
              </button>
              <button
                onClick={simulateSpeechSequence}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs rounded-xl flex items-center gap-2 cursor-pointer border border-slate-700"
              >
                <Sparkles className="w-4 h-4 text-[#D7F64A]" />
                Simulate Live Speech
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type or speak a live utterance..."
                  value={liveText}
                  onChange={(e) => setLiveText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendUtterance()}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-[#D7F64A]"
                />
                <button
                  onClick={() => sendUtterance()}
                  className="px-4 py-2.5 bg-[#D7F64A] text-slate-950 font-bold text-xs font-mono rounded-xl cursor-pointer"
                >
                  Send
                </button>
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5 text-[#D7F64A]">
                  <span className="w-2 h-2 rounded-full bg-[#D7F64A] animate-ping" />
                  Streaming utterances & zero-hallucination extractions
                </span>
                <button
                  onClick={simulateSpeechSequence}
                  className="text-xs text-slate-300 underline cursor-pointer"
                >
                  + Simulate Speech Sequence
                </button>
              </div>
            </div>
          )}

          {/* Live Activity Stream Log */}
          <div className="mt-4 p-4 bg-slate-950 rounded-xl border border-slate-800/80 h-48 overflow-y-auto font-mono text-[11px] space-y-1.5">
            {streamLog.length === 0 ? (
              <span className="text-slate-600 italic">Waiting for live speech stream...</span>
            ) : (
              streamLog.map((log, idx) => (
                <div
                  key={idx}
                  className={log.includes("VALIDATED") ? "text-[#D7F64A] font-bold" : "text-slate-300"}
                >
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
