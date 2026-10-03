import { GoogleGenAI } from "@google/genai";

import { AIProvider } from "../ai.provider.js";
import { productIdentificationSchema } from "../ai.schemas.js";

const MODEL = process.env.GEMINI_AI_MODEL || "gemini-2.5-flash-lite";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not configured.");
}

const client = new GoogleGenAI({
  apiKey,
});

const PRODUCT_IDENTIFICATION_PROMPT = `
You are Keplex's ecommerce product identification engine.

Identify the product shown in the supplied image and/or described by
the customer.

Your output will be used to search an ecommerce catalog and potentially
create a sourcing request.

Rules:

1. Identify only information reasonably supported by the evidence.
2. Never invent an exact model number.
3. If the brand is uncertain, return null.
4. If the model is uncertain, return null.
5. productType should describe the actual product.
6. category should describe the likely ecommerce category.
7. attributes should contain useful observable or explicitly stated
   product properties.
8. searchTerms should contain useful ecommerce search phrases.
9. confidence must be between 0 and 1.
10. confidence represents confidence in the identification, NOT whether
    the product exists in the Keplex catalog.
11. Do not claim that a product exists in Keplex.
12. Return JSON only.

Required structure:

{
  "productType": string | null,
  "brand": string | null,
  "possibleModel": string | null,
  "category": string | null,
  "attributes": object,
  "searchTerms": string[],
  "confidence": number
}
`.trim();

const downloadImage = async (url) => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Unable to download image for AI analysis: ${url}`);
  }

  const mimeType = response.headers.get("content-type") || "image/jpeg";

  if (!mimeType.startsWith("image/")) {
    throw new Error(`Cloudinary URL did not return an image: ${url}`);
  }

  const arrayBuffer = await response.arrayBuffer();

  return {
    mimeType,
    base64: Buffer.from(arrayBuffer).toString("base64"),
  };
};

class GeminiProvider extends AIProvider {
  async identifyProduct({ text = "", imageUrls = [] } = {}) {
    const normalizedText = text?.trim() || "";

    const normalizedImages = imageUrls.filter(
      (url) => typeof url === "string" && url.trim().length > 0,
    );

    if (!normalizedText && normalizedImages.length === 0) {
      throw new Error(
        "AI product identification requires text or at least one image.",
      );
    }

    const contents = [];

    if (normalizedText) {
      contents.push({
        text: `
Customer description:

${normalizedText}
        `.trim(),
      });
    }

    for (const imageUrl of normalizedImages) {
      const image = await downloadImage(imageUrl);

      contents.push({
        inlineData: {
          mimeType: image.mimeType,
          data: image.base64,
        },
      });
    }

    contents.push({
      text: PRODUCT_IDENTIFICATION_PROMPT,
    });

    const response = await client.models.generateContent({
      model: MODEL,
      contents,
      config: {
        responseMimeType: "application/json",
      },
    });

    const rawText = response.text?.trim();

    if (!rawText) {
      throw new Error(
        "Gemini returned an empty product identification response.",
      );
    }

    let parsed;

    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new Error(
        "Gemini returned invalid JSON for product identification.",
      );
    }

    const { error, value } = productIdentificationSchema.validate(parsed, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      throw new Error(
        `Gemini product identification validation failed: ${error.message}`,
      );
    }

    return value;
  }

  async generateText({ prompt }) {
    if (!prompt?.trim()) {
      throw new Error("Gemini text generation requires a prompt.");
    }

    const response = await client.models.generateContent({
      model: MODEL,
      contents: prompt.trim(),
    });

    return response.text?.trim() || "";
  }
}

export const createGeminiProvider = () => new GeminiProvider();
