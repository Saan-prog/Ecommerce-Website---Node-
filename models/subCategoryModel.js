const mongoose = require("mongoose");

const subcategorySchema = new mongoose.Schema({

    name: { type: String, 
        required: [true, "Subcategory Name is required"], 
        trim: true, 
        maxLength: 50}, 
    description: {
        type: String,
        trim: true,
        maxlength: 200,
        default: ""
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true
    }
    
});

module.exports = mongoose.model("Subcategories", subcategorySchema);