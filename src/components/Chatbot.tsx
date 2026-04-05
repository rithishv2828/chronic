import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { auth } from '../lib/firebase';
import { Send, Bot, User, Loader2, Sparkles, Mic, MicOff, Volume2, Globe, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const LANGUAGES = [
  { code: 'en-US', name: 'English' },
  { code: 'hi-IN', name: 'हिन्दी' },
  { code: 'ta-IN', name: 'தமிழ்' },
];

interface Message {
  role: 'user' | 'model';
  text: string;
  isIrrelevant?: boolean;
}

export default function Chatbot({ setActiveTab }: { setActiveTab?: (tab: string) => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: "Hello! I'm your MECURA AI health assistant. How can I help you today? You can ask me about your chronic disease management, diet tips, or how to interpret your vitals." }
  ]);

  if (!auth.currentUser) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors h-[calc(100vh-12rem)]">
        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
          <Bot className="w-10 h-10 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">AI Health Assistant</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Please sign in to chat with our AI health assistant and get personalized advice based on your health data.
          </p>
        </div>
        <button
          onClick={() => setActiveTab?.('settings')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all"
        >
          Go to Settings to Sign In
        </button>
      </div>
    );
  }
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setVoiceError('Microphone access denied. Please check your browser settings and allow microphone access.');
        } else {
          setVoiceError(`Speech recognition error: ${event.error}`);
        }
        setIsListening(false);
        setTimeout(() => setVoiceError(null), 5000);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = selectedLanguage.code;
    }
  }, [selectedLanguage]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setIsListening(true);
      recognitionRef.current?.start();
    }
  };

  const speak = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = selectedLanguage.code;
      window.speechSynthesis.speak(utterance);
    }
  };

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
          systemInstruction: `You are a helpful and empathetic health assistant for a patient with chronic diseases like Type 2 Diabetes or Hypertension. 
          Provide evidence-based advice, encourage healthy habits, and always remind the user to consult their doctor for medical decisions. 
          Be concise and supportive. 
          IMPORTANT: You MUST respond in ${selectedLanguage.name}.
          
          CRITICAL: Determine if the user's message is related to health, medical advice, diet, exercise, or chronic disease management.
          If it is NOT related to these topics (e.g., general knowledge, jokes, unrelated tasks), set "isIrrelevant" to true in your JSON response.`,
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: "The response text" },
              isIrrelevant: { type: Type.BOOLEAN, description: "Whether the user's query was irrelevant to health/medical topics" }
            },
            required: ["text", "isIrrelevant"]
          }
        }
      });

      const result = JSON.parse(response.text || '{"text": "I\'m sorry, I couldn\'t process that.", "isIrrelevant": false}');
      setMessages(prev => [...prev, { role: 'model', text: result.text, isIrrelevant: result.isIrrelevant }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "I'm having trouble connecting right now. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-xl flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">MECURA AI Assistant</h3>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Online & Ready to help</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative group">
            <button className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2 text-slate-600 dark:text-slate-300 border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
              <Globe className="w-4 h-4" />
              <span className="text-xs font-medium hidden sm:inline">{selectedLanguage.name}</span>
            </button>
            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-2 hidden group-hover:block z-50 min-w-[120px]">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setSelectedLanguage(lang)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-xs transition-colors",
                    selectedLanguage.code === lang.code ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold" : "hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
                  )}
                >
                  {lang.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30 dark:bg-slate-950/30">
        <AnimatePresence>
          {voiceError && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 p-3 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 mb-4"
            >
              <AlertCircle className="w-4 h-4" />
              {voiceError}
            </motion.div>
          )}
        </AnimatePresence>
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
              msg.role === 'user' ? "bg-blue-100 dark:bg-blue-900/30" : "bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700"
            )}>
              {msg.role === 'user' ? <User className="w-5 h-5 text-blue-600 dark:text-blue-400" /> : <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
            </div>
            <div className="flex flex-col gap-1">
              <div className={cn(
                "p-4 rounded-2xl text-sm leading-relaxed relative group",
                msg.role === 'user' 
                  ? "bg-blue-600 dark:bg-blue-500 text-white rounded-tr-none" 
                  : cn(
                      "bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 rounded-tl-none",
                      msg.isIrrelevant ? "text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10 font-medium" : "text-slate-700 dark:text-slate-300"
                    )
              )}>
                <div className="markdown-body dark:prose-invert">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
                {msg.role === 'model' && (
                  <button 
                    onClick={() => speak(msg.text)}
                    className="absolute -right-10 top-0 p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100"
                    title="Read aloud"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 dark:border-slate-700">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? "Listening..." : "Ask anything about your health..."}
              className={cn(
                "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 pr-12 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white",
                isListening ? "ring-2 ring-blue-500" : ""
              )}
            />
            <button
              type="button"
              onClick={toggleListening}
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all",
                isListening ? "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 animate-pulse" : "text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400"
              )}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50 text-white p-3 rounded-xl transition-all shadow-md shadow-blue-200 dark:shadow-none"
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
