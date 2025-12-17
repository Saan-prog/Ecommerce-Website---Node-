const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, "Name is required"],
        minlength: [3, "Name must be at least 3 characters long"],
        maxlength: [50, "Name cannot exceed 50 characters"]
    },
    email: { 
        type: String, 
        required: [true, "Email is required"], 
        unique: true,
        match: [/\S+@\S+\.\S+/, "Please enter a valid email address"]
    },
    phone: { 
        type: String, 
        required: [true, "Phone number is required"],
        match: [/^\d{10}$/, "Phone number must be 10 digits"]
    },
    password: { 
        type: String, 
        required: [true, "Password is required"],
        minlength: [6, "Password must be at least 6 characters long"]
    },
    role: { 
        type: String,
        enum: {
            values: ["user", "admin"],
            message: "Role must be either 'user' or 'admin'"
            }, 
        default: "user"},
    status: {
        type: String,
        enum: ['active', 'blocked', 'pending'],
        default: 'active'
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date
},
{
    timestamps:true
});

module.exports = mongoose.model("User", userSchema);