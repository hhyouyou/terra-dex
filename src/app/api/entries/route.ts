import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getStorage } from "@/lib/storage";

interface EntryRow {
  id: string;
  category: string;
  name: string;
  scientific_name: string | null;
  description: string | null;
  wiki_url: string | null;
  image_key: string;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  discovered_at: string;
  created_at: string;
}

function toCoordinate(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

// GET /api/entries?category=animal|plant|all
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const client = await getSupabaseClient();
    let query = client
      .from("entries")
      .select(
        "id, category, name, scientific_name, description, wiki_url, image_key, latitude, longitude, location_name, discovered_at, created_at"
      )
      .order("discovered_at", { ascending: false });
    if (category && category !== "all") {
      query = query.eq("category", category);
    }
    const { data, error } = await query;
    if (error) throw new Error(`查询失败: ${error.message}`);

    const storage = getStorage();
    const rows = (data ?? []) as unknown as EntryRow[];
    const entries = await Promise.all(
      rows.map(async (entry) => {
        const imageUrl = await storage.generatePresignedUrl({
          key: entry.image_key,
          expireTime: 86400,
        });
        return { ...entry, image_url: imageUrl };
      })
    );

    return NextResponse.json({ entries });
  } catch (error) {
    const message = error instanceof Error ? error.message : "查询失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/entries
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      category?: string;
      name?: string;
      scientific_name?: string;
      description?: string;
      wiki_url?: string;
      image_key?: string;
      latitude?: unknown;
      longitude?: unknown;
      location_name?: string;
    };
    const { category, name, scientific_name, description, wiki_url, image_key, location_name } =
      body;

    if (!category || !name || !image_key) {
      return NextResponse.json(
        { error: "缺少必要字段（category/name/image_key）" },
        { status: 400 }
      );
    }
    if (!["animal", "plant"].includes(category)) {
      return NextResponse.json(
        { error: "category 只能是 animal 或 plant" },
        { status: 400 }
      );
    }

    const client = await getSupabaseClient();
    const { data, error } = await client
      .from("entries")
      .insert({
        category,
        name,
        scientific_name: scientific_name || null,
        description: description || null,
        wiki_url: wiki_url || null,
        image_key,
        latitude: toCoordinate(body.latitude),
        longitude: toCoordinate(body.longitude),
        location_name: location_name || null,
      })
      .select();

    if (error) throw new Error(`创建失败: ${error.message}`);

    return NextResponse.json({ entry: (data ?? [])[0] }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
