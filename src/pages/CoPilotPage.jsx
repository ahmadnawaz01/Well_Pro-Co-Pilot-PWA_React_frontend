import { useState, useEffect, useRef } from 'react';
import { aiService } from '../services/aiService';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { Cpu, Send, RefreshCw, Bot, User, Trash2, Sparkles } from 'lucide-react';

const INITIAL_MESSAGE = {
  sender: 'bot',
  text: 'Hello! I am your WellPro Co-Pilot, powered by FastAPI and Frappe ERP. I monitor your Health, Financial, and Social score components with exponential recency weighting. How can I assist your wellbeing today?'
};

export function CoPilotPage() {
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [inputMsg, setInputMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const messagesEndRef = useRef(null);

  // Load chat history from FastAPI / MongoDB on mount
  useEffect(() => {
    let isMounted = true;

    async function fetchHistory() {
      try {
        setLoadingHistory(true);
        const history = await aiService.getChatHistory('default');
        if (isMounted && Array.isArray(history) && history.length > 0) {
          const formatted = history.map((m) => ({
            sender: m.role === 'user' ? 'user' : 'bot',
            text: m.content || m.message || ''
          }));
          setMessages(formatted);
        }
      } catch (err) {
        console.warn('Could not load chat history:', err);
      } finally {
        if (isMounted) setLoadingHistory(false);
      }
    }

    fetchHistory();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputMsg;
    if (!text.trim() || sending) return;

    const userMessage = { sender: 'user', text: text.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInputMsg('');
    setSending(true);

    try {
      const response = await aiService.sendChatMessage(text.trim(), 'default');
      const reply = response.response || response.message || 'I have analyzed your query and updated your profile insights.';
      setMessages((prev) => [...prev, { sender: 'bot', text: reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: `I encountered an issue connecting to the co-pilot agent: ${err.message}. However, your logs and scores in Frappe are safe and active.`
        }
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleConfirmClear = async () => {
    try {
      setClearing(true);
      await aiService.clearChatHistory('default');
      setMessages([INITIAL_MESSAGE]);
      setIsClearModalOpen(false);
      window.dispatchEvent(
        new CustomEvent('wellpro:toast', {
          detail: {
            type: 'success',
            title: 'Memory Cleared',
            message: 'Co-Pilot conversation checkpoints and memory reset successfully.'
          }
        })
      );
    } catch (err) {
      window.dispatchEvent(
        new CustomEvent('wellpro:toast', {
          detail: {
            type: 'error',
            title: 'Clear Failed',
            message: err.message || 'Unable to clear chat memory'
          }
        })
      );
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-4 font-sans max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#121820] to-[#1a232e] border border-[#2a3644] rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-[#f43f5e] to-[#a855f7] rounded-xl text-white shadow-lg shadow-rose-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">WellPro Intelligent Co-Pilot</h2>
              <span className="font-mono text-xs text-[#06b6d4]">
                REACT AGENTIC CHATBOT &middot; FASTAPI &middot; MONGODB PERSISTENCE
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsClearModalOpen(true)}
            disabled={clearing || loadingHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#2a3644] hover:border-red-500/50 bg-[#1a232e] hover:bg-red-500/10 text-[#8a99ad] hover:text-red-400 font-mono text-xs transition-colors cursor-pointer disabled:opacity-40"
            title="Clear Chat Memory"
          >
            {clearing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">CLEAR MEMORY</span>
          </button>
        </div>

        <p className="text-xs text-[#8a99ad] leading-relaxed">
          Ask questions regarding your 7-day, 30-day, and 90-day wellbeing trajectory. The agent reasons dynamically, invokes Frappe database tools to fetch your real metrics, and persists session memory in MongoDB.
        </p>
      </div>

      {/* Interactive Chat Box */}
      <div className="bg-[#121820] border border-[#2a3644] rounded-2xl p-4 shadow-xl flex flex-col h-[540px]">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 font-sans text-sm">
          {loadingHistory ? (
            <div className="flex items-center justify-center h-full gap-2 font-mono text-xs text-[#8a99ad]">
              <RefreshCw className="w-4 h-4 animate-spin text-[#06b6d4]" />
              <span>SYNCHRONIZING CONVERSATION CHECKPOINTS...</span>
            </div>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'bot' && (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#f43f5e] to-[#a855f7] flex items-center justify-center text-white shrink-0 shadow-md">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-gradient-to-r from-[#f43f5e] to-[#a855f7] text-white rounded-tr-none'
                      : 'bg-[#1a232e] border border-[#2a3644] text-[#f0f4f8] rounded-tl-none font-mono whitespace-pre-wrap'
                  }`}
                >
                  {m.text}
                </div>
                {m.sender === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-[#2a3644] flex items-center justify-center text-[#8a99ad] shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))
          )}

          {sending && (
            <div className="flex gap-2.5 items-center font-mono text-xs text-[#8a99ad]">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#f43f5e] to-[#a855f7] flex items-center justify-center text-white shrink-0">
                <RefreshCw className="w-4 h-4 animate-spin" />
              </div>
              <span className="animate-pulse">CO-PILOT IS EXECUTING REASONING TOOLS...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex gap-1.5 overflow-x-auto py-2 border-t border-[#2a3644]/50 no-scrollbar">
          {[
            'How can I improve my financial score this week?',
            'Analyze my 30-day health trend.',
            'Give me tips to optimize sleep and steps.',
            'Summarize my recent social interactions.'
          ].map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(prompt)}
              className="bg-[#1a232e] hover:bg-[#2a3644] text-[#06b6d4] text-[10px] font-mono px-2.5 py-1 rounded-lg border border-[#2a3644] whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-2.5 h-2.5 text-[#f43f5e]" />
              <span>{prompt}</span>
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <div className="flex gap-2 pt-2 border-t border-[#2a3644]">
          <input
            type="text"
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask your WellPro Co-Pilot about health, finances, habits..."
            className="flex-1 bg-[#1a232e] border border-[#2a3644] text-white px-3.5 py-2.5 rounded-xl font-sans text-xs focus:outline-none focus:border-[#f43f5e] transition-colors"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={sending || !inputMsg.trim()}
            className="bg-gradient-to-r from-[#f43f5e] to-[#a855f7] hover:opacity-90 text-white px-4 py-2.5 rounded-xl font-mono text-xs font-bold shadow-lg active:scale-95 transition-all cursor-pointer disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default CoPilotPage;
