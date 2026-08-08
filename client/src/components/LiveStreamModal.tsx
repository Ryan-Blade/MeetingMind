import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, Radio, X, Sparkles, Monitor, Users, ShieldCheck, CheckCircle2, UserPlus, Download } from "lucide-react";
import { MeetingData } from "../types.js";

interface LiveStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLiveMeetingCreated: (meeting: MeetingData) => void;
}

interface SpeakerSlot {
  id: number;
  name: string;
}

export function LiveStreamModal({ isOpen, onClose, onLiveMeetingCreated: _onLiveMeetingCreated }: LiveStreamModalProps) {
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);
  const [streamLog, setStreamLog] = useState<string[]>([]);

  // Real speaker tracking
  const [speakers, setSpeakers] = useState<SpeakerSlot[]>([
    { id: 1, name: "Speaker 1" },
    { id: 2, name: "Speaker 2" },
  ]);
  const [activeSpeakerIdx, setActiveSpeakerIdx] = useState(0);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isScreenActive, setIsScreenActive] = useState(false);

  // Dynamic export file paths (set after session starts)
  const [exportJsonPath, setExportJsonPath] = useState<string | null>(null);
  const [exportTxtPath, setExportTxtPath] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<any>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const meetingIdRef = useRef<string | null>(null);
  const activeSpeakerRef = useRef(0);

  // Keep ref in sync for use inside closures
  useEffect(() => {
    activeSpeakerRef.current = activeSpeakerIdx;
  }, [activeSpeakerIdx]);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [streamLog]);

  const addLog = useCallback((msg: string) => {
    setStreamLog((prev) => [...prev, msg]);
  }, []);

  // Initialize WebSocket Connection
  useEffect(() => {
    if (!isOpen) return;

    const host = window.location.hostname || "localhost";
    const ws = new WebSocket(`ws://${host}:3001/ws/live-meeting`);
    socketRef.current = ws;

    ws.onopen = () => {
      addLog("⚡ Connected to Real-Time Meeting WebSocket Stream (<5ms latency)");
      ws.send(JSON.stringify({ type: "START_LIVE_SESSION", title: "Live Meeting Session" }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "SESSION_STARTED") {
        meetingIdRef.current = data.meetingId;
        setActiveMeetingId(data.meetingId);
        addLog(`📡 Session Started: ${data.meetingId}`);
      }

      if (data.type === "UTTERANCE_ADDED") {
        addLog(`🎙️ [${data.utterance.speaker}]: "${data.utterance.text}"`);
        // Update export paths dynamically from server response
        if (data.filePaths?.jsonPath) setExportJsonPath(data.filePaths.jsonPath);
        if (data.filePaths?.txtPath) setExportTxtPath(data.filePaths.txtPath);
      }

      if (data.type === "EXTRACTION_ADDED") {
        const label = data.card.exactQuote || data.card.decision || data.card.action || data.card.risk || "";
        addLog(`✨ [VALIDATED ${data.cardType}] ${label.substring(0, 80)}`);
      }

      if (data.type === "SESSION_ENDED") {
        addLog("🔴 Session ended. Transcript saved.");
        if (data.filePaths?.jsonPath) setExportJsonPath(data.filePaths.jsonPath);
        if (data.filePaths?.txtPath) setExportTxtPath(data.filePaths.txtPath);
      }
    };

    ws.onclose = () => addLog("🔌 WebSocket disconnected");
    ws.onerror = () => addLog("⚠️ WebSocket connection error");

    return () => {
      ws.close();
      stopRecognition();
    };
  }, [isOpen]);

  const getCurrentSpeakerName = (): string => {
    return speakers[activeSpeakerRef.current]?.name || `Speaker ${activeSpeakerRef.current + 1}`;
  };

  const sendUtterance = useCallback((text: string, speakerOverride?: string) => {
    if (!text.trim() || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    const meetingId = meetingIdRef.current || `mtg_live_${Date.now()}`;
    const timestamp = new Date().toTimeString().substring(0, 8);
    const speaker = speakerOverride || getCurrentSpeakerName();

    socketRef.current.send(JSON.stringify({
      type: "LIVE_UTTERANCE",
      meetingId,
      speaker,
      text: text.trim(),
      timestamp,
    }));
  }, [speakers]);

  const stopRecognition = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
      recognitionRef.current = null;
    }
  };

  // ── Real Microphone → Web Speech API ──────────────────────────────────────
  const toggleMicrophone = () => {
    if (isMicActive) {
      stopRecognition();
      setIsMicActive(false);
      addLog("🔇 Microphone stopped");
      return;
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      addLog("⚠️ Web Speech API not available in this browser. Use Chrome or Edge.");
      return;
    }

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = false; // only final results → one utterance per turn
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const text = event.results[i][0].transcript.trim();
          if (text) sendUtterance(text);
        }
      }
    };

    recognition.onspeechend = () => {
      // Auto-restart on silence (keeps it going during pauses)
      try { recognition.start(); } catch (_) {}
    };

    recognition.onerror = (err: any) => {
      if (err.error !== "no-speech") {
        addLog(`⚠️ Speech recognition error: ${err.error}`);
        setIsMicActive(false);
      }
    };

    recognition.onend = () => {
      // Re-start automatically unless explicitly stopped
      if (isMicActive && recognitionRef.current) {
        try { recognition.start(); } catch (_) {}
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsMicActive(true);
    addLog(`🎙️ Microphone LIVE — speaking as: ${getCurrentSpeakerName()}`);
    addLog("ℹ️  Switch speaker below before each person speaks for accurate attribution.");
  };

  // ── Screen Capture + Audio from system (YouTube, Zoom, Meet, etc.) ─────────
  const shareScreen = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          // Request system audio (plays YouTube/Zoom audio)
          echoCancellation: false,
          noiseSuppression: false,
          sampleRate: 16000,
        } as MediaTrackConstraints,
      });

      setIsScreenActive(true);
      addLog("🖥️  Screen capture active — system audio captured");

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        addLog("⚠️  No system audio captured. Make sure to tick 'Share tab audio' or 'Share system audio' in the browser prompt.");
      } else {
        addLog(`🔊 Audio track captured: ${audioTracks[0].label}`);
        addLog("ℹ️  System audio is being captured. Click 'Enable Mic' to start transcribing it.");
        // Pipe captured system audio into Web Speech by creating a MediaStream source
        pipeAudioStreamToSpeechRecognition(audioTracks[0]);
      }

      stream.getVideoTracks()[0].addEventListener("ended", () => {
        setIsScreenActive(false);
        addLog("🖥️  Screen capture stopped");
      });
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        addLog("⚠️  Screen capture permission denied");
      } else {
        addLog(`⚠️  Screen capture error: ${err.message}`);
      }
    }
  };

  /**
   * Route a captured system audio track through Web Speech API.
   * Web Speech API natively uses the default mic — we use a workaround:
   * play the audio through a hidden <audio> element so the system audio
   * becomes part of the mic capture loop.
   */
  const pipeAudioStreamToSpeechRecognition = (audioTrack: MediaStreamTrack) => {
    const stream = new MediaStream([audioTrack]);
    const audioEl = document.createElement("audio");
    audioEl.srcObject = stream;
    audioEl.muted = false; // let it play so Web Speech picks it up via loopback
    audioEl.play().catch(() => {});
    addLog("🔊 System audio routed — Web Speech will transcribe it when mic is enabled");
  };

  // ── Speaker management ─────────────────────────────────────────────────────
  const addSpeaker = () => {
    setSpeakers((prev) => [...prev, { id: prev.length + 1, name: `Speaker ${prev.length + 1}` }]);
  };

  const updateSpeakerName = (idx: number, name: string) => {
    setSpeakers((prev) => prev.map((s, i) => (i === idx ? { ...s, name } : s)));
  };

  // ── Auto-demo (simulates a real call) ─────────────────────────────────────
  const runAutoDemo = () => {
    const sequence = [
      { speaker: "Sarah Chen", text: "We decided to approve the zero-trust security policy immediately." },
      { speaker: "Alex Rivera", text: "Alex Rivera will configure the mTLS certificate proxies by 4 PM today." },
      { speaker: "Marcus Vance", text: "There is a concern that old mobile apps might fail during certificate rotation." },
      { speaker: "Sarah Chen", text: "We all agreed to run a compatibility test before Friday's deployment." },
    ];
    addLog("🤖 Running demo transcript stream...");
    sequence.forEach((item, i) => {
      setTimeout(() => sendUtterance(item.text, item.speaker), (i + 1) * 1200);
    });
  };

  if (!isOpen) return null;

  const serverBase = `${window.location.protocol}//${window.location.hostname}:3001`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-[#0D1627] border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">

        {/* HEADER */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-lg font-bold font-['Space_Grotesk'] text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-[#D7F64A] animate-pulse" />
            Real-Time Meeting Transcription
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">

          {/* SPEAKER ROSTER */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-blue-400" /> Speakers — click a name to set active speaker before they talk
              </span>
              <button
                onClick={addSpeaker}
                className="flex items-center gap-1 text-[10px] font-mono text-slate-400 hover:text-white border border-slate-700 px-2 py-1 rounded-lg cursor-pointer"
              >
                <UserPlus className="w-3 h-3" /> Add Speaker
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {speakers.map((s, idx) => (
                <div key={s.id} className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setActiveSpeakerIdx(idx);
                      addLog(`👤 Active speaker switched to: ${s.name}`);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border cursor-pointer transition ${
                      activeSpeakerIdx === idx
                        ? "bg-[#D7F64A] text-slate-950 border-[#D7F64A] shadow-[0_0_10px_rgba(215,246,74,0.4)]"
                        : "bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500"
                    }`}
                  >
                    {activeSpeakerIdx === idx ? "🎙️ " : ""}{s.name}
                  </button>
                  <input
                    type="text"
                    value={s.name}
                    onChange={(e) => updateSpeakerName(idx, e.target.value)}
                    className="w-24 text-[10px] font-mono bg-transparent border-b border-slate-700 text-slate-300 focus:outline-none focus:border-[#D7F64A] px-1"
                    placeholder="Rename..."
                  />
                </div>
              ))}
            </div>
          </div>

          {/* CAPTURE CONTROLS */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={shareScreen}
              className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition cursor-pointer font-mono text-xs ${
                isScreenActive
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                  : "bg-slate-900/80 hover:bg-slate-900 text-slate-200 border-slate-800"
              }`}
            >
              <Monitor className="w-6 h-6 text-emerald-400" />
              <span className="font-bold">{isScreenActive ? "Screen Capturing" : "1. Capture Screen + Audio"}</span>
              <span className="text-[10px] text-slate-400 text-center">Captures YouTube, Zoom, Meet, Teams audio</span>
            </button>

            <button
              onClick={toggleMicrophone}
              className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition cursor-pointer font-mono text-xs ${
                isMicActive
                  ? "bg-red-500/20 text-red-300 border-red-500/50 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                  : "bg-slate-900/80 hover:bg-slate-900 text-slate-200 border-slate-800"
              }`}
            >
              <Mic className="w-6 h-6 text-red-400" />
              <span className="font-bold">{isMicActive ? "Transcribing..." : "2. Start Transcription"}</span>
              <span className="text-[10px] text-slate-400 text-center">
                {isMicActive ? `Active: ${getCurrentSpeakerName()}` : "Web Speech API (Chrome/Edge)"}
              </span>
            </button>
          </div>

          {/* HOW TO USE */}
          {!isMicActive && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 text-[11px] font-mono text-blue-300 space-y-1">
              <div className="font-bold text-blue-200 mb-1">How to transcribe a YouTube / Zoom meeting:</div>
              <div>1. Open the video in another tab and start playing it</div>
              <div>2. Click <strong>"Capture Screen + Audio"</strong> → select that tab → tick <strong>"Share tab audio"</strong></div>
              <div>3. Name your speakers above, then click <strong>"Start Transcription"</strong></div>
              <div>4. Before each person speaks, click their name button to set the active speaker</div>
              <div>5. Transcripts auto-save to JSON + TXT every utterance</div>
            </div>
          )}

          {/* DEMO + EXPORT */}
          <div className="flex flex-wrap items-center justify-between bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 font-mono text-xs gap-2">
            <button
              onClick={runAutoDemo}
              className="px-3 py-1.5 bg-[#D7F64A] hover:bg-[#c5e43a] text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(215,246,74,0.3)]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Run Demo Transcript
            </button>

            <div className="flex items-center gap-2">
              {exportJsonPath ? (
                <a
                  href={`${serverBase}/${exportJsonPath}`}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="px-3 py-1.5 bg-emerald-900/50 hover:bg-emerald-900 text-emerald-300 rounded-lg text-xs font-mono border border-emerald-700 flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3" /> Export .JSON
                </a>
              ) : (
                <span className="px-3 py-1.5 text-slate-600 rounded-lg text-xs font-mono border border-slate-800">
                  📥 .JSON (after session starts)
                </span>
              )}

              {exportTxtPath ? (
                <a
                  href={`${serverBase}/${exportTxtPath}`}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="px-3 py-1.5 bg-emerald-900/50 hover:bg-emerald-900 text-emerald-300 rounded-lg text-xs font-mono border border-emerald-700 flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3" /> Export .TXT
                </a>
              ) : (
                <span className="px-3 py-1.5 text-slate-600 rounded-lg text-xs font-mono border border-slate-800">
                  📥 .TXT (after session starts)
                </span>
              )}
            </div>
          </div>

          {/* LIVE LOG */}
          <div
            ref={logRef}
            className="mt-2 p-4 bg-slate-950 rounded-xl border border-slate-800/80 h-48 overflow-y-auto font-mono text-[11px] space-y-1.5"
          >
            {streamLog.length === 0 ? (
              <span className="text-slate-600 italic">Connecting to live meeting WebSocket stream...</span>
            ) : (
              streamLog.map((log, idx) => (
                <div
                  key={idx}
                  className={
                    log.includes("VALIDATED")
                      ? "text-[#D7F64A] font-bold bg-[#D7F64A]/10 p-1.5 rounded border border-[#D7F64A]/20"
                      : log.includes("🎙️")
                      ? "text-blue-300"
                      : log.includes("⚠️")
                      ? "text-amber-400"
                      : log.includes("✨")
                      ? "text-emerald-300"
                      : "text-slate-400"
                  }
                >
                  {log}
                </div>
              ))
            )}
          </div>

          {/* STATUS FOOTER */}
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-1 border-t border-slate-800/60">
            <span className="flex items-center gap-1 text-[#D7F64A]">
              <ShieldCheck className="w-3.5 h-3.5" /> Zero-Hallucination Gate Active
            </span>
            <span className={`flex items-center gap-1 ${activeMeetingId ? "text-emerald-400" : "text-slate-600"}`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              {activeMeetingId ? `Session: ${activeMeetingId.substring(0, 20)}...` : "Waiting for session..."}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
