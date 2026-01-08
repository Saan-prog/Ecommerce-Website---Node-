const Cart = require('../models/cartModel');
const Product = require("../models/reviewModels.js");
const User = require("../models/userModel.js");

// Get user's cart with total amount
const getCart = async (req, res) => {
    try {
        // Your authentication middleware sets req.user._id, but also req.userId
        // Use req.user._id for consistency since that's what you're already using
        const userId = req.user._id;

        // Your auth middleware already validates the user exists, so we can proceed directly
        const cart = await Cart.findOne({ user: userId })
            .populate('items.product', 'name price image');
        
        if (!cart || cart.items.length === 0) {
            return res.json({
                success: true,
                cart: { 
                    _id: null,
                    items: [], 
                    total: 0,
                    totalItems: 0
                }
            });
        }

        // Calculate totals
        let total = 0;
        let totalItems = 0;

        cart.items.forEach(item => {
            // IMPORTANT: Add null check for item.product
            // The populate might return null if product was deleted
            if (item.product && item.product.price) {
                total += item.product.price * item.quantity;
                totalItems += item.quantity;
            }
        });

        // Filter out items with null products (deleted products)
        const validItems = cart.items.filter(item => item.product !== null);

        // If all items were invalid (all products deleted)
        if (validItems.length === 0) {
            // Optionally delete the empty cart
            await Cart.findOneAndDelete({ user: userId });
            
            return res.json({
                success: true,
                cart: { 
                    _id: null,
                    items: [], 
                    total: 0,
                    totalItems: 0
                }
            });
        }

        // Update cart if some items were filtered out
        if (validItems.length !== cart.items.length) {
            await Cart.findOneAndUpdate(
                { user: userId },
                { items: validItems.map(item => ({
                    product: item.product._id,
                    quantity: item.quantity,
                    size: item.size
                })) }
            );
        }

        res.json({
            success: true,
            cart: {
                _id: cart._id,
                items: validItems.map(item => ({
                    _id: item._id,
                    product: {
                        _id: item.product._id,
                        name: item.product.name,
                        price: item.product.price,
                        image: item.product.image
                    },
                    quantity: item.quantity,
                    size: item.size
                })),
                total: total,
                totalItems: totalItems
            }
        });
        
    } catch (error) {
        console.error("Error fetching cart:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching cart",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const addToCart = async (req, res) => {
    try {
        const { productId, quantity = 1, size } = req.body;
        const userId = req.user._id;

        // Find or create cart
        let cart = await Cart.findOne({ user: userId });

        if (!cart) {
            cart = new Cart({
                user: userId,
                items: [{ product: productId, quantity, size }]
            });
        } else {
            // Check if item exists
            const itemIndex = cart.items.findIndex(
                item => item.product.toString() === productId && item.size === size
            );

            if (itemIndex > -1) {
                // Update quantity
                cart.items[itemIndex].quantity += quantity;
            } else {
                // Add new item
                cart.items.push({ product: productId, quantity, size });
            }
        }

        await cart.save();

        res.status(200).json({
            success: true,
            message: "Added to cart",
            cart
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error adding to cart"
        });
    }
};

// cartController.js - Additional functions
const updateCartItem = async (req, res) => {
    try {
        const { productId } = req.params;
        const { quantity, size } = req.body;
        const userId = req.user._id;

        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }

        const itemIndex = cart.items.findIndex(
            item => item.product.toString() === productId && item.size === size
        );

        if (itemIndex === -1) {
            return res.status(404).json({ success: false, message: "Item not found in cart" });
        }

        cart.items[itemIndex].quantity = quantity;
        await cart.save();

        res.json({ success: true, message: "Quantity updated", cart });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error updating cart" });
    }
};

const removeCartItem = async (req, res) => {
    try {
        const { productId } = req.params;
        const { size } = req.query; // Get size from query parameter
        const userId = req.user._id;

        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }

        cart.items = cart.items.filter(
            item => !(item.product.toString() === productId && item.size === size)
        );

        await cart.save();

        res.json({ success: true, message: "Item removed", cart });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error removing item" });
    }
};

const clearCart = async (req, res) => {
    try {
        const userId = req.user._id;
        
        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }

        cart.items = [];
        await cart.save();

        res.json({ success: true, message: "Cart cleared", cart: { items: [] } });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error clearing cart" });
    }
};

module.exports = {
    getCart,
    addToCart,
    updateCartItem,
    removeCartItem,
    clearCart
};
