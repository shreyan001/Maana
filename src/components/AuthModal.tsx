import React, { useState } from "react";
import { Key, Copy, Check, ShieldCheck, X, Globe } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentToken: string;
  onUpdateToken: (token: string) => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  currentToken,
  onUpdateToken,
}: AuthModalProps) {
  const [copied, setCopied] = useState(false);
  const [inputToken, setInputToken] = useState(currentToken);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputToken.trim()) {
      onUpdateToken(inputToken.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-[#121215] border border-[#27272a] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-[#27272a] pb-4">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Key className="w-4 h-4 text-indigo-400" />
            <span>Extension Authentication & Connection</span>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Token Card */}
        <div className="p-4 rounded-xl bg-[#18181b] border border-[#27272a] space-y-3">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Active Session Token</span>
            <span className="flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5" />
              Authenticated
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={currentToken}
              className="flex-1 bg-[#09090b] border border-[#27272a] rounded-lg px-3 py-2 text-xs font-mono text-neutral-200 outline-none select-all"
            />
            <button
              onClick={handleCopy}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-1.5 transition"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" /> Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copy
                </>
              )}
            </button>
          </div>
        </div>

        {/* Extension Installation Guide */}
        <div className="space-y-2 text-xs text-neutral-300">
          <div className="font-semibold text-white flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-cyan-400" />
            <span>Load Chrome Extension in 3 Steps:</span>
          </div>
          <ol className="list-decimal list-inside space-y-1.5 text-neutral-400 pl-1">
            <li>
              Open <code className="bg-[#18181b] px-1.5 py-0.5 rounded text-neutral-200">chrome://extensions</code> in Chrome and enable <strong>Developer mode</strong> (top-right).
            </li>
            <li>
              Click <strong>"Load unpacked"</strong> and choose the <code className="bg-[#18181b] px-1.5 py-0.5 rounded text-neutral-200">extension/</code> folder in this project.
            </li>
            <li>
              Click the Maana puzzle icon and paste the session token above!
            </li>
          </ol>
        </div>

        {/* Custom Token Switch */}
        <form onSubmit={handleSave} className="pt-2 border-t border-[#27272a] flex gap-2">
          <input
            type="text"
            placeholder="Switch user token..."
            value={inputToken}
            onChange={(e) => setInputToken(e.target.value)}
            className="flex-1 bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            className="bg-[#27272a] hover:bg-[#3f3f46] text-white text-xs font-medium px-4 py-2 rounded-lg transition"
          >
            Update
          </button>
        </form>
      </div>
    </div>
  );
}
