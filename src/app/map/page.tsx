'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, MapPin } from 'lucide-react';
import { fetchEntries, type Entry } from '@/lib/api';
import { AmapMapView } from '@/components/amap-map';

export default function MapPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEntries('all')
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  const located = useMemo(
    () =>
      entries.filter(
        (entry) => entry.latitude !== null && entry.longitude !== null
      ),
    [entries]
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold">地图相册</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? '加载中…' : `${located.length} 个物种留下了足迹`}
          </p>
        </div>
        <Link href="/codex" className="text-sm text-primary hover:underline">
          查看图鉴列表 →
        </Link>
      </div>

      {loading ? (
        <div className="flex h-[520px] items-center justify-center rounded-lg border bg-muted/40">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <AmapMapView entries={located} height={520} />

          {located.length === 0 ? (
            <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/20 px-6 py-8 text-center">
              <MapPin className="size-8 text-muted-foreground/60" />
              <p className="max-w-md text-sm text-muted-foreground">
                还没有带位置的照片。上传照片时会自动读取照片里的 GPS
                信息，没有 GPS 也可以在地图上手动选点。
              </p>
              <Link href="/" className="text-sm text-primary hover:underline">
                去记录第一张 →
              </Link>
            </div>
          ) : (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {located.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/codex/${entry.id}`}
                  className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/40"
                >
                  {entry.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={entry.image_url}
                      alt={entry.name}
                      className="size-14 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-md bg-muted">
                      <MapPin className="size-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium">{entry.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {entry.location_name ||
                        `${entry.latitude?.toFixed(4)}, ${entry.longitude?.toFixed(4)}`}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
