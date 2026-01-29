const express = require ("express");
const router = express.Router();
const authenticate = require("../middilewares/authMiddleware.js");
const { getWishlist, addToWishlist, removeFromWishlist } = require("../Controller/wishlistController.js");



router.get("/all", authenticate, getWishlist);
router.post("/add", authenticate, addToWishlist);
router.delete("/remove/:productId", authenticate, removeFromWishlist);

module.exports = router;