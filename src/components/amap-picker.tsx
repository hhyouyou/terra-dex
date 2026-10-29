'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getAmapConfig,
  loadAMap,
  type AmapGeocoder,
  type AmapLngLat,
  type AmapMap,
  type AmapOverlay,
} from '@/lib/amap';

interface AmapPickerProps {
  initial?: { lat: number; lng: number } | null;
  onConfirm: (position: {
    lat: number;
    lng: number;
    address?: string;
  }) => void;
}

export function AmapPicker({ initial, onConfirm }: AmapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<AmapMap | null>(null);
  const markerRef = useRef<AmapOverlay | null>(null);
  const geocoderRef = useRef<AmapGeocoder | null>(null);

  const [position, setPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(initial ?? null);
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const amapKey = getAmapConfig().key;
  const initialLat = initial?.lat ?? null;
  const initialLng = initial?.lng ?? null;

  useEffect(() => {
    if (!amapKey) return;

    let cancelled = false;
    let map: AmapMap | null = null;

    (async () => {
      if (!containerRef.current) return;
      try {
        const AMap = await loadAMap();
        if (cancelled || !containerRef.current) return;
        geocoderRef.current = new AMap.Geocoder();

        const center: [number, number] =
          initialLat !== null && initialLng !== null
            ? [initialLng, initialLat]
            : [116.397428, 39.90923];

        map = new AMap.Map(containerRef.current, {
          zoom: initialLat !== null ? 14 : 5,
          center,
          viewMode: '2D',
        });
        mapRef.current = map;

        const placeMarker = (lng: number, lat: number) => {
          if (!map) return;
          if (markerRef.current) {
            markerRef.current.setMap(null);
          }
          const marker = new AMap.Marker({ position: [lng, lat], map });
          markerRef.current = marker;
          setPosition({ lat, lng });
          geocoderRef.current?.getAddress([lng, lat], (status, result) => {
            if (status === 'complete' && result.regeocode?.formattedAddress) {
              setAddress(result.regeocode.formattedAddress);
            }
          });
        };

        if (initialLat !== null && initialLng !== null) {
          placeMarker(initialLng, initialLat);
        }

        map.on('click', (event: { lnglat: AmapLngLat }) => {
          placeMarker(event.lnglat.lng, event.lnglat.lat);
        });

        setReady(true);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '地图加载失败');
        }
      }
    })();

    return () => {
      cancelled = true;
      mapRef.current?.destroy();
      mapRef.current = null;
      if (map) map.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLat, initialLng, amapKey]);

  if (!amapKey) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-1 rounded-lg border border-dashed bg-muted/20 px-4 text-center text-sm text-muted-foreground">
        <MapPin className="size-6 text-muted-foreground/60" />
        <span>地图待启用</span>
        <span className="text-xs">配置高德地图 Key 后即可手动选点</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border bg-muted/40 px-4 text-center text-sm text-muted-foreground">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <div
          ref={containerRef}
          className="h-64 w-full overflow-hidden rounded-lg border"
        />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        )}
      </div>
      <p className="flex items-center gap-1 text-sm text-muted-foreground">
        <MapPin className="size-4" />
        {position
          ? address ||
            `已选：${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`
          : '点击地图选择位置'}
      </p>
      <Button
        className="w-full"
        disabled={!position}
        onClick={() => {
          if (position) {
            onConfirm({ ...position, address: address || undefined });
          }
        }}
      >
        确认位置
      </Button>
    </div>
  );
}
