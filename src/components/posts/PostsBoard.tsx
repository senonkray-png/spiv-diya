"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

interface PostLite {
  id: string;
  title: string;
  body: string;
  images: string[];
  status: string;
  views: number;
  likes: number;
  createdAt: string;
}

export function PostsBoard({ initial }: { initial: PostLite[] }) {
  const router = useRouter();
  const [posts, setPosts] = useState(initial);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", body: "", images: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setDraft({ title: "", body: "", images: "" });
    setEditId(null);
    setOpen(false);
    setError(null);
  }

  function startEdit(p: PostLite) {
    setEditId(p.id);
    setDraft({ title: p.title, body: p.body, images: p.images.join("\n") });
    setOpen(true);
  }

  async function save() {
    if (!draft.title.trim() || !draft.body.trim()) {
      setError("Заповніть заголовок і текст");
      return;
    }
    setBusy(true);
    setError(null);
    const payload = {
      title: draft.title.trim(),
      body: draft.body.trim(),
      images: draft.images.split(/\n+/).map((s) => s.trim()).filter(Boolean),
    };
    try {
      if (editId) {
        const res = await fetch(`/api/posts/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "Не вдалось оновити");
          return;
        }
        const data = await res.json();
        setPosts((prev) => prev.map((p) => (p.id === editId ? { ...p, ...data.post } : p)));
      } else {
        const res = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "Не вдалось створити");
          return;
        }
        const data = await res.json();
        setPosts((prev) => [
          { ...data.post, createdAt: new Date(data.post.createdAt).toISOString() },
          ...prev,
        ]);
      }
      reset();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Видалити пост?")) return;
    const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPosts((prev) => prev.filter((p) => p.id !== id));
      router.refresh();
    }
  }

  return (
    <>
      {!open && (
        <div className="mb-4">
          <Button onClick={() => setOpen(true)}>+ Новий пост</Button>
        </div>
      )}

      {open && (
        <Card padding="md" className="mb-4">
          <h2 className="font-semibold text-zinc-900 dark:text-white mb-3">
            {editId ? "Редагувати пост" : "Новий пост"}
          </h2>
          <div className="space-y-3">
            <Input
              label="Заголовок"
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="Шукаємо оптових партнерів у Києві"
            />
            <Textarea
              rows={6}
              value={draft.body}
              onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
              placeholder="Розкажіть деталі — що пропонуєте, які умови, як зв'язатись"
            />
            <Textarea
              rows={2}
              value={draft.images}
              onChange={(e) => setDraft((d) => ({ ...d, images: e.target.value }))}
              placeholder="URL зображень (по одному на рядок) — необов'язково"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={reset} disabled={busy}>
                Скасувати
              </Button>
              <Button onClick={save} loading={busy}>
                {editId ? "Зберегти" : "Опублікувати"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {posts.length === 0 && !open ? (
        <EmptyState
          title="Поки немає постів"
          description="Опублікуйте перший — він з'явиться у стрічці маркетплейсу та в підписників у кабінеті."
          action={<Button onClick={() => setOpen(true)}>+ Створити пост</Button>}
        />
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <Card key={p.id} padding="md">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-zinc-900 dark:text-white truncate">{p.title}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {new Date(p.createdAt).toLocaleString("uk-UA")} · {p.views} переглядів
                  </p>
                </div>
                {p.status === "removed" && <Badge variant="red">Знято</Badge>}
              </div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 line-clamp-3 whitespace-pre-wrap">{p.body}</p>
              {p.images.length > 0 && (
                <div className="flex gap-2 mt-3 overflow-x-auto">
                  {p.images.map((src) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={src} src={src} alt="" className="h-20 w-20 object-cover rounded-lg" />
                  ))}
                </div>
              )}
              <div className="flex gap-3 mt-3">
                <button onClick={() => startEdit(p)} className="text-xs font-medium text-blue-600 hover:underline">
                  Редагувати
                </button>
                <button onClick={() => remove(p.id)} className="text-xs font-medium text-red-500 hover:underline">
                  Видалити
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
