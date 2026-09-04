export const parseProductMultipart = (req, res, next) => {
  try {
    if (typeof req.body.variants === "string") {
      req.body.variants = JSON.parse(req.body.variants);
    }

    if (typeof req.body.isFeatured === "string") {
      req.body.isFeatured = req.body.isFeatured === "true";
    }

    if (typeof req.body.isNew === "string") {
      req.body.isNew = req.body.isNew === "true";
    }

    if (typeof req.body.isBestSeller === "string") {
      req.body.isBestSeller = req.body.isBestSeller === "true";
    }

    if (req.body.brandId === "") {
      req.body.brandId = null;
    }

    next();
  } catch (error) {
    return next(new BadRequestError("Invalid JSON data in product request"));
  }
};

export const parseCategoryMultipart = (req, res, next) => {
  try {
    if (typeof req.body.isActive === "string") {
      req.body.isActive = req.body.isActive === "true";
    }

    if (typeof req.body.sortOrder === "string") {
      req.body.sortOrder = Number(req.body.sortOrder);
    }

    if (req.body.parentId === "") {
      req.body.parentId = null;
    }

    next();
  } catch {
    next(new BadRequestError("Invalid category data in request"));
  }
};
