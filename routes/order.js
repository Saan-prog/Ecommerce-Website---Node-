const express = require("express");
const router = express.Router();
const authenticate = require("../middilewares/authMiddleware.js");

const  { checkout, verifyPayment, getUserOrders } = require("../Controller/userOrderController.js");
const { getUserAddresses } = require("../Controller/userController.js");

router.post("/checkout/:cartId/:addressId/:paymentMethod", authenticate, checkout);
router.post("/verifyPayment", authenticate, verifyPayment);
router.get("/getAll", authenticate, getUserOrders);
module.exports = router;