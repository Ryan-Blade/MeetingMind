
export default function App() {
  return (
    <div className="min-h-screen bg-[#0D1627] text-slate-100 p-8">
      <header className="max-w-7xl mx-auto flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-4 h-4 rounded-full bg-[#D7F64A] animate-pulse" />
          <h1 className="text-2xl font-bold tracking-tight text-white font-['Space_Grotesk']">
            MeetingMind <span className="text-[#D7F64A] text-sm font-mono ml-2">SIGNAL ROOM</span>
          </h1>
        </div>
        <span className="text-xs font-mono px-3 py-1 bg-slate-800 text-slate-300 rounded-full border border-slate-700">
          Citation-Verified Intelligence
        </span>
      </header>

      <main className="max-w-7xl mx-auto mt-8">
        <div className="p-12 border border-slate-800 rounded-xl bg-slate-900/40 text-center">
          <h2 className="text-3xl font-bold mb-4 font-['Space_Grotesk'] text-white">
            Zero-Hallucination Meeting Intelligence
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto font-sans">
            Parses transcripts into citation-verified decisions, action items, risks, and disagreements.
          </p>
        </div>
      </main>
    </div>
  );
}
