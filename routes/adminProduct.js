const express = require("express");
const router = express.Router();
const { uploadProductImages } = require('../middilewares/uploads.js');
const { authenticate } = require("../middilewares/adminAuthMiddleware.js");
const { listProducts, getProduct,  getCategories, getSubcategoriesByCategory, addProduct, updateProduct, deleteProduct } = require("../Controller/adminProductController.js");

router.get("/", authenticate, listProducts);
router.get('/getCategories', authenticate, getCategories);
// router.get('/getSubcategories', authenticate, getSubcategories);
router.get('/getSubcategories/:categoryId', authenticate, getSubcategoriesByCategory);
router.get("/:id", authenticate, getProduct);
router.post("/addProduct", authenticate, uploadProductImages, addProduct);
router.put("/updateProduct/:id", uploadProductImages, authenticate, updateProduct);
router.delete("/:id", authenticate, deleteProduct);


module.exports = router;