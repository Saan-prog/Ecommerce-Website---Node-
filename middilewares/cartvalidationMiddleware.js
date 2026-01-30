const Cart = require("../models/cartModel");



// Middleware to check cart before checkout
const validateCartBeforeCheckout = async (req, res, next) => {
    try {
        const { cartId } = req.body;
        const userId = req.user._id;

        if (!cartId) {
            return next(); // Let the main controller handle missing cartId
        }

        const cart = await Cart.findById(cartId);
        
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        // Check if cart belongs to user
        if (cart.user.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized access to cart'
            });
        }

        // Check if cart is already ordered
        if (cart.status === 'ordered' || cart.status === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'This cart has already been ordered',
                errorCode: 'CART_ALREADY_ORDERED'
            });
        }

        // Check if cart has items
        if (!cart.items || cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot checkout with empty cart',
                errorCode: 'EMPTY_CART'
            });
        }

        next();
    } catch (error) {
        console.error('Cart validation error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during cart validation'
        });
    }
};

// Use it in your route
module.exports =  validateCartBeforeCheckout;