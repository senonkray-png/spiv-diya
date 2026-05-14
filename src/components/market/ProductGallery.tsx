"use client";

import { useState } from "react";

export function ProductGallery({ photos, alt }: { photos: string[]; alt: string }) {
  const [idx, setIdx] = useState(0);
  const main = photos[idx] ?? photos[0];

  if (!main) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-2xl bg-muted text-sm text-muted-foreground">
        Без фото
      </div>
    );
  }

  return (
    <div>
      <div className="aspect-square overflow-hidden rounded-2xl bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={main} alt={alt} className="size-full object-cover" />
      </div>
      {photos.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {photos.map((u, i) => (
            <button
              key={u + i}
              type="button"
              onClick={() => setIdx(i)}
              className={`relative shrink-0 overflow-hidden rounded-lg ring-2 ring-offset-2 ring-offset-background transition-shadow ${
                i === idx ? "ring-primary" : "ring-transparent opacity-80 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" className="size-16 object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
