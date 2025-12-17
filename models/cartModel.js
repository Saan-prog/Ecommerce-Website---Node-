const mongoose = require("mongoose");
const User = require('./userModel.js');
const Product = require('./productModel.js');


const cartItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product", // Reference to Product model
        required: true,
    },
    quantity: {
        type: Number,
        required: true, 
        min: [1, "Quantity cannot be less than 1"],
        default: 1,
    },
    size: {
        type: String,
        required: true,
},
}, 

{ timestamps: true });

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },
    items: [cartItemSchema]
}, { timestamps: true });

module.exports = mongoose.model("Cart", cartSchema);