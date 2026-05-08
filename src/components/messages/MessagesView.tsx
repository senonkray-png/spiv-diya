"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";

interface Peer {
  id: string;
  companyName: string;
  avatarUrl: string | null;
  businessNiche: string | null;
  verified: boolean;
}

interface Conversation {
  peerId: string;
  peer: Peer | null;
  lastMessage: { content: string; createdAt: string; senderId: string; read: boolean };
  unread: number;
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  read: boolean;
}

export function MessagesView({
  myId,
  initialPeerId,
  initialContext,
}: {
  myId: string;
  initialPeerId?: string;
  initialContext?: { type: string | null; id: string | null };
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activePeer, setActivePeer] = useState<string | null>(initialPeerId ?? null);
  const [activePeerInfo, setActivePeerInfo] = useState<Peer | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    const res = await fetch("/api/messages");
    if (!res.ok) return;
    const data = await res.json();
    setConversations(data.conversations ?? []);
    setLoading(false);
  }, []);

  const loadThread = useCallback(async (peerId: string) => {
    const res = await fetch(`/api/messages?with=${peerId}`);
    if (!res.ok) return;
    const data = await res.json();
    setMessages(data.messages ?? []);
    setActivePeerInfo(data.peer ?? null);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadConversations();
    const t = setInterval(loadConversations, 15000);
    return () => clearInterval(t);
  }, [loadConversations]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (activePeer) loadThread(activePeer);
  }, [activePeer, loadThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim() || !activePeer) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: activePeer,
          content: input.trim(),
          contextType: initialContext?.type ?? undefined,
          contextId: initialContext?.id ?? undefined,
        }),
      });
      if (res.ok) {
        setInput("");
        await loadThread(activePeer);
        loadConversations();
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid md:grid-cols-[320px_1fr] gap-3 h-[calc(100dvh-180px)] md:h-[calc(100dvh-160px)]">
      {/* Conversations list */}
      <aside
        className={`md:block ${
          activePeer ? "hidden" : ""
        } bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col`}
      >
        <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-900 dark:text-white text-sm">Чати</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-sm text-zinc-400">Завантаження...</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-sm text-zinc-400">
              Поки немає повідомлень. Знайдіть партнера у каталозі та напишіть йому.
            </div>
          ) : (
            conversations.map((c) => {
              const active = activePeer === c.peerId;
              const last = c.lastMessage;
              const isMine = last.senderId === myId;
              return (
                <button
                  key={c.peerId}
                  onClick={() => setActivePeer(c.peerId)}
                  className={`w-full flex items-start gap-3 px-3 py-3 border-b border-zinc-100 dark:border-zinc-900 text-left transition-colors ${
                    active
                      ? "bg-blue-50 dark:bg-blue-950/30"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
                  }`}
                >
                  <Avatar src={c.peer?.avatarUrl} name={c.peer?.companyName} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm text-zinc-900 dark:text-white truncate">
                        {c.peer?.companyName ?? "Користувач"}
                      </span>
                      <span className="text-[10px] text-zinc-400 shrink-0">
                        {new Date(last.createdAt).toLocaleDateString("uk-UA", {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 truncate">
                      {isMine ? "Ви: " : ""}
                      {last.content}
                    </p>
                  </div>
                  {c.unread > 0 && <Badge variant="blue" size="xs">{c.unread}</Badge>}
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Thread */}
      <section
        className={`md:block ${
          !activePeer ? "hidden" : ""
        } bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden`}
      >
        {!activePeer ? (
          <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm p-6">
            Виберіть чат зі списку
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
              <button
                onClick={() => setActivePeer(null)}
                className="md:hidden text-zinc-500 -ml-1 px-2"
                aria-label="Назад"
              >
                ←
              </button>
              <Avatar src={activePeerInfo?.avatarUrl} name={activePeerInfo?.companyName} size="md" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-zinc-900 dark:text-white truncate">
                  {activePeerInfo?.companyName ?? "Користувач"}
                </p>
                <p className="text-xs text-zinc-500 truncate">
                  {activePeerInfo?.businessNiche || ""}
                </p>
              </div>
              <a
                href={activePeerInfo ? `/u/${activePeerInfo.id}` : "#"}
                className="text-xs text-blue-600 hover:underline"
              >
                Профіль
              </a>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-zinc-50/50 dark:bg-zinc-950/30">
              {messages.length === 0 && (
                <p className="text-center text-sm text-zinc-400 mt-8">
                  Почніть розмову — напишіть перше повідомлення.
                </p>
              )}
              {messages.map((m) => {
                const mine = m.senderId === myId;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                        mine
                          ? "bg-blue-600 text-white rounded-br-sm"
                          : "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-bl-sm"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.content}</p>
                      <p className={`text-[10px] mt-1 ${mine ? "text-blue-100" : "text-zinc-400"}`}>
                        {new Date(m.createdAt).toLocaleTimeString("uk-UA", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
            <form
              onSubmit={send}
              className="px-3 py-2 border-t border-zinc-100 dark:border-zinc-800 flex gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Введіть повідомлення..."
                disabled={sending}
                className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50"
              >
                Надіслати
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
