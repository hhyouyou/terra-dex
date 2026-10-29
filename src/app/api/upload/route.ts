import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "未提供图片文件" }, { status: 400 });
    }

    // 限制文件类型和大小（10MB）
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "仅支持 JPG/PNG/WebP/GIF 格式" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "图片大小不能超过 10MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const storage = getStorage();
    const key = await storage.uploadFile({
      fileContent: buffer,
      fileName: `photos/${Date.now()}_${file.name}`,
      contentType: file.type || "image/jpeg",
    });

    const url = await storage.generatePresignedUrl({
      key,
      expireTime: 86400,
    });

    return NextResponse.json({ key, url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "图片上传失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
