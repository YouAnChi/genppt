import React, { useEffect, useState, useRef } from 'react';
import { AgentProgress, AgentStatus } from '../types';
import { Loader2, CheckCircle2, Circle, BrainCircuit, Sparkles, Search, FileText, Image as ImageIcon, Terminal } from 'lucide-react';

interface AgentStatusCardProps {
  progress: AgentProgress;
}

const AgentStatusCard: React.FC<AgentStatusCardProps> = ({ progress }) => {
  // Simple timer to show elapsed time
  const [elapsed, setElapsed] = useState(0);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (progress.status === AgentStatus.COMPLETED || progress.status === AgentStatus.ERROR) return;
    const interval = setInterval(() => setElapsed(e => e + 0.1), 100);
    return () => clearInterval(interval);
  }, [progress.status]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [progress.logs]);

  const getStatusIcon = (status: AgentStatus) => {
    switch (status) {
      case AgentStatus.PLANNING: return <BrainCircuit className="w-5 h-5 text-purple-500 animate-pulse" />;
      case AgentStatus.RESEARCHING: return <Search className="w-5 h-5 text-blue-500 animate-bounce" />;
      case AgentStatus.GENERATING_CONTENT: return <FileText className="w-5 h-5 text-yellow-500 animate-pulse" />;
      case AgentStatus.GENERATING_IMAGES: return <ImageIcon className="w-5 h-5 text-pink-500 animate-pulse" />;
      case AgentStatus.COMPLETED: return <Sparkles className="w-5 h-5 text-green-500" />;
      default: return <Loader2 className="w-5 h-5 animate-spin" />;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 max-w-md w-full overflow-hidden">
      <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-3">
        <div className="flex items-center gap-2">
            {getStatusIcon(progress.status)}
            <span className="font-semibold text-sm text-gray-700">
                AI Agent Working...
            </span>
        </div>
        <span className="text-xs text-gray-400 font-mono">{elapsed.toFixed(1)}s</span>
      </div>

      <div className="space-y-3 mb-4">
        {progress.steps.map((step, idx) => (
          <div key={idx} className="flex items-center gap-3">
            {step.completed ? (
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
            ) : step.current ? (
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-gray-200 shrink-0" />
            )}
            <span className={`text-xs ${step.current ? 'text-gray-800 font-medium' : step.completed ? 'text-gray-500' : 'text-gray-300'}`}>
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {/* Terminal / Log Output */}
      {progress.logs.length > 0 && (
          <div className="mt-2 bg-gray-900 rounded-lg p-3 font-mono text-[10px] text-gray-300 h-32 overflow-y-auto custom-scrollbar shadow-inner">
             <div className="flex items-center gap-2 text-gray-500 mb-2 border-b border-gray-800 pb-1">
                <Terminal size={10} />
                <span>Console Output</span>
             </div>
             <div className="flex flex-col gap-1">
                 {progress.logs.map((log, i) => (
                     <div key={i} className="break-words leading-relaxed animate-fade-in">
                         <span className="text-gray-500 mr-2">[{new Date().toLocaleTimeString([], {hour12: false, hour: "2-digit", minute:"2-digit", second:"2-digit"})}]</span>
                         <span className={log.includes('Error') ? 'text-red-400' : log.includes('Done') || log.includes('Complete') ? 'text-green-400' : 'text-gray-300'}>
                             {log}
                         </span>
                     </div>
                 ))}
                 <div ref={logsEndRef} />
             </div>
          </div>
      )}
    </div>
  );
};

export default AgentStatusCard;