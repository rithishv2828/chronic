import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { auth } from '../lib/firebase';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

interface Message {
  role: 'user' | 'model';
  text: string;
}

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: "Hello! I'm your Vitality health assistant. How can I help you today? You can ask me about your chronic disease management, diet tips, or how to interpret your vitals." }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction: "You are a helpful and empathetic health assistant for a patient with chronic diseases like Type 2 Diabetes or Hypertension. Provide evidence-based advice, encourage healthy habits, and always remind the user to consult their doctor for medical decisions. Be concise and supportive.",
          tools: [{ googleSearch: {} }]
        }
      });

      const botText = response.text || "I'm sorry, I couldn't process that. Could you try again?";
      setMessages(prev => [...prev, { role: 'model', text: botText }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "I'm having trouble connecting right now. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900">Vitality Assistant</h3>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs text-slate-500 font-medium">Online & Ready to help</span>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex gap-3 max-w-[85%]",
              msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
              msg.role === 'user' ? "bg-blue-100" : "bg-white shadow-sm border border-slate-100"
            )}>
              {msg.role === 'user' ? <User className="w-5 h-5 text-blue-600" /> : <Bot className="w-5 h-5 text-blue-600" />}
            </div>
            <div className={cn(
              "p-4 rounded-2xl text-sm leading-relaxed",
              msg.role === 'user' 
                ? "bg-blue-600 text-white rounded-tr-none" 
                : "bg-white text-slate-700 shadow-sm border border-slate-100 rounded-tl-none"
            )}>
              <div className="markdown-body">
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-white shadow-sm border border-slate-100 rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5 text-blue-600" />
            </div>
            <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-slate-100">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-slate-100 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your health..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-3 rounded-xl transition-all shadow-md shadow-blue-200"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
