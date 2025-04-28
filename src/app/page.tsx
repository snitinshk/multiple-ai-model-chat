"use client";
import { useState, useRef, useEffect } from "react";

const MODELS = [
  { label: "ChatGPT (OpenAI)", value: "openai" },
  { label: "Gemini (Google)", value: "gemini" },
  { label: "DeepSeek", value: "deepseek" },
];

export default function Home() {
  const [model, setModel] = useState("openai");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", content: input };
    setMessages((msgs) => [...msgs, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: [...messages, userMsg] }),
      });
      const data = await res.json();
      setMessages((msgs) => [...msgs, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setMessages((msgs) => [...msgs, { role: "assistant", content: "Error: Failed to get response." }]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-lg shadow p-6 mt-10">
        <h1 className="text-2xl font-bold mb-4 text-center">Multi-AI Chat</h1>
        <div className="mb-4 flex gap-2 items-center">
          <label htmlFor="model" className="font-medium">Model:</label>
          <select
            id="model"
            className="border rounded px-2 py-1 dark:bg-gray-700 dark:text-white"
            value={model}
            onChange={e => setModel(e.target.value)}
          >
            {MODELS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div className="h-80 overflow-y-auto bg-gray-100 dark:bg-gray-700 rounded p-3 mb-4 flex flex-col gap-2">
          {messages.length === 0 && <div className="text-gray-400 text-center">Start the conversation!</div>}
          {messages.map((msg, i) => (
            <div key={i} className={msg.role === "user" ? "text-right" : "text-left"}>
              <span className={msg.role === "user" ? "bg-blue-500 text-white" : "bg-gray-300 dark:bg-gray-600 text-black dark:text-white"} style={{ borderRadius: 8, padding: "6px 12px", display: "inline-block", maxWidth: "80%" }}>
                <b>{msg.role === "user" ? "You" : "AI"}:</b> {msg.content}
              </span>
            </div>
          ))}
          {loading && (
            <div className="text-left">
              <span className="bg-gray-300 dark:bg-gray-600 text-black dark:text-white" style={{ borderRadius: 8, padding: "6px 12px", display: "inline-block", maxWidth: "80%" }}>
                <b>AI:</b> <span className="inline-flex items-center gap-1">
                  <span className="animate-pulse">Thinking</span>
                  <span className="flex gap-1">
                    <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
                  </span>
                </span>
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 border rounded px-3 py-2 dark:bg-gray-700 dark:text-white"
            type="text"
            placeholder="Type your message..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") sendMessage(); }}
            disabled={loading}
          />
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50 flex items-center gap-2"
            onClick={sendMessage}
            disabled={loading || !input.trim()}
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              "Send"
            )}
          </button>
        </div>
      </div>
      <footer className="mt-8 text-gray-400 text-xs text-center">OpenAI, Gemini, and DeepSeek integration demo. No API keys required for DeepSeek.</footer>
    </div>
  );
}
