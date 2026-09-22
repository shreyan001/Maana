import { useState } from "react";
import {
  Folder,
  FileText,
  Copy,
  Check,
  Download,
  BookOpen,
  ChevronRight,
} from "lucide-react";

export interface ObsidianFile {
  path: string;
  filename: string;
  content: string;
}

interface ObsidianViewProps {
  files: ObsidianFile[];
  goalTitle: string;
}

export default function ObsidianView({ files, goalTitle }: ObsidianViewProps) {
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  const selectedFile = files[selectedFileIndex] || files[0];

  const handleCopy = () => {
    if (!selectedFile) return;
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadAll = () => {
    const combined = files
      .map((f) => `<!-- FILE: ${f.path} -->\n${f.content}\n\n`)
      .join("\n---\n\n");
    const blob = new Blob([combined], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Maana-Vault-${goalTitle.slice(0, 25).replace(/\s+/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="rounded-2xl p-6 bg-zinc-900/40 border border-zinc-800/80 shadow-xl backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-zinc-800/80">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-400" />
              <h2 className="text-base font-bold text-white tracking-tight">
                Obsidian Vault Markdown Projection
              </h2>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Target Vault: <span className="text-purple-300 font-semibold">"~/Obsidian/Maana"</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadAll}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition shadow-lg shadow-purple-600/30 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Vault Bundle</span>
            </button>
          </div>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          Convex remains canonical; Obsidian is a human-readable projection using standard Markdown with <strong className="text-purple-300 font-mono">[[wikilinks]]</strong> connecting goals, discovered branches, daily reviews, and evidence.
        </p>
      </div>

      {/* Two Column Layout: File Tree on Left, File Content on Right */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Vault Explorer */}
        <div className="rounded-2xl p-4 bg-zinc-900/40 border border-zinc-800/80 shadow-xl backdrop-blur-md space-y-3">
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 px-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Folder className="w-4 h-4 text-purple-400" />
              Vault Explorer
            </span>
            <span className="text-[10px] text-zinc-500">{files.length} Files</span>
          </div>

          <div className="space-y-1">
            {files.map((file, idx) => {
              const isSelected = idx === selectedFileIndex;
              const folderName = file.path.split("/")[0];
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFileIndex(idx)}
                  className={`w-full text-left p-2.5 rounded-xl border text-xs font-mono transition flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? "bg-purple-950/60 border-purple-600 text-white shadow-md"
                      : "bg-zinc-950/50 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isSelected ? "text-purple-400" : "text-zinc-500"
                      }`}
                    />
                    <div className="truncate">
                      <span className="text-[10px] text-zinc-500 block leading-none mb-0.5">
                        {folderName}/
                      </span>
                      <span className="font-medium truncate">{file.filename}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Markdown Preview & Wikilinks Inspector */}
        <div className="md:col-span-2 rounded-2xl p-6 bg-zinc-900/40 border border-zinc-800/80 shadow-xl backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white">
                {selectedFile?.path}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60">
                [[wikilinks]] active
              </span>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-mono transition cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Markdown</span>
                </>
              )}
            </button>
          </div>

          {/* Code Viewer */}
          <pre className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto selection:bg-purple-500/30">
            {selectedFile?.content}
          </pre>
        </div>
      </div>
    </div>
  );
}
