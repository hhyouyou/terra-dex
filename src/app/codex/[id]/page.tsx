import { notFound } from 'next/navigation';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getStorage } from '@/lib/storage';
import Link from 'next/link';
import {
  ArrowLeft,
  ExternalLink,
  Leaf,
  MapPin,
  Navigation,
  PawPrint,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AmapMapView } from '@/components/amap-map';
import { DeleteButton } from './delete-button';
import type { Entry } from '@/lib/api';

async function getEntry(id: string): Promise<Entry> {
  const client = await getSupabaseClient();
  const { data, error } = await client
    .from('entries')
    .select(
      'id, category, name, scientific_name, description, wiki_url, image_key, latitude, longitude, location_name, discovered_at, created_at'
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(`获取图鉴条目失败: ${error.message}`);
  }
  if (!data) {
    notFound();
  }

  const storage = getStorage();
  const imageUrl = await storage.generatePresignedUrl({
    key: data.image_key,
    expireTime: 86400,
  });

  return { ...data, image_url: imageUrl } as Entry;
}

export default async function EntryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entry = await getEntry(id);

  const discoveredDate = new Date(entry.discovered_at);
  const isValidDate = !Number.isNaN(discoveredDate.getTime());
  const dateStr = isValidDate
    ? new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(discoveredDate)
    : entry.discovered_at;

  const isAnimal = entry.category === 'animal';
  const hasLocation =
    typeof entry.latitude === 'number' && typeof entry.longitude === 'number';
  const locationLabel = hasLocation
    ? entry.location_name ||
      `${entry.latitude?.toFixed(5)}, ${entry.longitude?.toFixed(5)}`
    : '';
  const navUrl = hasLocation
    ? `https://uri.amap.com/marker?position=${entry.longitude},${
        entry.latitude
      }&name=${encodeURIComponent(entry.name)}&src=earth-tujian&coordinate=gaode&callnative=1`
    : '';

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-8">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/codex">
          <ArrowLeft />
          返回图鉴
        </Link>
      </Button>

      <Card className="gap-0 overflow-hidden py-0">
        {/* 大图 */}
        <div className="aspect-video w-full overflow-hidden bg-muted">
          {entry.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={entry.image_url}
              alt={entry.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              {isAnimal ? (
                <PawPrint className="size-12" />
              ) : (
                <Leaf className="size-12" />
              )}
            </div>
          )}
        </div>

        <CardHeader className="gap-3 p-6">
          <div className="flex items-center gap-3">
            <Badge variant={isAnimal ? 'default' : 'secondary'}>
              {isAnimal ? (
                <PawPrint className="size-3" />
              ) : (
                <Leaf className="size-3" />
              )}
              {isAnimal ? '动物' : '植物'}
            </Badge>
            <CardTitle className="text-2xl">{entry.name}</CardTitle>
          </div>
          {entry.scientific_name && (
            <CardDescription className="text-base italic">
              {entry.scientific_name}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-4 p-6 pt-0">
          {entry.description && (
            <p className="text-sm leading-6">{entry.description}</p>
          )}

          {hasLocation && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="text-muted-foreground">{locationLabel}</span>
                </div>
                <AmapMapView entries={[entry]} height={240} />
                <Button variant="outline" size="sm" asChild>
                  <a href={navUrl} target="_blank" rel="noopener noreferrer">
                    <Navigation />
                    在地图中导航
                  </a>
                </Button>
              </div>
            </>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              发现时间：{dateStr}
            </span>
            {entry.wiki_url && (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={entry.wiki_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink />
                  查看百科词条
                </a>
              </Button>
            )}
          </div>

          <Separator />

          <div className="flex justify-end">
            <DeleteButton id={entry.id} name={entry.name} />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
