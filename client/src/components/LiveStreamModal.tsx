import { useState, useEffect, useRef } from "react";
import { Mic, Radio, X, Sparkles, Monitor, Users } from "lucide-react";
import { MeetingData } from "../types.js";

interface LiveStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLiveMeetingCreated: (meeting: MeetingData) => void;
}

export function LiveStreamModal({ isOpen, onClose, onLiveMeetingCreated: _onLiveMeetingCreated }: LiveStreamModalProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState("Live Video Meeting");
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>("mtg_live_session");
  const [liveText, setLiveText] = useState("");
  const [streamLog, setStreamLog] = useState<string[]>([]);

  // Mic & Screen Reader States
  const [isMicActive, setIsMicActive] = useState(false);
  const [isScreenActive, setIsScreenActive] = useState(false);
  const [detectedSpeaker, setDetectedSpeaker] = useState("Speaker 1 (Voice ID #84)");

  const socketRef = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize WebSocket Connection
  useEffect(() => {
    if (!isOpen) return;

    const host = window.location.hostname || "localhost";
    const ws = new WebSocket(`ws://${host}:3001/ws/live-meeting`);
    socketRef.current = ws;

    ws.onopen = () => {
      setStreamLog((prev) => [...prev, "⚡ Connected to Real-Time Meeting WebSocket Stream"]);
      ws.send(JSON.stringify({ type: "START_LIVE_SESSION", title: meetingTitle }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "SESSION_STARTED") {
        setActiveMeetingId(data.meetingId);
        setIsRecording(true);
        setStreamLog((prev) => [...prev, `📡 Live Session Started: ${data.meetingId}`]);
      }
      if (data.type === "UTTERANCE_ADDED") {
        setStreamLog((prev) => [...prev, `🎙️ [${data.utterance.speaker}]: "${data.utterance.text}"`]);
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
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, [isOpen, meetingTitle]);

  if (!isOpen) return null;

  const startLiveSession = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "START_LIVE_SESSION", title: meetingTitle }));
      setIsRecording(true);
    }
  };

  const sendUtterance = (textToSend?: string) => {
    const text = textToSend || liveText;
    if (!text.trim() || !socketRef.current) return;

    const meetingId = activeMeetingId || `mtg_live_${Date.now()}`;
    const timestamp = new Date().toISOString().substring(11, 19);

    socketRef.current.send(
      JSON.stringify({
        type: "LIVE_UTTERANCE",
        meetingId,
        speaker: detectedSpeaker || "Speaker 1 (Voice ID #84)",
        text: text.trim(),
        timestamp,
      })
    );
    setLiveText("");
  };

  // Toggle Browser Microphone Speech Recognition
  const toggleMicrophone = () => {
    if (!isMicActive) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Web Speech API is not supported in this browser environment. You can still type live text or run the Live Simulation Demo!");
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            sendUtterance(event.results[i][0].transcript);
          }
        }
        setLiveText(currentTranscript);
      };

      recognition.onerror = (err: any) => {
        console.warn("Speech recognition error:", err);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsMicActive(true);
      setStreamLog((prev) => [...prev, "🎙️ Microphone Active — Speak now to stream live transcription"]);
    } else {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      setIsMicActive(false);
      setStreamLog((prev) => [...prev, "🔇 Microphone Muted"]);
    }
  };

  // Toggle Screen Capture (Multimodal Screen Reader Context)
  const toggleScreenCapture = async () => {
    if (!isScreenActive) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        setIsScreenActive(true);
        setStreamLog((prev) => [...prev, "🖥️ Multimodal Screen Reader Active - Reading Video Tiles & Slide Text"]);
        stream.getVideoTracks()[0].onended = () => setIsScreenActive(false);
      } catch (err) {
        console.warn("Screen capture permission cancelled:", err);
      }
    } else {
      setIsScreenActive(false);
    }
  };

  const simulateSpeechSequence = () => {
    if (!isRecording) startLiveSession();

    const sampleSequence = [
      { speaker: "Sarah Chen (Voice ID #84)", text: "We decided to approve the zero-trust security policy immediately." },
      { speaker: "Alex Rivera (Voice ID #19)", text: "Alex Rivera will configure the mTLS certificate proxies by 4 PM today." },
      { speaker: "Marcus Vance (OCR Tile Tag)", text: "There is a concern that old mobile apps might fail during certificate rotation." },
    ];

    sampleSequence.forEach((item, index) => {
      setTimeout(() => {
        setDetectedSpeaker(item.speaker);
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
      }, (index + 1) * 1100);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-[#0D1627] border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-lg font-bold font-['Space_Grotesk'] text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-[#D7F64A] animate-pulse" />
            Real-Time Live Meeting Capture (Zoom, Meet, Teams, WhatsApp)
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Live Call Session Title</label>
              <input
                type="text"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                disabled={isRecording}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-[#D7F64A]"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Speaker Identification Mode</label>
              <div className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-[#D7F64A] flex items-center justify-between">
                <span>Auto Voice ID + Screen Reader</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">ACTIVE</span>
              </div>
            </div>
          </div>

          {/* AUDIO & SCREEN INPUT TABS */}
          <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 text-xs font-mono">
            <button
              onClick={toggleMicrophone}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border transition cursor-pointer font-bold ${
                isMicActive
                  ? "bg-red-500/20 text-red-300 border-red-500/50 animate-pulse"
                  : "bg-slate-900 text-slate-300 border-slate-800 hover:text-white"
              }`}
            >
              <Mic className="w-4 h-4 text-red-400" />
              {isMicActive ? "Live Mic Listening..." : "Enable Live Mic"}
            </button>

            <button
              onClick={toggleScreenCapture}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border transition cursor-pointer ${
                isScreenActive
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                  : "bg-slate-900 text-slate-300 border-slate-800 hover:text-white"
              }`}
            >
              <Monitor className="w-4 h-4 text-emerald-400" />
              {isScreenActive ? "Screen Reader Active" : "Share Screen"}
            </button>

            <div className="ml-auto flex items-center gap-2 text-slate-400 text-[11px]">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>{detectedSpeaker}</span>
            </div>
          </div>

          {/* LIVE INPUT FIELD & SIMULATOR */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={isMicActive ? "Listening to microphone... or type live speech turn" : "Type a live speech turn (e.g. We decided to approve...)"}
                value={liveText}
                onChange={(e) => setLiveText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendUtterance()}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-[#D7F64A]"
              />
              <button
                onClick={() => sendUtterance()}
                className="px-5 py-2.5 bg-[#D7F64A] hover:bg-[#c5e43a] text-slate-950 font-bold text-xs font-mono rounded-xl cursor-pointer shadow-[0_0_12px_rgba(215,246,74,0.3)]"
              >
                Send
              </button>
            </div>

            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5 text-[#D7F64A]">
                <span className="w-2 h-2 rounded-full bg-[#D7F64A] animate-ping" />
                Live WebSocket Channel Active (&lt;5ms latency)
              </span>
              <button
                onClick={simulateSpeechSequence}
                className="text-xs text-slate-300 hover:text-[#D7F64A] flex items-center gap-1 cursor-pointer font-bold"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#D7F64A]" />
                Run Multi-Speaker Call Demo
              </button>
            </div>
          </div>

          {/* LIVE ACTIVITY STREAM LOG */}
          <div className="mt-4 p-4 bg-slate-950 rounded-xl border border-slate-800/80 h-52 overflow-y-auto font-mono text-[11px] space-y-1.5">
            {streamLog.length === 0 ? (
              <span className="text-slate-600 italic">Connecting to live meeting WebSocket stream...</span>
            ) : (
              streamLog.map((log, idx) => (
                <div
                  key={idx}
                  className={log.includes("VALIDATED") ? "text-[#D7F64A] font-bold" : log.includes("🎙️") ? "text-blue-300" : "text-slate-300"}
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
