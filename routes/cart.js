const express = require ("express");
const router = express.Router();
const authenticate = require("../middilewares/authMiddleware.js");
const { getCart, addToCart, updateCartItem, removeCartItem, 
        clearCart} = require("../Controller/cartController.js");


router.get("/getAll", authenticate, getCart );
router.post("/addtocart", authenticate, addToCart );
router.put("/updateCart/:productId", authenticate, updateCartItem);
router.delete("/removeCartItem/:productId", authenticate, removeCartItem);
router.delete("/clear", authenticate, clearCart);


module.exports = router;