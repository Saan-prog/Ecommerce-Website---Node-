const mongoose = require("mongoose");

/**
 * Allowed order state transitions
 * (enforce this in service/controller layer)
 */
const ORDER_STATUSES = [
  "CREATED",
  "CONFIRMED",
  "SHIPPED",
  "OUT FOR DELIVERY",
  "DELIVERED",
  "CANCELLED"
];

const PAYMENT_STATUSES = [
  "PENDING",
  "PAID",
  "FAILED"
];

// 🧾 Main Order Schema
const orderSchema = new mongoose.Schema(
  {
    // 🔗 References
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    address: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
      required: true
    },

    // 🛒 Order items snapshot (IMPORTANT)
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true
        },
        name: {
          type: String,
          required: true
        },
        image: {
          type: [String]
        },
        quantity: {
          type: Number,
          required: true,
          min: 1
        },
        price: {
          type: Number,
          required: true,
          min: 0
        },
        size: {
          type: String,
          required: true
        }
      }
    ],

    // 💰 Financial details (store in smallest unit if possible)
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    shipping: {
      type: Number,
      default: 0,
      min: 0
    },
    tax: {
      type: Number,
      default: 0,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },

    // 💳 Payment
    paymentMethod: {
      type: String,
      enum: ["COD", "ONLINE"],
      required: true
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: "PENDING"
    },
    paymentId: {
      type: String
    },
    paymentGateway: {
      type: String // Razorpay, Stripe, etc.
    },

    // 📦 Order Status (State-machine friendly)
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: "CREATED"
    },

    // 🕒 Status history (audit trail)
    statusHistory: [
      {
        status: String,
        changedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],

    // ⏱ Status timestamps
    confirmedAt: Date,
    shippedAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,

    // 🚚 Tracking
    orderId: {
      type: String,
      unique: true,
      index: true
    },
    trackingNumber: {
      type: String
    },

    // 🎟 Coupon snapshot
    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon"
    },
    couponCode: {
      type: String
    },

    // ❌ Cancellation / Refund
    cancelReason: String,

    refundStatus: {
      type: String,
      enum: ["NOT_INITIATED", "PROCESSING", "COMPLETED"],
      default: "NOT_INITIATED"
    },
    refundAmount: {
      type: Number,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

//
// 🔐 Generate human-readable order ID
//
orderSchema.pre("save", function (next) {
  if (!this.orderId) {
    this.orderId = `ORD-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;
  }
  next();
});

//
// 📜 Track status history automatically
//
orderSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    this.statusHistory.push({ status: this.status });

    const now = new Date();
    if (this.status === "CONFIRMED") this.confirmedAt = now;
    if (this.status === "SHIPPED") this.shippedAt = now;
    if (this.status === "OUT FOR DELIVERY") this.outForDeliveryAt = now;
    if (this.status === "DELIVERED") this.deliveredAt = now;
    if (this.status === "CANCELLED") this.cancelledAt = now;
  }
  next();
});

//
// 📊 Indexes
//
orderSchema.index({ user: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
