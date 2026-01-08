const express = require ("express");
const router = express.Router();
const { getCategories, addNewCategory, updateCategory, deleteCategory, getSubcategories, getSubcategoriesByCategory, createSubcategory } = require("../Controller/adminCategories.js");
const { authenticate } = require("../middilewares/adminAuthMiddleware.js");




router.get("/all", authenticate, getCategories);
router.post("/all", authenticate, addNewCategory);
router.put("/all/:id", authenticate, updateCategory );
router.delete("/all/:id", authenticate, deleteCategory);
router.get("/all/subcategory", authenticate, getSubcategories);
router.get("/subcategories/:categoryId", authenticate, getSubcategoriesByCategory);
router.post("/subcategories", authenticate, createSubcategory);


module.exports = router;