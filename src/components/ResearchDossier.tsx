import React, { useState } from "react";
import {
  Search,
  ExternalLink,
  Flame,
  CheckCircle2,
  Plus,
} from "lucide-react";

export interface ResearchCard {
  _id: string;
  query: string;
  sourceUrls: string[];
  summaries?: string[];
  status: "pending" | "complete" | "failed";
  provider: "firecrawl";
  createdAt: number;
  nodeTitle?: string;
}

interface ResearchDossierProps {
  researchList: ResearchCard[];
  onTriggerResearch?: (query: string) => void;
  goalTitle: string;
}

export default function ResearchDossier({
  researchList,
  onTriggerResearch,
  goalTitle,
}: ResearchDossierProps) {
  const [newQuery, setNewQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuery.trim()) return;
    if (onTriggerResearch) {
      onTriggerResearch(newQuery.trim());
    }
    setNewQuery("");
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="rounded-2xl p-6 bg-zinc-900/40 border border-zinc-800/80 shadow-xl backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-zinc-800/80">
          <div>
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-400" />
              <h2 className="text-base font-bold text-white tracking-tight">
                Firecrawl Autonomous Web Research Dossiers
              </h2>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Target Intent: <span className="text-indigo-300 font-semibold">"{goalTitle}"</span>
            </p>
          </div>
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-orange-950/70 border border-orange-800/60 text-orange-300 font-medium">
            Firecrawl Component Active
          </span>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          Maana automatically invokes Firecrawl when a newly discovered branch or prerequisite requires external documentation, standard library source references, or pattern explanations.
        </p>

        {/* Trigger Manual Search Form */}
        <form onSubmit={handleSubmit} className="flex gap-2 pt-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Research documentation or pattern (e.g. bisect_left insertion semantics)..."
              value={newQuery}
              onChange={(e) => setNewQuery(e.target.value)}
              className="w-full bg-zinc-950/80 border border-zinc-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30"
            />
          </div>
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs transition shadow-lg shadow-orange-600/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Crawl Sources</span>
          </button>
        </form>
      </div>

      {/* Research Records Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {researchList.map((item) => (
          <div
            key={item._id}
            className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 hover:border-orange-900/50 transition space-y-3.5 flex flex-col justify-between shadow-lg"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-950/80 text-orange-300 border border-orange-800/60 font-semibold uppercase flex items-center gap-1">
                  <Flame className="w-3 h-3 text-orange-400" />
                  {item.provider}
                </span>

                <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  {item.status}
                </span>
              </div>

              <h4 className="text-sm font-bold text-white tracking-tight">
                "{item.query}"
              </h4>

              {item.nodeTitle && (
                <div className="text-[11px] font-mono text-indigo-300 bg-indigo-950/40 px-2.5 py-1 rounded-md border border-indigo-800/40 inline-block">
                  Associated Branch: <strong>{item.nodeTitle}</strong>
                </div>
              )}

              {item.summaries && item.summaries.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {item.summaries.map((sum, idx) => (
                    <p
                      key={idx}
                      className="text-xs text-zinc-300 font-sans leading-relaxed bg-zinc-950/70 p-3 rounded-xl border border-zinc-800/80"
                    >
                      {sum}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Crawled Source URLs */}
            <div className="pt-2 border-t border-zinc-800/80 space-y-1.5 font-mono text-[11px]">
              <span className="text-zinc-500 uppercase tracking-wider text-[10px] font-semibold">
                Crawled Primary Sources ({item.sourceUrls.length})
              </span>
              <div className="space-y-1">
                {item.sourceUrls.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between text-indigo-400 hover:text-indigo-300 bg-zinc-950/50 hover:bg-zinc-950 p-1.5 rounded-lg border border-zinc-800/60 transition group"
                  >
                    <span className="truncate max-w-[280px]">{url}</span>
                    <ExternalLink className="w-3 h-3 shrink-0 opacity-60 group-hover:opacity-100" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
