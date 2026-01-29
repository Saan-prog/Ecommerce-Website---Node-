const Order = require("../models/orderModel.js");
const User = require("../models/userModel");
const Coupon = require("../models/couponModel.js");

// --------------------------------------------------------Get Coupons-----------------------------------------------------

const getAvailableCoupons = async (req, res) => {
  try {
    const userId = req.user._id;
    const currentDate = new Date();

    let user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const coupons = await Coupon.find({
      isActive: true,
      expiryDate: { $gte: currentDate },
      startDate: { $lte: currentDate },
    }).sort({ createdAt: -1 });

    const userOrders = await Order.find({ user: userId });
    const usedCouponCodes = new Set(
      userOrders
        .filter((order) => order.coupon && order.coupon.code)
        .map((order) => order.coupon.code),
    );

    const availableCoupons = coupons.filter((coupon) => {
      if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
        return false;
      }

      if (usedCouponCodes.has(coupon.code)) {
        return false;
      }

      return true;
    });
    const formattedCoupons = availableCoupons.map((coupon) => ({
      _id: coupon._id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minPurchaseAmount: coupon.minPurchaseAmount,
      maxDiscountAmount: coupon.maxDiscountAmount,
      startDate: coupon.startDate,
      expiryDate: coupon.expiryDate,
      isActive: coupon.isActive,
      usageLimit: coupon.usageLimit,
      usedCount: coupon.usedCount,
      description: `${
        coupon.discountType === "percentage"
          ? `${coupon.discountValue}% OFF`
          : `₹${coupon.discountValue} OFF`
      }${
        coupon.minPurchaseAmount > 0
          ? ` on orders above ₹${coupon.minPurchaseAmount}`
          : ""
      }`,
    }));

    res.status(200).json({
      success: true,
      count: formattedCoupons.length,
      coupons: formattedCoupons,
    });
  } catch (error) {
    console.error("Error fetching coupons:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching coupons",
      error: error.message,
    });
  }
};

// -------------------------------------------------------------------- Validate Coupon ------------------------------------------------------

const validateCoupon = async(req, res) => {
    try {
        const { couponCode, cartTotal } = req.body;
        const userId = req.user._id;

        if(!couponCode || !couponCode.trim()){
            return res.status(400).json({
        success: false,
        valid: false,
        message: 'Please enter a coupon code'
      });
        }

        if(!cartTotal || cartTotal < 0) {
            return res.status(400).json({
        success: false,
        valid: false,
        message: 'Invalid cart total'
      });
        }

        const coupon = await Coupon.findOne({
            code: couponCode.toUpperCase().trim()
        });

        if(!coupon){
          return res.status(200).json({
        success: true,
        valid: false,
        message: 'Invalid coupon code'
      });  
        }

        
        const validationResult = await validateCouponForUser(coupon, cartTotal, userId);

        if(!validationResult.valid) {
            return res.status(200).json({
        success: true,
        valid: false,
        message: validationResult.message,
        ...(validationResult.minimumAmount && {
          minimumAmount: validationResult.minimumAmount,
          remainingAmount: validationResult.remainingAmount
        })
      });
        }

        const discountResult = calculateDiscount(coupon, cartTotal);

        res.status(200).json({
      success: true,
      valid: true,
      coupon: {
        _id: coupon._id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minPurchaseAmount: coupon.minPurchaseAmount,
        maxDiscountAmount: coupon.maxDiscountAmount,
        displayText: coupon.discountType === 'percentage' 
          ? `${coupon.discountValue}% Off` 
          : `₹${coupon.discountValue} Off`,
        description: getCouponDescription(coupon)
      },
      discountAmount: discountResult.discountAmount,
      discountDescription: discountResult.description,
      message: 'Coupon applied successfully!',
      finalAmount: cartTotal - discountResult.discountAmount
    });


    } catch (error) {
      console.error('Error validating coupon:', error);
    res.status(500).json({
      success: false,
      valid: false,
      message: 'Error validating coupon. Please try again.',
      error: error.message
    });
  }  
    };

// ------------------------------------------ValidateCouponForUser------------------------------------------------------

const validateCouponForUser = async (coupon, cartTotal, userId) => {
try {
    const currentDate = new Date();

    if(!coupon.isActive) {
        return { valid: false, message: "This coupon is no longer active"};
    }

    if( coupon.expiryDate < currentDate) {
        return { valid: false, message: 'This coupon is not yet active' };
    }

    if(coupon.usegeLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
        return { valid: false, message: 'This coupon has reached its usage limit' }
    }

    if(coupon.minPurchaseAmount > 0 && cartTotal < coupon.minPurchaseAmount) {
        const remaining = coupon.minPurchaseAmount - cartTotal;
      return {
        valid: false,
        message: `Minimum purchase of ₹${coupon.minPurchaseAmount} required`,
        minimumAmount: coupon.minPurchaseAmount,
        remainingAmount: remaining
      };
    }

    const previousUsage = await Order.findOne({
        user: userId,
      'coupon.code': coupon.code
    })

    if (previousUsage) {
      return { valid: false, message: 'You have already used this coupon' };
    }
    
    return { valid: true, message: 'Coupon is valid' };
} catch (error) {
    console.error('Error in coupon validation:', error);
    return { valid: false, message: 'Error validating coupon' };
  }
}

// -----------------------calculateDiscount------------------------
const calculateDiscount = (coupon, cartTotal) => {
    let discountAmount = 0;
  let description = '';
  
  if (coupon.discountType === 'percentage') {
    discountAmount = (cartTotal * coupon.discountValue) / 100;
    
    // Apply maximum discount cap if specified
    if (coupon.maxDiscountAmount > 0 && discountAmount > coupon.maxDiscountAmount) {
      discountAmount = coupon.maxDiscountAmount;
      description = `${coupon.discountValue}% off (capped at ₹${coupon.maxDiscountAmount})`;
    } else {
      description = `${coupon.discountValue}% off`;
    }
  } else if (coupon.discountType === 'fixed') {
    discountAmount = Math.min(coupon.discountValue, cartTotal);
    description = `₹${coupon.discountValue} off`;
    
  }
  
  return {
    discountAmount: Math.round(discountAmount * 100) / 100, // Round to 2 decimal places
    description: description
  };
};

function getCouponDescription(coupon) {
    const baseText = coupon.discountType === 'percentage' 
        ? `${coupon.discountValue}% discount`
        : `₹${coupon.discountValue} off`;
        
    const minText = coupon.minPurchaseAmount > 0 
        ? ` on orders above ₹${coupon.minPurchaseAmount}`
        : '';
        
    const maxText = coupon.maxDiscountAmount > 0 && coupon.discountType === 'percentage'
        ? ` (max ₹${coupon.maxDiscountAmount})`
        : '';
        
    return `${baseText}${minText}${maxText}`;
}



module.exports = { getAvailableCoupons, validateCoupon, calculateDiscount, validateCouponForUser, getCouponDescription}