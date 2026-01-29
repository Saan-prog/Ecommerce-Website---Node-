const Wishlist = require("../models/wishlistModel.js");
const Product = require("../models/productModel.js");
const mongoose = require("mongoose");

const getWishlist = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "User not found login again" });
    }

    // Your auth middleware already validates the user exists, so we can proceed directly
    const wishlist = await Wishlist.findOne({ user: userId }).populate({
      path: "products",
      select: "name price image description category",
    });

    if (!wishlist) {
      return res.json({
        success: true,
        message: "Wishlist is empty",
        data: {
          _id: null,
          products: [],
          updatedAt: new Date(),
          productCount: 0,
        },
      });
    }

    // Filter out items with null products (deleted products)
    const validProducts = wishlist.products.filter(
      (product) => product !== null
    );

    // If all items were invalid (all products deleted)
    if (validProducts.length !== wishlist.products.length) {
      // Optionally delete the empty cart
      await Wishlist.findByIdAndUpdate(wishlist._id, {
        products: validProducts.map((p) => p._id),
        updateAt: Date.now(),
      });
    }

    const formattedProducts = validProducts.map((product) => ({
      _id: product._id,
      name: product.name,
      price: product.price,
      images: product.image || [],
      description: product.description,
      category: product.category,
    }));

    res.json({
      success: true,
      message: "Wishlist retrieved successfully",
      data: {
        _id: wishlist._id,
        products: formattedProducts,
        updatedAt: wishlist.updatedAt,
        productCount: formattedProducts.length,
      },
    });
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching wishlist",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// -----------------------------------------------------------Add to wishlist ------------------------------------------------------------

const addToWishlist = async (req, res) => {
    console.log("🚀 addToWishlist function CALLED");
    console.log("📋 Full request:", {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
    user: req.user
  });
  try {
    const { productId } = req.body;
    const userId = req.user._id;
    const WISHLIST_LIMIT = 20;
     console.log("productid",productId);
    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "User not found login again" });
    }
    

    const product = await Product.findById(productId);
      console.log("🔍 DEBUG - Product found:", product);

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    let wishlist = await Wishlist.findOne({ user: userId });

    if (!wishlist) {
      wishlist = new Wishlist({
        user: userId,
        products: [productId],
        updatedAt: new Date(),
      });
      console.log("wishlist",wishlist)
      await wishlist.save();

      return res.status(200).json({
        success: true,
        message: "Product added to wishlist",
        data: {
          added: true,
          wishlistCount: 1,
          isFull: false,
        },
      });
    }

    const alreadyInWishlist = wishlist.products.some(
  p => p.toString() === productId.toString()
);

        
    if (alreadyInWishlist) {
      return res.status(200).json({
        success: true,
        message: "Product already in wishlist",
        data: {
          added: false,
          wishlistCount: wishlist.products.length,
          isFull: wishlist.products.length >= WISHLIST_LIMIT,
        },
      });
    }

    if (wishlist.products.length >= WISHLIST_LIMIT) {
      return res.status(400).json({
        success: false,
        message: `Wishlist is full (${WISHLIST_LIMIT} items max). Remove few items first`,
        data: {
          added: false,
          wishlistCount: WISHLIST_LIMIT,
          isFull: true,
        },
      });
    }

    wishlist.products.push(productId);
    wishlist.updatedAt = new Date();
    await wishlist.save();

    res.status(200).json({
      success: true,
      message: "product added to wishlist",
      data: {
        added: true,
        wishlistCount: wishlist.products.length,
        isFull: wishlist.products.length >= WISHLIST_LIMIT,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to add to wishlist",
    });
  }
};

// ----------------------------------------------------------- Remove from Wishlist ---------------------------------------------------------------
const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user._id;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Valid Product ID is required"
      });
    }

    const productObjectId = new mongoose.Types.ObjectId(productId);

    const wishlist = await Wishlist.findOne({ user: userId });

    if (!wishlist) {
      return res.status(200).json({
        success: true,
        message: "No wishlist found for user",
        data: { removed: false, wishlistCount: 0 }
      });
    }

    const beforeCount = wishlist.products.length;

    wishlist.products = wishlist.products.filter(
      p => p.toString() !== productId.toString()
    );

    if (wishlist.products.length === beforeCount) {
      return res.status(200).json({
        success: true,
        message: "Product was not in your wishlist",
        data: {
          removed: false,
          wishlistCount: wishlist.products.length
        }
      });
    }

    wishlist.updatedAt = new Date();

    if (wishlist.products.length === 0) {
      await Wishlist.findByIdAndDelete(wishlist._id);
      return res.status(200).json({
        success: true,
        message: "Product removed and wishlist deleted (empty)",
        data: {
          removed: true,
          wishlistCount: 0,
          isEmpty: true
        }
      });
    }

    await wishlist.save();

    return res.status(200).json({
      success: true,
      message: "Product removed from wishlist",
      data: {
        removed: true,
        wishlistCount: wishlist.products.length,
        isEmpty: false
      }
    });

  } catch (error) {
    console.error("❌ Error removing from wishlist:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove from wishlist",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


module.exports = { getWishlist, addToWishlist, removeFromWishlist }