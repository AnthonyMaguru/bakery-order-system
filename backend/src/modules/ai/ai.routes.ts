import fs from "node:fs";
import path from "node:path";
import { Router, type Request } from "express";
import { z } from "zod";
import { env } from "../../config/env.js";
import { HttpError } from "../../lib/http-error.js";
import { prisma } from "../../lib/prisma.js";
import { optionalAuth } from "../../middleware/auth.js";

export const aiRouter = Router();

const GenerateCakeSchema = z.object({
  prompt: z
    .string({ error: "Please describe the cake you would like to design" })
    .trim()
    .min(2, "Please describe the cake you would like to design"),
  occasion: z.string().trim().optional(),
  flavour: z.string().trim().optional(),
  colours: z.string().trim().optional(),
  theme: z.string().trim().optional(),
  sampleIndex: z.number().int().optional(),
});

function getUploadUrl(req: Request, id: string): string {
  let host = req.get("host") || "localhost:4000";
  if (host.includes("10.0.2.2")) {
    host = `localhost:${process.env.PORT || 4000}`;
  }
  const base = env.PUBLIC_API_URL ?? `${req.protocol}://${host}/api`;
  return `${base.replace(/\/$/, "")}/uploads/${id}`;
}

// POST /api/ai/generate-cake
// Generates or visualizes an artisanal custom cake using OpenAI DALL-E 3,
// stores the image permanently in the database Upload table, and returns a persistent URL.
aiRouter.post("/generate-cake", optionalAuth, async (req, res) => {
  const parseResult = GenerateCakeSchema.safeParse(req.body);
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]?.message ?? "Invalid request body";
    throw new HttpError(400, issue);
  }

  const { prompt, occasion, flavour, colours, theme, sampleIndex } = parseResult.data;

  // Build a rich culinary photography prompt for high-end artisanal cake generation
  const enhancedPrompt = [
    "Professional artisanal bakery food photography of an exquisite bespoke cake",
    occasion ? `celebrating ${occasion}` : null,
    flavour ? `with ${flavour} flavor profile and complementary toppings` : null,
    colours ? `color palette of ${colours}` : null,
    theme ? `themed around ${theme}` : null,
    `custom design details: ${prompt}`,
    "Presentation on an elegant ceramic pedestal in a sunlit artisanal bakery, shallow depth of field, handcrafted sugarcraft, fresh organic garnishes, delicate texture details, appetizing, luxury pastry chef award-winning creation, photorealistic, 8k resolution",
  ]
    .filter(Boolean)
    .join(". ");

  let imageBuffer: Buffer | null = null;
  let isDemo = false;
  let responseMessage = "Cake visual generated successfully with OpenAI DALL-E 3";
  let contentType = "image/png";

  const geminiApiKey = (env.GEMINI_API_KEY ?? env.AI_STUDIO_API_KEY)?.trim();
  const openAiApiKey = env.OPENAI_API_KEY?.trim();

  // 1. Try Google AI Studio (Imagen 3) first if key is present
  if (geminiApiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instances: [{ prompt: enhancedPrompt }],
            parameters: {
              sampleCount: 1,
              aspectRatio: "1:1",
              outputMimeType: "image/jpeg",
            },
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[Google AI Studio] Imagen 3 request failed (${response.status}): ${errText}`);
      } else {
        const result = (await response.json()) as {
          predictions?: Array<{ bytesBase64Encoded?: string; mimeType?: string }>;
        };
        const b64 = result.predictions?.[0]?.bytesBase64Encoded;
        if (b64) {
          imageBuffer = Buffer.from(b64, "base64");
          contentType = result.predictions?.[0]?.mimeType ?? "image/jpeg";
          responseMessage = "Cake visual generated successfully with Google AI Studio (Imagen 3)";
        }
      }
    } catch (err: any) {
      console.error("[Google AI Studio] Network or API error:", err.message);
    }
  }

  // 2. Try OpenAI DALL-E 3 if Google AI Studio was not used or did not produce an image
  if (!imageBuffer && openAiApiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiApiKey}`,
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: enhancedPrompt,
          n: 1,
          size: "1024x1024",
          response_format: "b64_json",
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[OpenAI] DALL-E 3 request failed (${response.status}): ${errText}`);
      } else {
        const result = (await response.json()) as {
          data?: Array<{ b64_json?: string; url?: string }>;
        };
        const b64 = result.data?.[0]?.b64_json;
        if (b64) {
          imageBuffer = Buffer.from(b64, "base64");
          contentType = "image/png";
          responseMessage = "Cake visual generated successfully with OpenAI DALL-E 3";
        } else if (result.data?.[0]?.url) {
          const imgRes = await fetch(result.data[0].url);
          const arrayBuf = await imgRes.arrayBuffer();
          imageBuffer = Buffer.from(arrayBuf);
          contentType = imgRes.headers.get("content-type") ?? "image/png";
          responseMessage = "Cake visual generated successfully with OpenAI DALL-E 3";
        }
      }
    } catch (err: any) {
      console.error("[OpenAI] Network or API error:", err.message);
    }
  }

  if (!imageBuffer) {
    isDemo = true;
    responseMessage =
      geminiApiKey || openAiApiKey
        ? "AI provider returned no image. Served curated artisanal visualizer sample."
        : "Google AI Studio / OpenAI key not configured in backend/.env. Using curated artisanal demo visualizer.";
  }

  // Fallback to curated demo samples if OpenAI was disabled or failed
  if (!imageBuffer) {
    isDemo = true;
    const samplesDir = path.resolve(process.cwd(), "assets", "ai-samples");
    const sampleFiles = ["cake-demo-1.jpg", "cake-demo-2.jpg"];

    // Choose sample based on requested index or keyword matching
    let chosenSample = sampleFiles[0];
    if (typeof sampleIndex === "number" && sampleIndex >= 0) {
      chosenSample = sampleFiles[sampleIndex % sampleFiles.length];
    } else if (
      prompt.toLowerCase().includes("chocolate") ||
      prompt.toLowerCase().includes("drip") ||
      prompt.toLowerCase().includes("dark") ||
      flavour?.toLowerCase().includes("chocolate")
    ) {
      chosenSample = sampleFiles[1];
    }

    const samplePath = path.join(samplesDir, chosenSample);
    if (fs.existsSync(samplePath)) {
      imageBuffer = await fs.promises.readFile(samplePath);
      contentType = "image/jpeg";
    } else {
      // Fallback to mobile assets if ai-samples directory is somehow missing
      const altPath = path.resolve(process.cwd(), "..", "mobile", "assets", "images", "chocolate_fudge.jpg");
      if (fs.existsSync(altPath)) {
        imageBuffer = await fs.promises.readFile(altPath);
        contentType = "image/jpeg";
      } else {
        throw new HttpError(500, "Could not load cake demo asset");
      }
    }
  }

  // Determine owner for upload persistence
  let ownerId = req.user?.id;
  if (!ownerId) {
    const systemUser = await prisma.user.upsert({
      where: { firebaseUid: "system:ai-studio" },
      update: {},
      create: {
        firebaseUid: "system:ai-studio",
        name: "AI Cake Studio",
        role: "CUSTOMER",
      },
      select: { id: true },
    });
    ownerId = systemUser.id;
  }

  // Persist generated image permanently in the Upload table
  const upload = await prisma.upload.create({
    data: {
      ownerId,
      contentType,
      size: imageBuffer.length,
      data: new Uint8Array(imageBuffer),
    },
    select: { id: true },
  });

  const fullUrl = getUploadUrl(req, upload.id);

  res.status(201).json({
    id: upload.id,
    url: fullUrl,
    prompt: enhancedPrompt,
    userPrompt: prompt,
    isDemo,
    message: responseMessage,
  });
});
