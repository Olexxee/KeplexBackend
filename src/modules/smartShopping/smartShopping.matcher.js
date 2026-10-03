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

const scoreTokens = (source, target) => {
  const sourceTokens = tokenize(source);
  const targetTokens = new Set(tokenize(target));

  if (!sourceTokens.length || !targetTokens.size) {
    return 0;
  }

  const matches = sourceTokens.filter((token) => targetTokens.has(token));

  return matches.length / sourceTokens.length;
};

const scoreVariant = (variant, intent) => {
  let score = 0;

  const searchable = [
    variant.color,
    variant.size,
    variant.sku,
    JSON.stringify(variant.attributes),
  ]
    .filter(Boolean)
    .join(" ");

  if (intent.preferredColors.length) {
    const colorScore = scoreTokens(
      intent.preferredColors.join(" "),
      variant.color,
    );

    score += colorScore * 0.15;
  }

  if (intent.preferredSizes.length) {
    const sizeScore = scoreTokens(
      intent.preferredSizes.join(" "),
      variant.size,
    );

    score += sizeScore * 0.15;
  }

  const attributeTerms = [
    ...(intent.searchTerms || []),
    ...Object.keys(intent.attributes || {}),
    ...Object.values(intent.attributes || {}).filter(
      (value) => typeof value === "string",
    ),
  ];

  const attributeScore = scoreTokens(attributeTerms.join(" "), searchable);

  score += attributeScore * 0.15;

  return score;
};

const scoreProduct = (product, intent) => {
  const productText = [
    product.name,
    product.description,
    product.brand?.name,
    product.category?.name,

    ...product.variants.flatMap((variant) => [
      variant.color,
      variant.size,
      JSON.stringify(variant.attributes),
    ]),
  ]
    .filter(Boolean)
    .join(" ");

  const requestedTerms = [
    intent.productType,
    intent.category,
    intent.brand,
    intent.model,
    intent.useCase,
    ...(intent.searchTerms || []),
    ...(intent.preferredColors || []),
    ...(intent.preferredSizes || []),
  ]
    .filter(Boolean)
    .join(" ");

  let score = scoreTokens(requestedTerms, productText);

  if (
    intent.brand &&
    product.brand &&
    normalize(intent.brand) === normalize(product.brand.name)
  ) {
    score += 0.2;
  }

  if (
    intent.category &&
    product.category &&
    normalize(intent.category) === normalize(product.category.name)
  ) {
    score += 0.2;
  }

  if (intent.productType) {
    score += scoreTokens(intent.productType, product.name) * 0.15;
  }

  if (intent.model) {
    score += scoreTokens(intent.model, product.name) * 0.2;
  }

  return Math.min(score, 1);
};

const getBestVariant = (product, intent) => {
  const variants = [...(product.variants || [])];

  if (!variants.length) {
    return null;
  }

  return variants
    .map((variant) => ({
      variant,
      score: scoreVariant(variant, intent),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return Number(a.variant.price) - Number(b.variant.price);
    })[0]?.variant;
};

const getPriceRange = (variants) => {
  const prices = variants
    .map((variant) => Number(variant.price))
    .filter(Number.isFinite);

  if (!prices.length) {
    return null;
  }

  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };
};

const getSearchTerms = (intent) =>
  [
    intent.productType,
    intent.category,
    intent.brand,
    intent.model,
    ...(intent.searchTerms || []),
  ]
    .filter(Boolean)
    .map((value) => String(value).trim())
    .filter(Boolean);

const hasSpecificProductRequest = (intent) => {
  return Boolean(
    intent.productType || intent.category || intent.brand || intent.model,
  );
};

export const findSmartShoppingProducts = async (intent) => {
  const searchTerms = getSearchTerms(intent);

  const specificRequest = hasSpecificProductRequest(intent);

  const results = new Map();

  /*
   * SPECIFIC SEARCH
   *
   * Example:
   * "I need a black Nike backpack under ₦80k"
   *
   * Search the catalog using the actual product
   * information supplied by the customer.
   */
  if (specificRequest && searchTerms.length) {
    const searches = searchTerms.slice(0, 5);

    for (const search of searches) {
      const products = await productDb.findProductsForSmartShopping({
        search,

        category: intent.category || undefined,

        brand: intent.brand || undefined,

        minPrice: intent.budget.min ?? undefined,

        maxPrice: intent.budget.max ?? undefined,

        take: 30,
      });

      for (const product of products) {
        results.set(product.id, product);
      }
    }
  }

  /*
   * BROAD DISCOVERY
   *
   * Example:
   * "I need something useful under ₦100k."
   *
   * There is no actual product/category to search for.
   * Therefore we intentionally perform a catalog browse
   * using the real constraints instead of searching for
   * words such as "useful" or "practical".
   */
  if (!specificRequest) {
    const products = await productDb.findProductsForSmartShopping({
      search: undefined,

      category: intent.category || undefined,

      brand: intent.brand || undefined,

      minPrice: intent.budget.min ?? undefined,

      maxPrice: intent.budget.max ?? undefined,

      take: 50,
    });

    for (const product of products) {
      results.set(product.id, product);
    }
  }

  const ranked = [...results.values()]
    .map((product) => {
      const variant = getBestVariant(product, intent);

      return {
        product,
        variant,
        score: scoreProduct(product, intent),
        priceRange: getPriceRange(product.variants),
      };
    })
    .filter(({ variant }) => Boolean(variant))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return Number(a.variant.price) - Number(b.variant.price);
    });

  return ranked.slice(0, 12);
};
