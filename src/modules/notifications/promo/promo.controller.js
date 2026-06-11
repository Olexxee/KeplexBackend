import { sendPromoToAll } from "./promo.service.js";

// POST /api/admin/notifications/promo
export const sendPromoEmail = async (req, res) => {
  const { subject, title, body, ctaUrl, ctaLabel } = req.body;

  if (!subject || !title || !body) {
    return res
      .status(400)
      .json({ message: "subject, title and body are required" });
  }

  const result = await sendPromoToAll(
    { subject, title, body, ctaUrl, ctaLabel },
    req.user.id,
  );

  res.json({
    message: `Promo sent to ${result.sent} users. ${result.failed} failed.`,
    data: result,
  });
};
