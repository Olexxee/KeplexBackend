export const AI_CAPABILITIES = Object.freeze({
  PRODUCT_IDENTIFICATION: "product-identification",
  TEXT_GENERATION: "text-generation",
});

export class AIProvider {
  async identifyProduct() {
    throw new Error(
      "identifyProduct() must be implemented by the AI provider.",
    );
  }

  async generateText() {
    throw new Error("generateText() must be implemented by the AI provider.");
  }
}
