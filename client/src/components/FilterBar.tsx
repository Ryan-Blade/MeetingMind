import { Filter, SortAsc, Users, Flag } from "lucide-react";

interface FilterBarProps {
  activeType: string;
  onTypeChange: (type: string) => void;
  selectedOwner: string;
  onOwnerChange: (owner: string) => void;
  selectedPriority: string;
  onPriorityChange: (priority: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  owners: string[];
}

export function FilterBar({
  activeType,
  onTypeChange,
  selectedOwner,
  onOwnerChange,
  selectedPriority,
  onPriorityChange,
  sortBy,
  onSortChange,
  owners,
}: FilterBarProps) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-4 mb-6">
      <div className="flex flex-wrap items-center gap-3">
        {/* Type Filter */}
        <div className="flex items-center space-x-1.5">
          <Filter className="w-3.5 h-3.5 text-[#D7F64A]" />
          <span className="text-xs font-mono text-slate-400">Type:</span>
          <select
            value={activeType}
            onChange={(e) => onTypeChange(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-[#D7F64A]"
          >
            <option value="ALL">All Types</option>
            <option value="DECISIONS">Decisions</option>
            <option value="ACTIONS">Action Items</option>
            <option value="RISKS">Risks</option>
            <option value="DISAGREEMENTS">Disagreements</option>
          </select>
        </div>

        {/* Owner Filter */}
        <div className="flex items-center space-x-1.5">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-mono text-slate-400">Owner:</span>
          <select
            value={selectedOwner}
            onChange={(e) => onOwnerChange(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-[#D7F64A]"
          >
            <option value="ALL">All Owners</option>
            {owners.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center space-x-1.5">
          <Flag className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-mono text-slate-400">Priority:</span>
          <select
            value={selectedPriority}
            onChange={(e) => onPriorityChange(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-[#D7F64A]"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Sort By */}
      <div className="flex items-center space-x-1.5">
        <SortAsc className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-xs font-mono text-slate-400">Sort By:</span>
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-[#D7F64A]"
        >
          <option value="TIMESTAMP">Timestamp (Chronological)</option>
          <option value="CONFIDENCE">Confidence (High to Low)</option>
          <option value="PRIORITY">Priority Level</option>
        </select>
      </div>
    </div>
  );
}
