import * as productDb from "../products/product.db.js";

const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const tokenize = (value) =>
  normalize(value)
    .split(/\s+/)
    .filter((token) => token.length >= 2);

const intersectionScore = (sourceTokens, targetTokens) => {
  if (!sourceTokens.length || !targetTokens.length) {
    return 0;
  }

  const targetSet = new Set(targetTokens);

  const matches = sourceTokens.filter((token) => targetSet.has(token));

  return matches.length / sourceTokens.length;
};

const scoreProduct = (product, analysis) => {
  const productText = normalize(
    [
      product.name,
      product.description,
      product.brand?.name,
      product.category?.name,
      ...(product.variants || []).map((variant) =>
        [
          variant.sku,
          variant.color,
          variant.size,
          JSON.stringify(variant.attributes),
        ].join(" "),
      ),
    ].join(" "),
  );

  const productTokens = tokenize(productText);

  const searchTokens = tokenize((analysis.searchTerms || []).join(" "));

  const primaryTokens = tokenize(
    [
      analysis.productType,
      analysis.brand,
      analysis.possibleModel,
      analysis.category,
    ].join(" "),
  );

  const searchScore = intersectionScore(searchTokens, productTokens);

  const primaryScore = intersectionScore(primaryTokens, productTokens);

  let score = searchScore * 0.55 + primaryScore * 0.45;

  if (
    analysis.brand &&
    product.brand?.name &&
    normalize(analysis.brand) === normalize(product.brand.name)
  ) {
    score += 0.15;
  }

  if (
    analysis.category &&
    product.category?.name &&
    normalize(analysis.category) === normalize(product.category.name)
  ) {
    score += 0.1;
  }

  return Math.min(score, 1);
};

export const findCatalogMatches = async (analysis) => {
  const searchTerms = [
    ...(analysis.searchTerms || []),
    analysis.productType,
    analysis.brand,
    analysis.possibleModel,
    analysis.category,
  ].filter(Boolean);

  const search = searchTerms.join(" ");

  if (!search.trim()) {
    return [];
  }

  const result = await productDb.findProducts({
    search,
    status: "ACTIVE",
    page: 1,
    limit: 20,
  });

  const products = result?.products || result?.data || result || [];

  return products
    .map((product) => ({
      product,
      score: scoreProduct(product, analysis),
    }))
    .sort((a, b) => b.score - a.score);
};

export const findBestCatalogMatch = async (analysis) => {
  const matches = await findCatalogMatches(analysis);

  const bestMatch = matches[0];

  if (!bestMatch) {
    return null;
  }

  const product = await productDb.findProductById(bestMatch.product.id);

  if (!product) {
    return null;
  }

  return {
    product,
    score: bestMatch.score,
  };
};
