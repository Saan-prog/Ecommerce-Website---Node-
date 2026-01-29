const express = require ("express");
const router = express.Router();
const { authenticate } = require("../middilewares/adminAuthMiddleware.js");
const { listCoupons, createCoupon, updateCoupon, deleteCoupon} = require("../Controller/adminCouponController.js");

router.get("/getAll", authenticate, listCoupons );
router.post("/add", authenticate, createCoupon);
router.put("/:id/update", authenticate, updateCoupon);
router.delete("/:id/delete", authenticate, deleteCoupon);

module.exports = router;