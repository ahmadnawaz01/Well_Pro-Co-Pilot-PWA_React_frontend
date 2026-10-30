import { useState, useEffect, useRef } from 'react';
import { aiService } from '../services/aiService';
import { dashboardService } from '../services/dashboardService';
import { Cpu, Send, TrendingUp, RefreshCw, Bot, User } from 'lucide-react';

export function CoPilotPage() {
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Hello! I am your WellPro Co-Pilot. I monitor your Health, Financial, and Social score components with exponential recency weighting. How can I assist your wellbeing today?'
    }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [trends, setTrends] = useState([]);
  const [loadingTrends, setLoadingTrends] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    async function loadTrends() {
      try {
        const metrics = await dashboardService.getDashboardMetrics(30);
        if (metrics?.historical_trends) {
          setTrends(metrics.historical_trends);
        }
      } catch (err) {
        console.warn('Could not load historical trends:', err);
      } finally {
        setLoadingTrends(false);
      }
    }
    loadTrends();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputMsg;
    if (!text.trim() || sending) return;

    const userMessage = { sender: 'user', text: text.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInputMsg('');
    setSending(true);

    try {
      const response = await aiService.sendChatMessage(text.trim());
      const reply = response.response || response.message || 'I have analyzed your query and updated your profile insights.';
      setMessages(prev => [...prev, { sender: 'bot', text: reply }]);
    } catch (err) {
      setMessages(prev => [
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

  return (
    <div className="space-y-4 font-sans max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#121820] to-[#1a232e] border border-[#2a3644] rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-gradient-to-tr from-[#f43f5e] to-[#a855f7] rounded-xl text-white shadow-lg shadow-rose-500/20">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">WellPro Intelligent Co-Pilot</h2>
            <span className="font-mono text-xs text-[#06b6d4]">
              AUTONOMOUS ADVISOR WITH MULTI-WINDOW EXPONENTIAL DECAY
            </span>
          </div>
        </div>
        <p className="text-xs text-[#8a99ad] leading-relaxed">
          Ask questions regarding your 7-day, 30-day, and 90-day wellbeing trajectory. The scoring engine evaluates your habits using a 14-day half-life decay function (&lambda; = 0.05).
        </p>
      </div>

      {/* Historical Trend Timeline Card */}
      <div className="bg-[#121820] border border-[#2a3644] rounded-2xl p-4 shadow-xl space-y-3 font-mono text-xs">
        <div className="flex justify-between items-center border-b border-[#2a3644] pb-2">
          <div className="flex items-center gap-2 text-white font-bold">
            <TrendingUp className="w-4 h-4 text-[#06b6d4]" />
            <span>30-Day Historical Trend Analytics</span>
          </div>
          <span className="text-[10px] text-[#8a99ad]">
            {trends.length} RECORDED SCORE DATA POINTS
          </span>
        </div>

        {loadingTrends ? (
          <div className="py-6 text-center text-[#8a99ad]">
            <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-[#06b6d4]" />
            <span>CALCULATING HISTORICAL TRAJECTORY...</span>
          </div>
        ) : trends.length === 0 ? (
          <div className="p-4 text-center text-[#8a99ad] text-xs">
            No historical score points logged yet. Add logs in "New Record" or "AI Capture" to generate rolling timelines.
          </div>
        ) : (
          <div className="overflow-x-auto no-scrollbar pb-1">
            <div className="flex gap-2 min-w-max">
              {trends.slice(-14).map((t, idx) => (
                <div key={idx} className="bg-[#1a232e] p-2.5 rounded-xl border border-[#2a3644] text-center w-24 flex flex-col justify-between">
                  <span className="text-[9px] text-[#8a99ad] block mb-1">
                    {String(t.score_date).slice(5)}
                  </span>
                  <span className="text-base font-bold text-white block">
                    {Math.round(t.overall_score || 0)}%
                  </span>
                  <div className="text-[8px] text-[#8a99ad] mt-1 space-y-0.5">
                    <div className="text-emerald-400">H: {Math.round(t.health_score || 0)}%</div>
                    <div className="text-cyan-400">F: {Math.round(t.financial_score || 0)}%</div>
                    <div className="text-purple-400">S: {Math.round(t.social_score || 0)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Interactive Chat Box */}
      <div className="bg-[#121820] border border-[#2a3644] rounded-2xl p-4 shadow-xl flex flex-col h-[460px]">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 font-sans text-sm">
          {messages.map((m, i) => (
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
                    : 'bg-[#1a232e] border border-[#2a3644] text-[#f0f4f8] rounded-tl-none font-mono'
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
          ))}
          {sending && (
            <div className="flex gap-2.5 items-center font-mono text-xs text-[#8a99ad]">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#f43f5e] to-[#a855f7] flex items-center justify-center text-white shrink-0">
                <RefreshCw className="w-4 h-4 animate-spin" />
              </div>
              <span className="animate-pulse">CO-PILOT IS EVALUATING REASONING PATH...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex gap-1.5 overflow-x-auto py-2 border-t border-[#2a3644]/50 no-scrollbar">
          {[
            'How can I improve my financial score this week?',
            'Analyze my 30-day health trend.',
            'Give me tips to optimize sleep and steps.'
          ].map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(prompt)}
              className="bg-[#1a232e] hover:bg-[#2a3644] text-[#06b6d4] text-[10px] font-mono px-2.5 py-1 rounded-lg border border-[#2a3644] whitespace-nowrap cursor-pointer transition-colors"
            >
              {prompt}
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
            className="flex-1 bg-[#1a232e] border border-[#2a3644] text-white px-3.5 py-2.5 rounded-xl font-sans text-xs focus:outline-none focus:border-[#f43f5e]"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={sending || !inputMsg.trim()}
            className="bg-gradient-to-r from-[#f43f5e] to-[#a855f7] text-white px-4 py-2.5 rounded-xl font-mono text-xs font-bold shadow-lg active:scale-95 transition-all cursor-pointer disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default CoPilotPage;
