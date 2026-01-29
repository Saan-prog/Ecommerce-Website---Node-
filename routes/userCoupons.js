const express = require("express");
const router = express.Router();
const authenticate = require("../middilewares/authMiddleware.js");
const  { getAvailableCoupons, validateCoupon } = require("../Controller/userCouponController");


router.get("/getAll", authenticate, getAvailableCoupons);
router.post("/validate", authenticate, validateCoupon );


module.exports = router;