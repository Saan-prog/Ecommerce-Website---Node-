const express = require ("express");
const router = express.Router();
const { getCategories, getSubcategories, getSubcategoriesByCategory, createSubcategory } = require("../Controller/adminCategories.js");
const { authenticate } = require("../middilewares/adminAuthMiddleware.js");

router.get("/all", authenticate, getCategories);
router.get("/subcategories", authenticate, getSubcategories);
router.get("/subcategories/:categoryId", authenticate, getSubcategoriesByCategory);
router.post("/subcategories", authenticate, createSubcategory);

module.exports = router;