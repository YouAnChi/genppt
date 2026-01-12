import React, { useRef, useEffect } from 'react';
import { Send, Sparkles, User, Bot, Paperclip } from 'lucide-react';
import { ChatMessage, AgentProgress } from '../types';
import AgentStatusCard from './AgentStatusCard';

interface ChatPanelProps {
  messages: ChatMessage[];
  input: string;
  setInput: (val: string) => void;
  onSend: () => void;
  isLoading: boolean;
  agentProgress: AgentProgress | null;
  onSuggestionClick: (text: string) => void;
  suggestions: string[];
  imageSize: "1K" | "2K" | "4K";
  setImageSize: (size: "1K" | "2K" | "4K") => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  input,
  setInput,
  onSend,
  isLoading,
  agentProgress,
  onSuggestionClick,
  suggestions,
  imageSize,
  setImageSize
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, agentProgress]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 border-r border-gray-200 w-full md:w-[400px] shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-white flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-gray-800">
           <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
             <Sparkles size={16} />
           </div>
           <span>GenSpark Slides</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
        {messages.length === 0 && (
           <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 space-y-4">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-2">
                 <Sparkles className="text-indigo-500 w-8 h-8" />
              </div>
              <h3 className="text-lg font-medium text-gray-800">What would you like to create?</h3>
              <p className="text-sm max-w-[280px]">I can research any topic and build a professional presentation for you in seconds.</p>
              
              <div className="grid grid-cols-1 gap-2 w-full max-w-xs mt-4">
                {suggestions.map((s, i) => (
                    <button 
                        key={i}
                        onClick={() => onSuggestionClick(s)}
                        className="text-xs text-left px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                    >
                        {s}
                    </button>
                ))}
              </div>
           </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-gray-200' : 'bg-indigo-100 text-indigo-600'}`}>
              {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>
            
            {/* Content */}
            <div className="flex flex-col max-w-[85%]">
               <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                   msg.role === 'user' 
                   ? 'bg-gray-900 text-white rounded-tr-none' 
                   : 'bg-white border border-gray-100 shadow-sm text-gray-700 rounded-tl-none'
               }`}>
                 {msg.text}
               </div>
               
               {/* Render Agent Status Card if applicable for this message */}
               {msg.isAgentStatus && agentProgress && (
                   <div className="mt-3">
                       <AgentStatusCard progress={agentProgress} />
                   </div>
               )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100">
        
        {/* Image Size Selector */}
        <div className="flex justify-end mb-2">
             <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg p-1">
                <span className="text-[10px] font-semibold text-gray-400 px-1.5 uppercase tracking-wide">Image Size</span>
                {(['1K', '2K', '4K'] as const).map((size) => (
                    <button
                        key={size}
                        onClick={() => setImageSize(size)}
                        className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-all ${
                            imageSize === size 
                            ? 'bg-white text-indigo-600 shadow-sm border border-gray-100' 
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {size}
                    </button>
                ))}
            </div>
        </div>

        <div className="relative flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-xl p-2 focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-300 transition-all">
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <Paperclip size={20} />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your presentation..."
            className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 text-sm py-2.5"
            rows={1}
            style={{ minHeight: '44px' }}
          />
          <button 
            onClick={onSend}
            disabled={!input.trim() || isLoading}
            className={`p-2 rounded-lg transition-all ${
                input.trim() && !isLoading 
                ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 text-center mt-2">
            AI can make mistakes. Please verify facts.
        </p>
      </div>
    </div>
  );
};

export default ChatPanel;
