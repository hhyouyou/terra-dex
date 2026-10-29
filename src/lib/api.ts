export type EntryCategory = 'animal' | 'plant';

export interface Entry {
  id: string;
  category: EntryCategory;
  name: string;
  scientific_name: string | null;
  description: string | null;
  wiki_url: string | null;
  image_key: string;
  image_url?: string;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  discovered_at: string;
  created_at: string;
  updated_at?: string;
}

export interface IdentifyResult {
  name: string;
  scientific_name: string;
  category: string;
  description: string;
  wiki_url: string;
  confidence: number;
}

export interface UploadResult {
  key: string;
  url: string;
}

interface ApiErrorBody {
  error?: unknown;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    let message = `请求失败 (${response.status})`;
    try {
      const body = (await response.json()) as ApiErrorBody;
      if (typeof body.error === 'string') {
        message = body.error;
      }
    } catch {
      // Response body is not JSON; use default message
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export async function uploadImage(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  return request<UploadResult>('/api/upload', {
    method: 'POST',
    body: formData,
  });
}

export async function identifyImage(imageUrl: string): Promise<IdentifyResult> {
  return request<IdentifyResult>('/api/identify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl }),
  });
}

export async function fetchEntries(
  category: EntryCategory | 'all',
): Promise<Entry[]> {
  const result = await request<{ entries: Entry[] }>(
    `/api/entries?category=${category}`,
  );
  return result.entries;
}

export async function createEntry(data: {
  category: EntryCategory;
  name: string;
  scientific_name?: string;
  description?: string;
  wiki_url?: string;
  image_key: string;
  latitude?: number;
  longitude?: number;
  location_name?: string;
}): Promise<Entry> {
  const result = await request<{ entry: Entry }>('/api/entries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return result.entry;
}

export async function fetchEntry(id: string): Promise<Entry> {
  const result = await request<{ entry: Entry }>(`/api/entries/${id}`);
  return result.entry;
}

export async function updateEntry(
  id: string,
  data: {
    name?: string;
    category?: EntryCategory;
    scientific_name?: string;
    description?: string;
    wiki_url?: string;
    latitude?: number | null;
    longitude?: number | null;
    location_name?: string | null;
  },
): Promise<Entry> {
  const result = await request<{ entry: Entry }>(`/api/entries/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return result.entry;
}

export async function deleteEntry(id: string): Promise<void> {
  await request<{ success: boolean }>(`/api/entries/${id}`, {
    method: 'DELETE',
  });
}
