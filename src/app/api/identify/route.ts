import { NextRequest, NextResponse } from "next/server";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";

const VISION_MODEL = "doubao-seed-2-0-pro-260215";

interface IdentifyResult {
  name: string;
  scientific_name: string;
  category: string;
  description: string;
  wiki_url: string;
  confidence: number;
}

const SYSTEM_PROMPT = `你是一个博物图鉴专家，擅长识别动植物。请仔细观察图片中的生物，识别并按以下JSON格式返回结果：
{
  "name": "中文名称（如：麻雀、银杏）",
  "scientific_name": "拉丁学名（如：Passer montanus，不确定则留空）",
  "category": "animal（动物）或 plant（植物）",
  "description": "一句话简短描述该物种的特征（50字以内）",
  "wiki_url": "对应的百度百科词条链接，格式为 https://baike.baidu.com/item/中文名称",
  "confidence": 0到1之间的置信度数字
}
规则：
1. 只返回JSON对象，不要返回任何其他文字或解释。
2. 如果图片中明显不是动植物或无法识别，返回 {"name":"","scientific_name":"","category":"unknown","description":"未能识别出动植物","wiki_url":"","confidence":0}。
3. wiki_url 中的中文名称需经过 URL 编码处理（用 encodeURIComponent）。
4. 如果能识别出大类但不确定具体物种，给出最可能的名称并适当降低 confidence。`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const imageUrl: string | undefined = body.imageUrl;
    if (!imageUrl) {
      return NextResponse.json({ error: "未提供图片URL" }, { status: 400 });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const messages = [
      {
        role: "user" as const,
        content: [
          { type: "text" as const, text: SYSTEM_PROMPT },
          { type: "image_url" as const, image_url: { url: imageUrl, detail: "high" as const } },
        ],
      },
    ];

    const response = await client.invoke(messages, {
      model: VISION_MODEL,
      temperature: 0.3,
    });

    // 解析 LLM 返回的 JSON
    let result: IdentifyResult;
    try {
      // 去除可能的 markdown 代码块标记
      let content = response.content.trim();
      content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
      result = JSON.parse(content);
    } catch {
      // 解析失败时返回原始内容作为描述
      result = {
        name: "",
        scientific_name: "",
        category: "unknown",
        description: response.content.slice(0, 100),
        wiki_url: "",
        confidence: 0,
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "识别失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
