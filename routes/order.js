const express = require("express");
const router = express.Router();
const authenticate = require("../middilewares/authMiddleware.js");
const InvoiceController = require("../Controller/invoiceController.js");
const  { checkout, verifyPayment, getUserOrders, addReview } = require("../Controller/userOrderController.js");

router.post("/checkout", authenticate, checkout);
router.post("/verifyPayment", authenticate, verifyPayment);
router.get("/getAll", authenticate, getUserOrders);
router.post("/reviews/add", authenticate, addReview);
router.get('/:orderId/invoice', authenticate, InvoiceController.downloadInvoice);
// router.get('/:orderId/invoice/preview', authenticate, InvoiceController.previewInvoice);
// router.get('/invoice/health', InvoiceController.healthCheck);

module.exports = router;