'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import type { Entry } from '@/lib/api';
import {
  getAmapConfig,
  loadAMap,
  type AmapMap,
  type AmapOverlay,
} from '@/lib/amap';

interface AmapMapViewProps {
  entries: Entry[];
  height?: number;
  className?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function AmapMapView({
  entries,
  height = 420,
  className,
}: AmapMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<AmapMap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const amapKey = getAmapConfig().key;

  const located = useMemo(
    () =>
      entries.filter(
        (entry) =>
          typeof entry.latitude === 'number' &&
          typeof entry.longitude === 'number'
      ),
    [entries]
  );

  const coordKey = useMemo(
    () =>
      located
        .map((entry) => `${entry.id}:${entry.latitude},${entry.longitude}`)
        .join('|'),
    [located]
  );

  useEffect(() => {
    if (!amapKey) return;

    let cancelled = false;
    let map: AmapMap | null = null;

    (async () => {
      if (!containerRef.current) return;
      try {
        const AMap = await loadAMap();
        if (cancelled || !containerRef.current) return;

        map = new AMap.Map(containerRef.current, {
          zoom: 4,
          center: [104.195397, 35.86166],
          viewMode: '2D',
        });
        mapRef.current = map;

        const overlays: AmapOverlay[] = [];
        for (const entry of located) {
          const lng = entry.longitude as number;
          const lat = entry.latitude as number;
          const marker = new AMap.Marker({
            position: [lng, lat],
            map,
            title: entry.name,
          });

          const imageHtml = entry.image_url
            ? `<img src="${entry.image_url}" alt="" style="width:160px;height:110px;object-fit:cover;border-radius:8px;display:block" />`
            : '';
          const info = new AMap.InfoWindow({
            content: `<div style="padding:8px;width:160px">${imageHtml}<p style="margin:8px 0 0;font-size:14px;font-weight:600;color:#3a3024">${escapeHtml(
              entry.name
            )}</p>${
              entry.location_name
                ? `<p style="margin:2px 0 0;font-size:12px;color:#8a7f6d">${escapeHtml(
                    entry.location_name
                  )}</p>`
                : ''
            }</div>`,
            offset: [0, -12],
          });

          marker.on('click', () => {
            if (map) {
              info.open(map, [lng, lat]);
            }
          });
          overlays.push(marker);
        }

        if (overlays.length > 0) {
          map.setFitView(overlays);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '地图加载失败');
        }
      }
    })();

    return () => {
      cancelled = true;
      // 同一个实例只销毁一次，重复 destroy 会抛错
      if (map) {
        map.destroy();
      }
      mapRef.current = null;
    };
    // 坐标变化时重建地图
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordKey, amapKey]);

  if (!amapKey) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed bg-muted/20 px-4 text-center text-sm text-muted-foreground ${
          className ?? ''
        }`}
        style={{ height }}
      >
        <MapPin className="size-6 text-muted-foreground/60" />
        <span>地图待启用</span>
        <span className="text-xs">配置高德地图 Key 后即可显示位置标记</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border bg-muted/40 px-4 text-center text-sm text-muted-foreground ${
          className ?? ''
        }`}
        style={{ height }}
      >
        {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden rounded-lg border ${className ?? ''}`}
      style={{ height }}
    />
  );
}
