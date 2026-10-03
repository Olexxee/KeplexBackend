import OpenAI from "openai";

import { AIProvider } from "../ai.provider.js";
import { productIdentificationSchema } from "../ai.schemas.js";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = process.env.OPENAI_AI_MODEL || "gpt-5";

class OpenAIProvider extends AIProvider {
  async identifyProduct({ text = "", imageUrls = [] } = {}) {
    const content = [];

    if (text?.trim()) {
      content.push({
        type: "input_text",
        text: text.trim(),
      });
    }

    for (const imageUrl of imageUrls) {
      content.push({
        type: "input_image",
        image_url: imageUrl,
      });
    }

    if (content.length === 0) {
      throw new Error(
        "AI product identification requires text or at least one image.",
      );
    }

    const response = await client.responses.create({
      model: MODEL,

      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: `
You are Keplex's product identification engine.

Your job is to identify and normalize a product from a customer's
description and/or supplied image.

Rules:
1. Do not invent an exact product model when the evidence is insufficient.
2. If the brand is uncertain, return null.
3. possibleModel may be null.
4. category should describe the most likely product category.
5. attributes should contain observable or explicitly stated attributes.
6. searchTerms should contain useful ecommerce search phrases.
7. confidence must be between 0 and 1.
8. Confidence represents confidence in the identification, not whether
   the product exists in the Keplex catalog.
9. Return JSON only.

Required JSON structure:
{
  "productType": string | null,
  "brand": string | null,
  "possibleModel": string | null,
  "category": string | null,
  "attributes": object,
  "searchTerms": string[],
  "confidence": number
}
              `.trim(),
            },
          ],
        },
        {
          role: "user",
          content,
        },
      ],
    });

    let parsed;

    try {
      parsed = JSON.parse(response.output_text);
    } catch {
      throw new Error(
        "AI provider returned invalid JSON for product identification.",
      );
    }

    const { error, value } = productIdentificationSchema.validate(parsed, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      throw new Error(
        `AI product identification validation failed: ${error.message}`,
      );
    }

    return value;
  }

  async generateText({ prompt }) {
    if (!prompt?.trim()) {
      throw new Error("AI text generation requires a prompt.");
    }

    const response = await client.responses.create({
      model: MODEL,
      input: prompt.trim(),
    });

    return response.output_text;
  }
}

export const createOpenAIProvider = () => new OpenAIProvider();
