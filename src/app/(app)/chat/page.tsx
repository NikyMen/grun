"use client";

/* Chat con IA: analiza todos los datos cargados y recomienda acciones */

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Trash2, RefreshCw } from "lucide-react";
import { mdToHtml } from "@/lib/fmt";

/* eslint-disable @typescript-eslint/no-explicit-any */

const SUGGESTIONS = [
  "¿Qué porcentaje de los que escriben termina comprando?",
  "¿Qué campaña me conviene escalar y cuál apagar?",
  "¿A qué hora conviene reforzar la atención por WhatsApp?",
  "¿Qué sucursal convierte mejor las conversaciones en ventas?",
  "¿Dónde estoy perdiendo plata en la pauta?",
  "Dame un plan de acción para la próxima semana",
];

type Msg = { role: "user" | "assistant"; content: string };

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/chat")
      .then((r) => r.json())
      .then((d) => setMessages(d.messages || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text?: string) {
    const message = (text ?? input).trim();
    if (!message || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: message }]);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.reply || data.error || "Error" }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "⚠️ No se pudo conectar con el servidor." }]);
    } finally {
      setLoading(false);
    }
  }

  async function clearChat() {
    if (!confirm("¿Borrar todo el historial del chat?")) return;
    await fetch("/api/chat", { method: "DELETE" });
    setMessages([]);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <header className="flex items-center justify-between pb-4">
        <div>
          <h1 className="text-2xl font-black text-grun-950 flex items-center gap-2">
            <Sparkles className="text-grun-600" size={22} /> Chat IA
          </h1>
          <p className="text-sm text-gray-500">
            Analiza pauta, conversaciones y ventas cargadas. Aprende de tu feedback con el tiempo.
          </p>
        </div>
        {messages.length > 0 && (
          <button onClick={clearChat} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 border border-gray-200 rounded-lg px-3 py-2">
            <Trash2 size={13} /> Limpiar historial
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 space-y-4">
        {messages.length === 0 && !loading && (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
            <div className="bg-lima/30 rounded-full p-4">
              <Sparkles className="text-grun-700" size={28} />
            </div>
            <p className="text-sm text-gray-500 max-w-sm">
              Preguntale lo que quieras sobre tus datos: la IA responde con cifras reales de la pauta,
              las conversaciones y las ventas cargadas.
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-w-xl">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-xs bg-grun-50 hover:bg-grun-100 text-grun-800 border border-grun-200 rounded-full px-3.5 py-2 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[75%] bg-grun-800 text-white rounded-2xl rounded-br-md px-4 py-2.5 text-sm whitespace-pre-wrap">
                {m.content}
              </div>
            </div>
          ) : (
            <div key={i} className="flex justify-start">
              <div className="max-w-[85%] bg-grun-50 border border-grun-100 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-grun-600 mb-1">
                  <Sparkles size={11} /> Analista IA
                </div>
                <div className="ai-md text-sm text-gray-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: mdToHtml(m.content) }} />
              </div>
            </div>
          )
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-grun-50 border border-grun-100 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2 text-sm text-grun-700">
              <RefreshCw size={14} className="animate-spin" /> Analizando tus datos…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="mt-3 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Preguntá sobre tu pauta, conversaciones o ventas…"
          className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-grun-500 focus:ring-2 focus:ring-grun-200"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-xl bg-grun-800 hover:bg-grun-700 disabled:opacity-50 text-lima px-5 flex items-center gap-2 text-sm font-semibold transition-colors"
        >
          <Send size={15} /> Enviar
        </button>
      </form>
    </div>
  );
}
