const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, "Product name is required"],
        minlength: [3, "Product name must be at least 3 characters long"],
        maxlength: [200, "Product name cannot exceed 200 characters"],
        trim: true
    },
    description: { 
        type: String, 
        required: [true, "Product description is required"],
        minlength: [10, "Product description must be at least 10 characters long"],
        maxlength: [2000, "Product description cannot exceed 2000 characters"],
        trim: true
    },
    price: { 
        type: Number, 
        required: [true, "Price is required"],
        min: [0, "Price cannot be negative"],
        max: [10000000, "Price cannot exceed 10,000,000"]
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: [true, "Category is required"]
    },
    subcategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subcategories",
        required: [true, "Subcategory is required"]
    },
    brand: { 
        type: String,
        minlength: [2, "Brand name must be at least 2 characters long"],
        maxlength: [100, "Brand name cannot exceed 100 characters"],
        trim: true
    },
    status: { 
        type: String, 
        default: 'active',
        enum: ['active', 'inactive', 'discontinued', 'out_of_stock']
    },
    isAvailable: { 
        type: Boolean, 
        default: true 
    },
    image: {
        type: [String],
        default: [],
        validate: [arr => arr.length <= 5, 'Cannot upload more than 5 images']
    },
    createdBy: {   // Track which admin created the product
        type: mongoose.Schema.Types.ObjectId,
        ref: "admin",
        required: true
    }
}, 
{
    timestamps: true,
});

module.exports = mongoose.model("Product", productSchema);
