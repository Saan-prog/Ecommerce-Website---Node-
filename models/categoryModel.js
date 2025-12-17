const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
    name: { type: String, 
        required: [true, "Category Name is required"], 
        unique: true, 
        trim: true, 
        maxLength: 50}, 
    description: {
        type: String,
        trim: true,
        maxlength: 200,
        default: ""
    }
    
});

module.exports = mongoose.model("Category", categorySchema);