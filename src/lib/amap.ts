export interface AmapLngLat {
  lng: number;
  lat: number;
}

export interface AmapOverlay {
  setMap: (map: AmapMap | null) => void;
  on: (event: string, handler: () => void) => void;
}

export interface AmapMap {
  add: (overlay: AmapOverlay) => void;
  remove: (overlay: AmapOverlay) => void;
  setFitView: (overlays?: AmapOverlay[]) => void;
  setCenter: (position: [number, number]) => void;
  on: (
    event: string,
    handler: (event: { lnglat: AmapLngLat }) => void
  ) => void;
  destroy: () => void;
}

export interface AmapInfoWindow {
  open: (map: AmapMap, position: [number, number]) => void;
  close: () => void;
}

export interface AmapGeocoder {
  getAddress: (
    position: [number, number],
    callback: (
      status: string,
      result: { regeocode?: { formattedAddress?: string } }
    ) => void
  ) => void;
}

export interface AmapNamespace {
  Map: new (
    container: HTMLElement,
    options: { zoom?: number; center?: [number, number]; viewMode?: string }
  ) => AmapMap;
  Marker: new (options: {
    position: [number, number];
    map?: AmapMap;
    title?: string;
  }) => AmapOverlay;
  InfoWindow: new (options: {
    content?: string;
    offset?: [number, number];
  }) => AmapInfoWindow;
  Geocoder: new (options?: { city?: string }) => AmapGeocoder;
  convertFrom: (
    position: [number, number],
    type: string,
    callback: (
      status: string,
      result: { locations?: AmapLngLat[] }
    ) => void
  ) => void;
}

declare global {
  interface Window {
    AMap?: AmapNamespace;
    _AMapSecurityConfig?: { securityJsCode?: string };
  }
}

let loadPromise: Promise<AmapNamespace> | null = null;

/**
 * 部署包不包含 .env，构建时读不到环境变量，这里保留一份兜底配置。
 * NEXT_PUBLIC_ 变量本身就会下发到浏览器，不属于机密。
 */
const AMAP_KEY_FALLBACK = 'ecf6da2157702c69268190adb3a227b8';
const AMAP_SECURITY_FALLBACK = 'c8eae289d7a448362b3eb1c5c9c253c0';

export function getAmapConfig(): { key: string; securityCode: string } {
  return {
    key: process.env.NEXT_PUBLIC_AMAP_KEY || AMAP_KEY_FALLBACK,
    securityCode:
      process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE || AMAP_SECURITY_FALLBACK,
  };
}

export function loadAMap(): Promise<AmapNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("高德地图只能在浏览器中加载"));
  }
  if (window.AMap) {
    return Promise.resolve(window.AMap);
  }
  if (loadPromise) {
    return loadPromise;
  }

  const { key, securityCode } = getAmapConfig();
  if (!key) {
    return Promise.reject(
      new Error("未配置高德地图 Key，请先配置 NEXT_PUBLIC_AMAP_KEY")
    );
  }

  if (securityCode) {
    window._AMapSecurityConfig = { securityJsCode: securityCode };
  }

  loadPromise = new Promise<AmapNamespace>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(
      key
    )}&plugin=AMap.Geocoder,AMap.Scale`;
    script.async = true;
    script.onload = () => {
      if (window.AMap) {
        resolve(window.AMap);
      } else {
        loadPromise = null;
        reject(new Error("高德地图加载失败"));
      }
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("高德地图加载失败"));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * 把 GPS（WGS-84）坐标转换为高德（GCJ-02）坐标。
 * 转换失败时原样返回，保证主流程不中断。
 */
export async function gpsToAmap(
  position: [number, number]
): Promise<[number, number]> {
  try {
    const AMap = await loadAMap();
    return await new Promise<[number, number]>((resolve) => {
      AMap.convertFrom(position, "gps", (status, result) => {
        const location = result.locations?.[0];
        if (status === "complete" && location) {
          resolve([location.lng, location.lat]);
        } else {
          resolve(position);
        }
      });
    });
  } catch {
    return position;
  }
}
