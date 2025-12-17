const bcrypt = require("bcrypt") ;
const jwt = require("jsonwebtoken");
const mongoose = require('mongoose');
const User = require ("../models/userModel.js");
const Address = require ("../models/addressModel.js");
const crypto = require ("crypto");
const { sendPasswordResetEmail } = require ("../scripts/emailService.js");




// In userController.js - add this temporary function
const testLogs = async (req, res) => {
    console.log("✅ userController.js IS LOADED AND WORKING!\n");
    res.json({ message: "Test logs working" });
};



// --------------- user signup----------------------
const userSignup = async (req, res) => {
    try{
        const { name, email, phone, password, confirmpassword } = req.body;
        
        const existingUser = await User.findOne({ email });
        if(existingUser) return res.status(400).json({ message: "Email already registred"});

        if (password !== confirmpassword) {
            console.log("passwords", password, confirmpassword);
        return res.status(400).json({ message: "Passwords do not match" });
        }

        const hashedPassword = await bcrypt.hash(password,10);
        
        const newUser = await User.create({ name, email, phone, password:hashedPassword});

        const token = jwt.sign({id: newUser._id, role: "User"}, process.env.JWT_SECRET, { expiresIn: "24h"});

        res.status(201).json({ message: "Signup successfull. Please login", token, user: newUser});


    }catch(err){
        res.status(500).json({message: "Server Error", error: err.message})
    }
}

// ====== User login =====

const userLogin = async (req, res) => {
    console.log("🚀 userLogin function called!");
    try{
        const { email, password } = req.body;
        
        const user = await User.findOne({ email });
        if(!user) return res.status(400).json({ message: "User not found"});

        console.log("Password from body:", password);
        console.log("Password from DB:", user.password);

        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch) return res.status(400).json({ message: "Invalid password"});

        const token = jwt.sign({id: user._id, role: "User"}, process.env.JWT_SECRET, { expiresIn: "1h"});

        res.status(201).json({ userId: user._id, token,  message: "Login successfull."});


    }catch(err){
        res.status(500).json({message: "Login failed", err_msg: err.message})
    }
}


// --------------- Forgot Password - Generate Reset Token ----------------------
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        console.log("Forgot password request for:", email);

        const user = await User.findOne({ email });
        if (!user) {
            console.log(" User not found with email:", email);
            return res.status(200).json({ 
                message: "If an account with that email exists, a password reset link has been sent." 
            });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        
        // Set token and expiry (1 hour from now)
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        
        await user.save();
        console.log("Reset token generated for user:", user.email);

// create a hash for the token and senth that hash in mail

        // In a real app, you would send an email here
        // For now, we'll return the token (in development only)
        const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:8070'}/reset-password.html?token=${resetToken}&user=${user._id}`;
        
        console.log("📧 Reset link:", resetLink);

        await sendPasswordResetEmail(user.email, resetLink)

        res.status(200).json({ 
            message: "If an account with that email exists, a password reset link has been sent.",
            // Only include in development
            ...({ resetLink })
        });

    } catch (err) {
        console.error("💥 Forgot password error:", err);
        res.status(500).json({ 
            message: "Server error. Please try again. 2", 
            error: err.message 
        });
    }
};

// --------------- Reset Password ----------------------
const resetPassword = async (req, res) => {
    try {
        const { userId, token, newPassword, confirmPassword } = req.body;

        console.log("Reset password request for user:", userId);

        if (!userId || !token || !newPassword || !confirmPassword) {
            return res.status(400).json({ 
                message: "All fields are required" 
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            console.log("User not found with ID:", userId);
            return res.status(404).json({ message: "User not found" }); // FIX 2: Added return
        }

        if (!user.resetPasswordToken || user.resetPasswordToken !== token) {
            console.log("Token doesn't match");
            return res.status(401).json({ message: "Invalid or expired reset token" }); // FIX 2: Added return
        }

        if (user.resetPasswordExpires < Date.now()) {
            console.log("Token expired");
            return res.status(401).json({ message: "Reset token has expired" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters long" });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        user.password = hashedPassword;
        user.resetPasswordToken = undefined;    // Clear the reset token
        user.resetPasswordExpires = undefined;  // Clear the expiry
        
        await user.save();
        console.log("Password reset successful for user:", user.email);

        res.status(200).json({ 
            message: "Password reset successful. You can now login with your new password." 
        });
      
    } catch (err) {
        console.error("Reset password error:", err);
        res.status(500).json({ 
            message: "Server error. Please try again.", 
            error: err.message 
        });
    }
};
// // --------------- Get user profile ----------------------
const getUserProfile = async (req, res) => {
    try{
        const user = await User.findById(req.userId).select("-password");
        if(!user) { 
            return res.status(404).json({message: "User not found"}); 
        } 

        res.status(200).json({ message: "User profile fetched successfully", 
                user: {
                name: user.name,
                email: user.email,
                phone: user.phone }});
        
    }catch(err){
        res.status(500).json({message: "Server Error", err_msg: err.message})
    }
};

// // --------------- Update user profile ----------------------
const updateUserProfile = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "User Authentication required" });
        }

        // Allowed and permitted data for update
        const allowedUpdates = ["name", "phone"];
        const updates = Object.keys(req.body);

        // Validate if all requested updates are allowed
        const isValidOperation = updates.every(update => allowedUpdates.includes(update));
        if (!isValidOperation) {
            return res.status(400).json({ success: false, message: "Invalid fields in update requests" });
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: "No valid fields provided for update" });
        }

        const validationErrors = [];

        // Create new variables instead of reassigning const
        let processedName = req.body.name;
        let processedPhone = req.body.phone;

        if (processedName) {
            if (processedName.trim().length < 3 || processedName.trim().length > 20) {
                validationErrors.push("Name must be between 3 to 20 characters");
            }
            processedName = processedName.trim().replace(/[<>]/g, '');
        }

        if (processedPhone) {
            const phoneRegex = /^[0-9]{10}$/;
            const cleanPhone = processedPhone.replace(/\D/g, '');
            if (!phoneRegex.test(cleanPhone)) {
                validationErrors.push("Phone Number must be 10 digits");
            }
            processedPhone = cleanPhone;
        }

        if (validationErrors.length > 0) {
            return res.status(422).json({ success: false, message: "Validation failed", errors: validationErrors });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        let hasChanged = false;
        const updateData = {};

        // Use processed values
        updates.forEach(field => {
            const newValue = field === 'name' ? processedName : processedPhone;
            const currentValue = user[field];
            
            if (newValue !== undefined && newValue !== currentValue) {
                updateData[field] = newValue;
                hasChanged = true;
            }
        });

        if (!hasChanged) {
            return res.status(200).json({ 
                success: true, 
                message: "No changes detected", 
                data: { name: user.name, phone: user.phone } 
            });
        }

        // Apply updates
        Object.keys(updateData).forEach(field => {
            user[field] = updateData[field];
        });

        await user.save();

        res.status(200).json({
            success: true,
            data: {
                name: user.name,
                email: user.email,
                phone: user.phone,
                updatedAt: user.updatedAt
            },
            message: "Profile updated successfully"
        });

    } catch (err) {
        console.error("Profile update error:", err);

        if (err.name === 'ValidationError') {
            return res.status(422).json({
                success: false,
                message: "Data validation failed",
                errors: Object.values(err.errors).map(e => e.message)
            });
        }

        res.status(500).json({
            message: "Server Error",
            err_msg: err.message,
            error: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
};

// // --------------- Get user addresses ----------------------

const getUserAddresses = async (req, res) => {
    try{
        const userId = req.userId;

        const user = await User.findById(userId);
        if(!user) {
            return res.status(400).json({sucess: false, message: "User not found"});
        }

        const addresses = await Address.find({ user: user})
        .sort({ isDefault: -1, createdAt: -1});

        console.log('📋 Found addresses in DB:', addresses.length);


        res.status(200).json({ success: true, 
            message: addresses.length > 0 ? 'Addresses retrived successfully' : 'No addresses found',
            count: addresses.length,
            data: addresses});
        
    }catch(err){
        res.status(500).json({success: false, 
            message: "Server Error while fetching address" 
            });
    }
};

// ----------------------------- CreateAddress ------------------------------------------

const createAddress = async (req, res) => {
    console.log('=== CREATE ADDRESS REQUEST ===');
        console.log('User ID:', req.user.id);
        console.log('Request Body:', req.body);
    try{
    const userId = req.userId;

    const {fullName, phone, house, street, city, state, pinCode, country, isDefault } = req.body;

    if(!fullName || !phone || !house || !city || !state || !pinCode){
        return res.status(400).json({success: false, message: "Please fill all required fields"});
    }

    if(isDefault) {
        await Address.updateMany(
            {user: userId, isDefault: true},
            {$set: { isDefault: false}});
    }

    const newAddress = new Address ({
        user: userId,
        fullName, 
        phone, 
        house, 
        street: street || '',
        city,
        state,
        pinCode,
        country: country || 'India',
        isDefault: isDefault || false

    });

    const saveAddress = await newAddress.save();
}catch (error){
    console.error('Error creating address', error);
    res.status(500).json({success: false, message: "Server error while creating address"
    });
}
}

// ---------------------- Edit Addresses--------------------------------------------------

const editAddresses = async (req, res) => {
    try{

        const addressId = req.params.id;
        const userId = req.userId;
        
        const updates = req.body;

        // validate the userId format
        if(!mongoose.Types.ObjectId.isValid(addressId)){
            return res.status(400).json({success: false, message: "Invalid AddressId" });
        }

        // find address id
        const address = await Address.findById(addressId)
        if(!address) {
            return res.status(404).json({success: false, message: "Address not found"});
        }

        if(!address.user.equals(userId)){
            return res.status(403).json({success: false, message: "Forbidden, Not your Address"});
        }
        // validate and sanitize input data
        const requiredFields = ['fullName', 'house', 'phone', 'street', 'city', 'state', 'pinCode' ];
        for (let field of requiredFields) {
            if(!updates [field] || updates[field].trim() === ""){
                return res.status(400).json({success: false, message: `Missing required fields: ${field}`});
            }
        }

        // clean the data (trim, remove unwanted characters)

        updates.fullName = updates.fullName.trim();
        updates.house = updates.house.trim();
        updates.phone = updates.phone.trim();
        updates.street = updates.street.trim();
        updates.city = updates.city.trim();
        updates.state = updates.state.trim();
        updates.pinCode = updates.pinCode.trim();
       
        // if the address is set to default, unset others
        if(updates.isDefault === true) {
            await Address.updateMany ({user: userId, _id: {$ne: addressId}}, {$set: {isDefault : false}});
        }

        // update the address field
        Object.assign(address, updates);

        // save the updated address
        const updatedAddress = await address.save();

        res.status(200).json({success: true, message: "Address updated successfully", address: updatedAddress});

    }catch(error){
        console.log("error updating address", error);
        res.status(500).json({success: false, message: "server error while updating address"});

    }
}

// -------------------------------------------Delete Address---------------------------------------

const removeAddresses = async (req, res) => {
try{

    const addressId = req.params.id;
    const user = req.userId;

    const address = await Address.findById(addressId);

    if(!mongoose.Types.ObjectId.isValid(addressId)){
            return res.status(400).json({success: false, message: "Invalid AddressId" });
        }

    if(!address) {
        res.status(404).json({success: false, message: "Address not found"});
    }

    if(!address.user.equals(user)){
        res.status(403).json({success: false, message: "Forbidden, creater of Address is not you"});
    }

    const wasDefault = address.isDefault;
    await Address.findByIdAndDelete(addressId);

    if(wasDefault){
        const nextAddress = await Address.findOne({user: user});
    if(nextAddress){
        nextAddress.isDefault = true;
        await nextAddress.save();
    }
    }

    res.status(200).json({success: true, message: "Address deleted Successfully"});

}catch(err){
    console.error("Error deleting address:", err);
    res.status(500).json({ success: false, message: "Server error while deleting address", error: err.message });
}
}


module.exports = { testLogs, 
    userSignup, userLogin, 
    forgotPassword, resetPassword, 
    getUserProfile, updateUserProfile, 
    getUserAddresses, createAddress, editAddresses, 
    removeAddresses };