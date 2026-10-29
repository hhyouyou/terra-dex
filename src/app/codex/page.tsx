'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Leaf, PawPrint } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { fetchEntries, type Entry } from '@/lib/api';

type TabValue = 'all' | 'animal' | 'plant';

export default function CodexPage() {
  const [tab, setTab] = useState<TabValue>('all');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchEntries(tab);
        setEntries(data);
      } catch {
        setEntries([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tab]);

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold">自然图鉴</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/">拍照识图</Link>
        </Button>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as TabValue)}
      >
        <TabsList>
          <TabsTrigger value="all">全部</TabsTrigger>
          <TabsTrigger value="animal">动物</TabsTrigger>
          <TabsTrigger value="plant">植物</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Card key={i} className="gap-0 overflow-hidden py-0">
              <Skeleton className="aspect-square w-full rounded-none" />
              <CardContent className="space-y-2 p-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg text-muted-foreground">
            还没有收录任何条目，去发现新物种吧
          </p>
          <Button asChild className="mt-4">
            <Link href="/">去拍照识图</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {entries.map((entry) => (
            <Link key={entry.id} href={`/codex/${entry.id}`}>
              <Card className="gap-0 overflow-hidden py-0 transition-transform hover:scale-105 hover:shadow-lg">
                <div className="aspect-square overflow-hidden bg-muted">
                  {entry.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={entry.image_url}
                      alt={entry.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      {entry.category === 'animal' ? (
                        <PawPrint className="size-8" />
                      ) : (
                        <Leaf className="size-8" />
                      )}
                    </div>
                  )}
                </div>
                <CardContent className="space-y-1 p-3">
                  <h3 className="truncate text-sm font-medium">
                    {entry.name}
                  </h3>
                  <p className="truncate text-xs text-muted-foreground italic">
                    {entry.scientific_name || '—'}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
