import { AIProvider } from "./ai.provider.js";
import { createGeminiProvider } from "./providers/gemini.provider.js";

const createProvider = () => {
  const providerName = process.env.AI_PROVIDER || "gemini";

  switch (providerName) {
    case "gemini":
      return createGeminiProvider();

    default:
      throw new Error(`Unsupported AI provider: ${providerName}`);
  }
};

const provider = createProvider();

if (!(provider instanceof AIProvider)) {
  throw new Error(
    "Configured AI provider does not implement the AIProvider contract.",
  );
}

export const identifyProduct = (input) => provider.identifyProduct(input);

export const generateText = (input) => provider.generateText(input);
