const express = require ("express");
const router = express.Router();
const  { authenticate } = require("../middilewares/adminAuthMiddleware.js");
const {showDashboard, salesAnalytics, getCutomerInsight, getProductPerformance, getSalesReport} = require("../Controller/adminDashboardController");

router.get("/all", authenticate, showDashboard);
router.get("/sales/:d", authenticate, salesAnalytics);
router.get("/customers/:d", authenticate, getCutomerInsight);
router.get("/products/:d", authenticate, getProductPerformance);
router.get("/salesReport/:type", authenticate, getSalesReport);

module.exports = router;