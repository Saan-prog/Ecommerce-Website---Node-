const express = require("express");
const router = express.Router();
const { authenticate } = require("../middilewares/adminAuthMiddleware.js");
const { getAllOrders, getOrderbyId, updateOrderStatus } = require("../Controller/adminOrderController.js");


router.get("/getAll", authenticate, getAllOrders);
router.get("/getAll/:id", authenticate, getOrderbyId);
router.patch("/getAll/:id", authenticate, updateOrderStatus);


module.exports = router;