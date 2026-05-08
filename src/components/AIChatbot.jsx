import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MessageSquare, Send, X, Trash2, Bot, User, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const HF_TOKEN = import.meta.env.VITE_HUGGING_FACE_TOKEN;
const API_URL = "https://router.huggingface.co/v1/chat/completions";
const MODEL = "deepseek-ai/DeepSeek-V4-Pro:novita";
const CACHE_KEY = 'chat_history';

const AIChatbot = ({ dashboardData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem(CACHE_KEY);
    if (saved) setMessages(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem(CACHE_KEY, JSON.stringify(messages.slice(-30)));
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const systemPrompt = `
        You are Mission Control AI. Answer questions using this dashboard data:
        Current ISS Data:
        - Position: ${dashboardData.iss.lat}, ${dashboardData.iss.lng}
        - Speed: ${dashboardData.iss.speed} km/h
        - Nearest: ${dashboardData.iss.nearest}
        - People in Space: ${dashboardData.iss.peopleCount} (${dashboardData.iss.peopleNames.join(', ')})
        
        Latest News Headlines:
        ${dashboardData.news.slice(0, 5).map(n => `- ${n.title}`).join('\n')}
        
        Strict Rule: Answer ONLY based on this data. If not found, say you don't know. Be concise and professional.
      `;

      const response = await axios.post(
        API_URL,
        {
          model: MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.map(m => ({
              role: m.role === 'bot' ? 'assistant' : 'user',
              content: m.text
            })),
            { role: "user", content: input }
          ],
          max_tokens: 500,
          temperature: 0.7
        },
        { 
          headers: { 
            Authorization: `Bearer ${HF_TOKEN}`,
            "Content-Type": "application/json"
          } 
        }
      );

      const botText = response.data.choices[0].message.content;
      setMessages(prev => [...prev, { role: 'bot', text: botText }]);
    } catch (error) {
      console.error('Chatbot error:', error);
      setMessages(prev => [...prev, { role: 'bot', text: "Mission control connection lost. Please verify your HF token." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem(CACHE_KEY);
  };

  return (
    <>
      {/* Floating Button */}
      <button 
        className="fixed bottom-8 right-8 w-16 h-16 bg-accent text-white rounded-full shadow-[0_8px_30px_rgb(34,211,238,0.4)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 group"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={28} /> : (
          <div className="relative">
            <MessageSquare size={28} />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-pulse" />
          </div>
        )}
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 30, scale: 0.9, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 30, scale: 0.9, filter: 'blur(10px)' }}
            className="fixed bottom-28 right-8 w-[420px] h-[600px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[2rem] shadow-2xl flex flex-col z-50 border border-white/20 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-accent p-6 text-white flex justify-between items-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <Sparkles className="w-full h-full" />
              </div>
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-none mb-1">Mission AI</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-[11px] opacity-90 font-medium">System Online</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={clearChat} 
                className="hover:bg-white/20 p-2 rounded-xl transition-colors relative z-10" 
                title="Reset Frequency"
              >
                <Trash2 size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-transparent">
              {messages.length === 0 && (
                <div className="text-center text-slate-400 mt-20 px-8">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Sparkles size={32} className="text-accent" />
                  </div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    Awaiting commands. Ask me about the ISS position or cosmic news.
                  </p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-accent text-white rounded-tr-none shadow-lg shadow-cyan-500/20' 
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-sm border border-slate-100 dark:border-slate-700 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 rounded-tl-none flex gap-1.5">
                    <span className="w-1.5 h-1.5 bg-accent/40 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-accent/60 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex gap-3"
              >
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask mission control..."
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-5 py-3.5 text-sm outline-none focus:ring-2 focus:ring-accent transition-all dark:text-white"
                />
                <button 
                  type="submit" 
                  disabled={!input.trim()}
                  className="bg-accent text-white p-3.5 rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/20"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIChatbot;
