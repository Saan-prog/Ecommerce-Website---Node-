const Coupon = require("../models/couponModel.js");
const mongoose = require("mongoose");

// ------------------------------------------------------- GET COUPONS---------------------------------------------
const listCoupons = async(req, res) => {
    try {
      const coupons = await Coupon.find()
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email")
      .lean();

      const now = new Date();
      const couponWithStatus = coupons.map(coupon => {
        const expiry = new Date(coupon.expiryDate);
        const isExpired = expiry < now;
        const isActive = coupon.isActive && !isExpired;
        const isLimited = coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit;

        return{
            ...coupon,
            isExpired,
            isActive,
            isLimited,
            daysRemaining: Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
        };
      });

      res.status(200).json({
        success: true,
        message: "Coupons fetched",
        count: coupons.length,
        data: couponWithStatus
      });
    } catch (error) {
        console.error("Error fetching coupons:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching coupons",
            error: error.message
        });
    }
}

// --------------------------------------------------------------Create Coupon--------------------------------------------------
const createCoupon = async(req, res) => {
    try {
        const{
            code,
            discountType,
            discountValue,
            minPurchaseAmount = 0,
            maxDiscountAmount = 0,
            startDate = Date.now(),
            expiryDate,
            isActive = true,
            usageLimit = 0,
            usedCount = 0,
            description 
        } = req.body;

          if (!code || !discountType || !discountValue || !expiryDate) {
            return res.status(400).json({
                success: false,
                message: "Code, discountType, discountValue, and expiryDate are required"
            });
        }

        if (discountValue <= 0) {
            return res.status(400).json({
                success: false,
                message: "Discount value must be greater than 0"
            });
        }
        if(discountType === "percentage" && discountValue > 100){
            return res.status(400).json({
                success: false,
                message: "Percentage discount cannot exceed 100%"
            });
        }

         // Validate dates
        const start = new Date(startDate);
        const expiry = new Date(expiryDate);
        
        if (expiry <= start) {
            return res.status(400).json({
                success: false,
                message: "Expiry date must be after start date"
            });
        }

         // Check if coupon code already exists
        const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
        if (existingCoupon) {
            return res.status(400).json({
                success: false,
                message: "Coupon code already exists"
            });
        }

        const coupon = new Coupon({
            code: code.toUpperCase(),
            discountType,
            discountValue,
            minPurchaseAmount,
            maxDiscountAmount,
            startDate: start,
            expiryDate: expiry,
            isActive,
            usageLimit,
            usedCount,
            description,
            createdBy: req.user._id
        });
        await coupon.save();
        await coupon.populate("createdBy", "name email");

        res.status(201).json({
            success: true,
            message: "Coupon created successfully",
            data: coupon
        });

    } catch (error) {
        console.error("Error creating coupon:", error);
        
        // Handle duplicate key error
        if (error.code === 11000    ) {
            return res.status(400).json({
                success: false,
                message: "Coupon code already exists"
            });
        }

        // Handle validation errors
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: "Validation error",
                errors: messages
            });
        }

        res.status(500).json({
            success: false,
            message: "Error creating coupon",
            error: error.message
        });
    }
}

// ---------------------------------------------------Update Coupon -------------------------------------

const updateCoupon = async( req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        if(!mongoose.Types.ObjectId.isValid(id)){
         return res.status(400).json({
                success: false,
                message: "Invalid coupon ID format"
            });   
        }

        const coupon = await Coupon.findById(id);
        if(!coupon){
           return res.status(404).json({
                success: false,
                message: "Coupon not found"
            }); 
        }

        // If code is being updated, check for duplicates
        if(updateData.code && updateData.code !== coupon.code){
        const existingCoupon = await Coupon.findOne({
            code: updateData.code.toUpperCase(),
            _id: { $ne: id}
        });

        if(existingCoupon){
            return res.status(400).json({
                    success: false,
                    message: "Coupon code already exists"
                });
        }
        // Convert to uppercase

    updateData.code = updateData.code.toUpperCase();
        }

        // Validate discount value if being updated
        if(updateData.discountValue !== undefined && updateData.discountValue <= 0){
             return res.status(400).json({
                success: false,
                message: "Discount value must be greater than 0"
            });
        }

         // Validate percentage discount
         if(updateData.discountType === "percentage" && updateData.discountValue > 100){
            return res.status(400).json({
                success: false,
                message: "Percentage discount cannot exceed 100%"
            });
         }

         // Validate dates if being updated
         if(updateData.startDate || updateData.expiryDate) {
            const start = updateData.startDate ? new Date(updateData.startDate) : coupon.startDate;
            const expiry = updateData.expiryDate ? new Date(updateData.expiryDate) : coupon.expiryDate;

            if( expiry <= start) {
                 return res.status(400).json({
                    success: false,
                    message: "Expiry date must be after start date"
                });
            }
         }

         // Validate usedCount doesn't exceed usageLimit
         if(updateData.usedCount !== undefined && coupon.usageLimit > 0){
            if(updateData.usedCount > coupon.usageLimit) {
                 return res.status(400).json({
                    success: false,
                    message: "Used count cannot exceed usage limit"
                });
            }
         }

         // Update coupon
         const updatedCoupon = await Coupon.findByIdAndUpdate(
            id,
            {...updateData, updatedAt: Date.now()},
            {new: true, runValidators: true}
         ).populate("createdBy", "name email");

         res.status(200).json({
            success: true,
            message: "Coupon updated successfully",
            data: updatedCoupon
        });
    } catch (error) {
        console.error("Error updating coupon:", error);
        
        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "Coupon code already exists"
            });
        }

        // Handle validation errors
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: "Validation error",
                errors: messages
            });
        }

        res.status(500).json({
            success: false,
            message: "Error updating coupon",
            error: error.message
        });
    }
}


// ---------------------------------------------------Delete Coupon --------------------------------------------------
const deleteCoupon = async(req, res) => {
    try {
        const { id } = req.params;
        if(!mongoose.Types.ObjectId.isValid(id))
            return res.status(400).json({
                success: false,
                message: "Invalid coupon ID format"
            }); 
         

        const coupon = await Coupon.findById(id);
        if(!coupon) {
            return res.status(404).json({
                success: false,
                message: "Coupon not found"
            });
        }

        await Coupon.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: "Coupon deleted successfully"
        });
    }
     catch (error) {
        console.error("Error deleting coupon:", error);
        res.status(500).json({
            success: false,
            message: "Error deleting coupon",
            error: error.message
        });
    }
    }

module.exports = { listCoupons, createCoupon, updateCoupon, deleteCoupon };