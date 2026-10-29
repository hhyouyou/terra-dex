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
  discovered_at: string;
  created_at: string;
  updated_at: string;
}

// GET /api/entries/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from("entries")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(`查询失败: ${error.message}`);
    if (!data) return NextResponse.json({ error: "未找到该图鉴条目" }, { status: 404 });

    const storage = getStorage();
    const entry = data as unknown as EntryRow;
    const imageUrl = await storage.generatePresignedUrl({
      key: entry.image_key,
      expireTime: 86400,
    });

    return NextResponse.json({ entry: { ...entry, image_url: imageUrl } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "查询失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/entries/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updates: Record<string, string | number | null> = {};
    for (const key of [
      "category",
      "name",
      "scientific_name",
      "description",
      "wiki_url",
      "location_name",
    ]) {
      if (body[key] !== undefined) {
        updates[key] = body[key] || null;
      }
    }
    for (const key of ["latitude", "longitude"]) {
      if (body[key] !== undefined) {
        if (body[key] === null || body[key] === "") {
          updates[key] = null;
        } else {
          const num = Number(body[key]);
          updates[key] = Number.isFinite(num) ? num : null;
        }
      }
    }
    updates.updated_at = new Date().toISOString();

    if (updates.category && !["animal", "plant"].includes(String(updates.category))) {
      return NextResponse.json({ error: "category 只能是 animal 或 plant" }, { status: 400 });
    }

    const client = await getSupabaseClient();
    const { data, error } = await client
      .from("entries")
      .update(updates)
      .eq("id", id)
      .select();

    if (error) throw new Error(`更新失败: ${error.message}`);
    if (!data || data.length === 0) {
      return NextResponse.json({ error: "未找到该图鉴条目" }, { status: 404 });
    }

    return NextResponse.json({ entry: data[0] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/entries/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await getSupabaseClient();

    // 先查出 image_key，删除记录后清理存储文件
    const { data: existing, error: queryErr } = await client
      .from("entries")
      .select("image_key")
      .eq("id", id)
      .maybeSingle();
    if (queryErr) throw new Error(`查询失败: ${queryErr.message}`);
    if (!existing) return NextResponse.json({ error: "未找到该图鉴条目" }, { status: 404 });

    const { error: delErr } = await client.from("entries").delete().eq("id", id);
    if (delErr) throw new Error(`删除失败: ${delErr.message}`);

    // 尽力清理对象存储中的图片
    try {
      const storage = getStorage();
      await storage.deleteFile({ fileKey: (existing as { image_key: string }).image_key });
    } catch {
      // 图片删除失败不阻塞记录删除
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "删除失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
