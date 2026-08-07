import { useState } from "react";
import { Header } from "./components/Header.js";
import { UploadModal } from "./components/UploadModal.js";
import { TranscriptTimeline } from "./components/TranscriptTimeline.js";
import { IntelligenceCards } from "./components/IntelligenceCards.js";
import { FilterBar } from "./components/FilterBar.js";
import { PRD_FIXTURE_MEETING } from "./mockData.js";
import { MeetingData } from "./types.js";


export default function App() {
  const [meeting, setMeeting] = useState<MeetingData>(PRD_FIXTURE_MEETING);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedUtteranceId, setSelectedUtteranceId] = useState<string | null>(null);
  const [highlightQuote, setHighlightQuote] = useState<string | null>(null);

  // Filters state
  const [activeTypeFilter, setActiveTypeFilter] = useState("ALL");
  const [selectedOwner, setSelectedOwner] = useState("ALL");
  const [selectedPriority, setSelectedPriority] = useState("ALL");
  const [sortBy, setSortBy] = useState("TIMESTAMP");

  const handleSelectUtterance = (utteranceId: string, quote?: string) => {
    setSelectedUtteranceId(utteranceId);
    setHighlightQuote(quote || null);
  };

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch(`http://localhost:3001/api/meetings/${meeting.id}/analyze`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.meeting) {
          setMeeting(data.meeting);
        }
      }
    } catch (err) {
      console.warn("Backend analyze endpoint offline, retaining validated fixture extractions:", err);
    } finally {
      setTimeout(() => setIsAnalyzing(false), 800);
    }
  };

  // Derive owners list from action items & attendees
  const allOwners = Array.from(
    new Set([
      ...meeting.attendees,
      ...meeting.actionItems.map((a) => a.owner),
    ])
  );

  // Filter action items
  const filteredActionItems = meeting.actionItems.filter((a) => {
    if (selectedOwner !== "ALL" && a.owner !== selectedOwner) return false;
    if (selectedPriority !== "ALL" && a.priority !== selectedPriority) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0D1627] text-slate-100 flex flex-col font-sans">
      <Header
        onOpenUpload={() => setIsUploadOpen(true)}
        onAnalyze={handleRunAnalysis}
        isAnalyzing={isAnalyzing}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col">
        {/* Meeting Metadata Banner */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <h2 className="text-xl font-bold font-['Space_Grotesk'] text-white">
                {meeting.title}
              </h2>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#D7F64A]/10 text-[#D7F64A] border border-[#D7F64A]/30">
                {meeting.sourceFormat.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono flex items-center gap-3">
              <span>Date: {new Date(meeting.date).toLocaleDateString()}</span>
              <span>•</span>
              <span>Attendees: {meeting.attendees.join(", ")}</span>
            </p>
          </div>

          <div className="flex items-center space-x-6 text-xs font-mono text-slate-300 bg-slate-950 px-4 py-2 rounded-lg border border-slate-800">
            <div className="text-center">
              <span className="text-[#D7F64A] font-bold text-sm block">
                {meeting.decisions.length}
              </span>
              <span className="text-[10px] text-slate-400">DECISIONS</span>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div className="text-center">
              <span className="text-blue-400 font-bold text-sm block">
                {meeting.actionItems.length}
              </span>
              <span className="text-[10px] text-slate-400">ACTIONS</span>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div className="text-center">
              <span className="text-amber-400 font-bold text-sm block">
                {meeting.risks.length}
              </span>
              <span className="text-[10px] text-slate-400">RISKS</span>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div className="text-center">
              <span className="text-purple-400 font-bold text-sm block">
                {meeting.disagreements.length}
              </span>
              <span className="text-[10px] text-slate-400">DISAGREEMENTS</span>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <FilterBar
          activeType={activeTypeFilter}
          onTypeChange={setActiveTypeFilter}
          selectedOwner={selectedOwner}
          onOwnerChange={setSelectedOwner}
          selectedPriority={selectedPriority}
          onPriorityChange={setSelectedPriority}
          sortBy={sortBy}
          onSortChange={setSortBy}
          owners={allOwners}
        />

        {/* Dual-Pane Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[580px] mb-8">
          {/* Left Pane: Transcript Timeline */}
          <TranscriptTimeline
            utterances={meeting.utterances}
            selectedUtteranceId={selectedUtteranceId}
            highlightQuote={highlightQuote}
          />

          {/* Right Pane: Validated Intelligence Cards */}
          <IntelligenceCards
            decisions={meeting.decisions}
            actionItems={filteredActionItems}
            risks={meeting.risks}
            disagreements={meeting.disagreements}
            selectedUtteranceId={selectedUtteranceId}
            onSelectUtterance={handleSelectUtterance}
            activeFilterType={activeTypeFilter}
          />
        </div>
      </main>

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={(newMeeting) => {
          setMeeting(newMeeting);
        }}
      />
    </div>
  );
}
