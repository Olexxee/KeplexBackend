import express from "express";
import { getPublicOffers } from "./offers.controller.js";

const router = express.Router();

router.get("/public/offers", getPublicOffers);

export default router;
