const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true, // standardize coupon codes like SAVE10
      trim: true,
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"], // e.g., 10% off or ₹200 off
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: [1, "Discount value must be greater than 0"],
    },
    minPurchaseAmount: {
      type: Number,
      default: 0, // optional minimum order requirement
    },
    maxDiscountAmount: {
      type: Number,
      default: 0, // for % coupons, optional upper cap
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    usageLimit: {
      type: Number,
      default: 0, // 0 = unlimited
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Admin user
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Coupon", couponSchema);
