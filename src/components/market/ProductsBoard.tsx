"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProductForm } from "@/components/market/ProductForm";
import { ProductCard } from "@/components/market/ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";

interface Product {
  id: string;
  title: string;
  description: string;
  priceTokens: number;
  priceUAH: number | null;
  currency: string;
  photos: string[];
  city: string | null;
  region: string | null;
  category: string | null;
  status: string;
  sourceUrl: string | null;
  owner: { id: string; companyName: string; avatarUrl: string | null; verified: boolean };
}

export function ProductsBoard({ ownerId }: { ownerId: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products?sellerId=${ownerId}&includeMine=1`);
      const data = await res.json();
      setProducts(data.products ?? []);
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (creating) {
    return (
      <Card padding="md">
        <h3 className="font-semibold text-zinc-900 dark:text-white mb-3">Новий товар</h3>
        <ProductForm
          kind="product"
          onSaved={() => {
            setCreating(false);
            load();
          }}
          onCancel={() => setCreating(false)}
        />
      </Card>
    );
  }

  if (editing) {
    return (
      <Card padding="md">
        <h3 className="font-semibold text-zinc-900 dark:text-white mb-3">Редагування</h3>
        <ProductForm
          kind="product"
          initial={{
            id: editing.id,
            title: editing.title,
            description: editing.description,
            priceUAH: editing.priceUAH != null ? String(editing.priceUAH) : "",
            priceTokens: String(editing.priceTokens),
            category: editing.category ?? "",
            city: editing.city ?? "",
            region: editing.region ?? "",
            photos: editing.photos,
            status: editing.status as "active" | "paused" | "removed",
          }}
          onSaved={() => {
            setEditing(null);
            load();
          }}
          onCancel={() => setEditing(null)}
          onDeleted={() => {
            setEditing(null);
            load();
          }}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-white">Мої товари</h3>
          <p className="text-xs text-zinc-500 mt-0.5">{products.length} оголошень</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => (window.location.href = "/dashboard/import")}>
            Імпорт із сайту
          </Button>
          <Button size="sm" onClick={() => setCreating(true)}>
            + Додати товар
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="aspect-[3/4] bg-zinc-100 dark:bg-zinc-800 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          title="Ще немає товарів"
          description="Додайте свій перший товар або імпортуйте каталог зі свого сайту."
          action={<Button onClick={() => setCreating(true)}>Додати товар</Button>}
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {products.map((p) => (
            <div key={p.id} className="relative group">
              <ProductCard product={p} href={`/marketplace/products/${p.id}`} />
              <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setEditing(p)}
                  className="bg-white dark:bg-zinc-900 text-xs font-medium px-2.5 py-1 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-700"
                >
                  Редагувати
                </button>
              </div>
              {p.sourceUrl && (
                <div className="absolute bottom-12 left-2">
                  <Badge variant="purple" size="xs">
                    Імпорт
                  </Badge>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
