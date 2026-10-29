'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Camera,
  Check,
  Leaf,
  Loader2,
  MapPin,
  Navigation,
  PawPrint,
  Search,
  Upload,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AmapPicker } from '@/components/amap-picker';
import {
  createEntry,
  fetchEntries,
  identifyImage,
  uploadImage,
  type EntryCategory,
  type IdentifyResult,
} from '@/lib/api';

type ProcessStatus = 'idle' | 'uploading' | 'identifying' | 'result' | 'error';

type LocationSource = 'exif' | 'geolocation' | 'manual';

interface GeoPosition {
  lat: number;
  lng: number;
}

export default function HomePage() {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<ProcessStatus>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageKey, setImageKey] = useState<string | null>(null);
  const [identifyResult, setIdentifyResult] =
    useState<IdentifyResult | null>(null);

  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<EntryCategory>('animal');
  const [editDescription, setEditDescription] = useState('');
  const [editWikiUrl, setEditWikiUrl] = useState('');

  const [gpsPosition, setGpsPosition] = useState<GeoPosition | null>(null);
  const [locationName, setLocationName] = useState('');
  const [gpsSource, setGpsSource] = useState<LocationSource | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  // 是否已经检查过照片 EXIF（用来解释「为什么没有定位」）
  const [exifChecked, setExifChecked] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [animalCount, setAnimalCount] = useState(0);
  const [plantCount, setPlantCount] = useState(0);
  const [loadingCounts, setLoadingCounts] = useState(true);

  const loadCounts = useCallback(async () => {
    try {
      const [animals, plants] = await Promise.all([
        fetchEntries('animal'),
        fetchEntries('plant'),
      ]);
      setAnimalCount(animals.length);
      setPlantCount(plants.length);
    } catch {
      // Counts are non-critical; silently fail
    } finally {
      setLoadingCounts(false);
    }
  }, []);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const reverseGeocode = async (position: GeoPosition) => {
    try {
      const { loadAMap } = await import('@/lib/amap');
      const AMap = await loadAMap();
      const geocoder = new AMap.Geocoder();
      geocoder.getAddress([position.lng, position.lat], (status, result) => {
        if (status === 'complete' && result.regeocode?.formattedAddress) {
          setLocationName(result.regeocode.formattedAddress);
        }
      });
    } catch {
      // 地图未配置时仅显示坐标
    }
  };

  const handleUseGeolocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      toast.error('当前环境不支持定位');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void (async () => {
          const { gpsToAmap } = await import('@/lib/amap');
          const [lng, lat] = await gpsToAmap([
            pos.coords.longitude,
            pos.coords.latitude,
          ]);
          const position = { lat, lng };
          setGpsPosition(position);
          setGpsSource('geolocation');
          setLocating(false);
          void reverseGeocode(position);
        })();
      },
      () => {
        setLocating(false);
        toast.error('获取定位失败，可以在地图上手动选点');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const reset = () => {
    setStatus('idle');
    setPreviewUrl(null);
    setIdentifyResult(null);
    setImageKey(null);
    setEditName('');
    setEditCategory('animal');
    setEditDescription('');
    setEditWikiUrl('');
    setGpsPosition(null);
    setLocationName('');
    setGpsSource(null);
    setExifChecked(false);
    setSaved(false);
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input to allow re-selecting the same file
    e.target.value = '';

    const blobUrl = URL.createObjectURL(file);
    setPreviewUrl(blobUrl);
    setStatus('uploading');
    setIdentifyResult(null);
    setSaved(false);
    setImageKey(null);
    setGpsPosition(null);
    setLocationName('');
    setGpsSource(null);
    setExifChecked(false);

    // 从照片 EXIF 中读取 GPS（失败即视为无位置信息）
    try {
      const exifr = await import('exifr');
      const gpsData = await exifr.gps(file);
      if (
        gpsData &&
        Number.isFinite(gpsData.latitude) &&
        Number.isFinite(gpsData.longitude)
      ) {
        const { gpsToAmap } = await import('@/lib/amap');
        const [lng, lat] = await gpsToAmap([
          gpsData.longitude,
          gpsData.latitude,
        ]);
        const position = { lat, lng };
        setGpsPosition(position);
        setGpsSource('exif');
        void reverseGeocode(position);
      }
    } catch {
      // 没有 EXIF 或格式不支持
    } finally {
      setExifChecked(true);
    }

    try {
      const uploadRes = await uploadImage(file);
      setImageKey(uploadRes.key);

      setStatus('identifying');
      const result = await identifyImage(uploadRes.url);
      setIdentifyResult(result);
      setEditName(result.name || '');
      setEditCategory(result.category === 'plant' ? 'plant' : 'animal');
      setEditDescription(result.description || '');
      setEditWikiUrl(result.wiki_url || '');
      setStatus('result');
    } catch (error) {
      setStatus('error');
      const message = error instanceof Error ? error.message : '处理失败';
      toast.error(message);
    }
  };

  const handleSave = async () => {
    if (!imageKey || !editName.trim()) {
      toast.error('请填写名称');
      return;
    }

    try {
      setSaving(true);
      await createEntry({
        category: editCategory,
        name: editName.trim(),
        scientific_name: identifyResult?.scientific_name || undefined,
        description: editDescription.trim() || undefined,
        wiki_url: editWikiUrl.trim() || undefined,
        image_key: imageKey,
        latitude: gpsPosition?.lat,
        longitude: gpsPosition?.lng,
        location_name: locationName.trim() || undefined,
      });
      setSaving(false);
      setSaved(true);
      toast.success('已收录到图鉴！', {
        description: '继续探索，发现更多物种',
      });
      loadCounts();
    } catch (error) {
      setSaving(false);
      const message = error instanceof Error ? error.message : '保存失败';
      toast.error(message);
    }
  };

  const isProcessing = status === 'uploading' || status === 'identifying';

  const locationLabel = gpsPosition
    ? locationName ||
      `${gpsPosition.lat.toFixed(5)}, ${gpsPosition.lng.toFixed(5)}`
    : '';

  const sourceLabel =
    gpsSource === 'exif'
      ? '来自照片 GPS'
      : gpsSource === 'geolocation'
        ? '当前位置'
        : '手动选择';

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      {/* 拍照 / 上传入口 */}
      <section className="space-y-4">
        <div className="space-y-2 text-center">
          <h1 className="font-serif text-3xl font-bold">地球online图鉴</h1>
          <p className="text-muted-foreground">
            拍照识图，记录你发现的自然物种
          </p>
        </div>
        <div className="flex justify-center gap-3">
          <Button
            onClick={() => cameraInputRef.current?.click()}
            disabled={isProcessing}
            size="lg"
          >
            <Camera />
            拍照
          </Button>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            size="lg"
          >
            <Upload />
            选择图片
          </Button>
        </div>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelect}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </section>

      {/* 识别结果展示区 */}
      {status !== 'idle' && previewUrl && (
        <Card className="gap-0 overflow-hidden py-0">
          {/* 照片预览 */}
          <div className="relative aspect-video w-full overflow-hidden bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="拍摄的照片"
              className="h-full w-full object-cover"
            />
            {isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="size-8 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">
                    {status === 'uploading' ? '上传中…' : 'AI 识别中…'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {status === 'result' && identifyResult && (
            <CardContent className="space-y-4 p-6">
              {/* 置信度 */}
              <div className="flex items-center justify-between">
                <Badge variant="secondary">
                  <Search className="size-3" />
                  识别完成
                </Badge>
                <span className="text-sm text-muted-foreground">
                  置信度：{Math.round(identifyResult.confidence * 100)}%
                </span>
              </div>

              {/* 学名展示（只读） */}
              {identifyResult.scientific_name && (
                <p className="text-sm italic text-muted-foreground">
                  {identifyResult.scientific_name}
                </p>
              )}

              <div className="space-y-4">
                {/* 名称 */}
                <div className="space-y-2">
                  <Label htmlFor="edit-name">名称</Label>
                  <Input
                    id="edit-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="输入物种名称"
                  />
                </div>

                {/* 分类 */}
                <div className="space-y-2">
                  <Label>分类</Label>
                  <Select
                    value={editCategory}
                    onValueChange={(v) =>
                      setEditCategory(v as EntryCategory)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="选择分类" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="animal">动物</SelectItem>
                      <SelectItem value="plant">植物</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 描述 */}
                <div className="space-y-2">
                  <Label htmlFor="edit-description">描述</Label>
                  <Textarea
                    id="edit-description"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="描述该物种的特征…"
                    rows={3}
                  />
                </div>

                {/* 百科链接 */}
                <div className="space-y-2">
                  <Label htmlFor="edit-wiki">百科链接</Label>
                  <Input
                    id="edit-wiki"
                    value={editWikiUrl}
                    onChange={(e) => setEditWikiUrl(e.target.value)}
                    placeholder="https://…"
                  />
                </div>

                {/* 位置 */}
                <div className="space-y-2">
                  <Label>拍摄位置</Label>
                  {gpsPosition ? (
                    <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
                      <MapPin className="size-4 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{locationLabel}</p>
                        <p className="text-xs text-muted-foreground">
                          {sourceLabel}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPickerOpen(true)}
                      >
                        调整
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="清除位置"
                        onClick={() => {
                          setGpsPosition(null);
                          setLocationName('');
                          setGpsSource(null);
                        }}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      {exifChecked && (
                        <p className="text-xs text-muted-foreground">
                          这张照片里没有可用的 GPS
                          定位信息（相机直接拍摄、经微信/QQ
                          转发或编辑过的图片常会丢失定位）。可以用下面的按钮补充位置。
                        </p>
                      )}
                      <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={handleUseGeolocation}
                        disabled={locating}
                      >
                        {locating ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <Navigation />
                        )}
                        {locating ? '定位中…' : '使用当前定位'}
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setPickerOpen(true)}
                      >
                        <MapPin />
                        在地图上选点
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-2">
                {saved ? (
                  <Button asChild className="flex-1">
                    <Link href="/codex">
                      <Check />
                      查看图鉴
                    </Link>
                  </Button>
                ) : (
                  <Button
                    onClick={handleSave}
                    disabled={saving || !editName.trim()}
                    className="flex-1"
                  >
                    {saving ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Check />
                    )}
                    {saving ? '保存中…' : '收录到图鉴'}
                  </Button>
                )}
                <Button variant="outline" onClick={reset}>
                  {saved ? '再拍一张' : '重新拍照'}
                </Button>
              </div>
            </CardContent>
          )}

          {status === 'error' && (
            <CardContent className="space-y-3 p-6">
              <p className="text-sm text-muted-foreground">处理失败，请重试</p>
              <Button variant="outline" onClick={reset}>
                重新选择
              </Button>
            </CardContent>
          )}
        </Card>
      )}

      {/* 图鉴概览 */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">图鉴概览</h2>
        <div className="grid grid-cols-2 gap-4">
          <Link href="/codex">
            <Card className="cursor-pointer py-0 transition-transform hover:scale-105 hover:shadow-lg">
              <CardContent className="flex flex-col items-center gap-2 p-6">
                <PawPrint className="size-8 text-primary" />
                {loadingCounts ? (
                  <Skeleton className="h-8 w-10" />
                ) : (
                  <span className="text-2xl font-bold">{animalCount}</span>
                )}
                <span className="text-sm text-muted-foreground">动物</span>
              </CardContent>
            </Card>
          </Link>
          <Link href="/codex">
            <Card className="cursor-pointer py-0 transition-transform hover:scale-105 hover:shadow-lg">
              <CardContent className="flex flex-col items-center gap-2 p-6">
                <Leaf className="size-8 text-primary" />
                {loadingCounts ? (
                  <Skeleton className="h-8 w-10" />
                ) : (
                  <span className="text-2xl font-bold">{plantCount}</span>
                )}
                <span className="text-sm text-muted-foreground">植物</span>
              </CardContent>
            </Card>
          </Link>
        </div>
        <Link
          href="/map"
          className="flex items-center justify-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <MapPin className="size-4 text-primary" />
          在地图相册中查看足迹
        </Link>
      </section>

      {/* 手动选点 */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>选择拍摄位置</DialogTitle>
            <DialogDescription>
              点击地图上的位置，确认后会记录到图鉴
            </DialogDescription>
          </DialogHeader>
          <AmapPicker
            initial={
              gpsPosition
                ? { lat: gpsPosition.lat, lng: gpsPosition.lng }
                : null
            }
            onConfirm={(position) => {
              setGpsPosition({ lat: position.lat, lng: position.lng });
              setLocationName(position.address ?? '');
              setGpsSource('manual');
              setPickerOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </main>
  );
}
