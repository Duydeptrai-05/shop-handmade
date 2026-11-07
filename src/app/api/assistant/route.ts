import { NextResponse } from "next/server";
import { z } from "zod";
import {
  buildSystemPrompt,
  parseProductRefs,
} from "../../../../lib/shop-assistant";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(500),
      }),
    )
    .min(1)
    .max(30),
});

// Giới hạn theo IP (lưu trong bộ nhớ, khởi động lại server thì xóa)
const PER_MINUTE = 8;
const PER_DAY = 100;
const hits = new Map<string, number[]>();

function tooMany(ip: string): boolean {
  const now = Date.now();
  if (hits.size > 1000) hits.clear();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 86_400_000);
  const lastMinute = list.filter((t) => now - t < 60_000).length;
  if (lastMinute >= PER_MINUTE || list.length >= PER_DAY) {
    hits.set(ip, list);
    return true;
  }
  list.push(now);
  hits.set(ip, list);
  return false;
}

function fail(status: number, message: string) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return fail(
        503,
        "Trợ lý đang tạm nghỉ, bạn vui lòng nhắn Messenger hoặc Zalo của shop nhé.",
      );
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    if (tooMany(ip)) {
      return fail(429, "Bạn hỏi hơi nhanh rồi, đợi một chút rồi hỏi tiếp nhé.");
    }

    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return fail(400, "Dữ liệu gửi lên không hợp lệ.");
    }

    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return fail(400, "Câu hỏi không hợp lệ (mỗi tin tối đa 500 ký tự).");
    }

    // Chỉ giữ 10 tin gần nhất, và phải bắt đầu bằng tin của khách
    const msgs = parsed.data.messages.slice(-10);
    while (msgs.length > 0 && msgs[0].role !== "user") msgs.shift();
    if (msgs.length === 0 || msgs[msgs.length - 1].role !== "user") {
      return fail(400, "Câu hỏi không hợp lệ.");
    }

    const systemPrompt = await buildSystemPrompt();
    // Gemini 3.x dùng thinkingLevel; chat tư vấn chỉ cần suy nghĩ tối thiểu
    const isGemini3 = GEMINI_MODEL.startsWith("gemini-3");
    const generationConfig: Record<string, unknown> = isGemini3
      ? { maxOutputTokens: 4096, thinkingConfig: { thinkingLevel: "minimal" } }
      : { maxOutputTokens: 4096, temperature: 0.6 };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        GEMINI_MODEL,
      )}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: msgs.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
          generationConfig,
        }),
        signal: AbortSignal.timeout(20_000),
      },
    );

    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      console.error("[assistant] Gemini lỗi", res.status, detail);
      if (res.status === 429) {
        return fail(
          429,
          "Trợ lý đang quá tải, bạn thử lại sau ít phút hoặc nhắn Messenger/Zalo của shop nhé.",
        );
      }
      return fail(502, "Trợ lý đang gặp sự cố, bạn vui lòng thử lại sau.");
    }

    const data = await res.json();
    const finish = data?.candidates?.[0]?.finishReason;
    if (finish && finish !== "STOP")
      console.warn("[assistant] finishReason:", finish);
    const raw: string = (data?.candidates?.[0]?.content?.parts ?? [])
      .map((p: { text?: string }) => p.text ?? "")
      .join("")
      .trim();

    if (!raw) {
      return fail(
        502,
        "Trợ lý chưa trả lời được câu này, bạn thử hỏi theo cách khác nhé.",
      );
    }

    const { text, products } = await parseProductRefs(raw);

    return NextResponse.json({
      success: true,
      data: {
        reply: text,
        products: products.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          stock: p.stock,
          imageUrl: p.imageUrl,
        })),
      },
    });
  } catch (err) {
    console.error("[assistant] lỗi", err);
    return fail(502, "Trợ lý đang gặp sự cố, bạn vui lòng thử lại sau.");
  }
}
