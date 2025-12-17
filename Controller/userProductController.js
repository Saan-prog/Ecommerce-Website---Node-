const Product = require("../models/productModel.js");
const mongoose = require('mongoose');
const path = require('path');

// ------------------------------------------- List Products --------------------------------------------------
const listProducts = async (req, res) => {
    try {
        console.log('products loading');
        const { page = 1, limit = 9 } = req.query;
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        const [products, totalProducts] = await Promise.all([
            Product.find({ status: 'active', isAvailable: true })
                .select('name price image rating description brand')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Product.countDocuments({ status: 'active', isAvailable: true })
        ]);

        // Transform products to include full image URL
        const transformedProducts = products.map(product => {
            // Get the first image from the image array
            let imageFilename = '';
            
            if (product.image && Array.isArray(product.image) && product.image.length > 0) {
                imageFilename = product.image[0];
            }
            
            // DEBUG: Log what's in the database
            console.log(`Product: ${product.name}, Image array: ${JSON.stringify(product.image)}, First image: ${imageFilename}`);
            
            // Create full image URL - FIXED: Check if filename already has path
            let imageUrl = '/img/product-1.jpg'; // Default
            
            if (imageFilename) {
                // Check if filename already contains 'uploads/'
                if (imageFilename.includes('uploads/')) {
                    // Remove any duplicate 'uploads/' prefix and ensure single slash
                    imageFilename = imageFilename.replace(/^\/?uploads\//, '');
                    imageUrl = `/uploads/${imageFilename}`;
                } else if (imageFilename.startsWith('/')) {
                    // If it already starts with /, use as is
                    imageUrl = imageFilename;
                } else {
                    // Otherwise, add /uploads/ prefix
                    imageUrl = `/uploads/${imageFilename}`;
                }
            }
            
            console.log(`Final image URL: ${imageUrl}`);
            
            return {
                ...product,
                image: imageUrl
            };
        });

        const totalPages = Math.ceil(totalProducts / limitNum);
        
        res.status(200).json({ 
            success: true, 
            products: transformedProducts, 
            pagination: {
                currentPage: pageNum,
                totalPages,
                productsPerPage: limitNum,
                totalProducts,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1
            } 
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching products'
        });
    }
};

// ----------------------------------------------- Get Product -----------------------------------------------------------
const getProduct = async (req, res) => {
    try {
        const productId = req.params.id;

        if(!productId || !mongoose.Types.ObjectId.isValid(productId)){
            return res.status(400).json({success: false, message: "Invalid Product id format"})
        }
        console.log("Fetching product Id",productId);

        const product = await Product.findById(req.params.id)
      .populate('category', 'name'); 

        if(!product) {
            return res.status(404).json({success: false, message: "Product not found"});
        }

        return res.status(200).json({success: true, message: "Product Found", product});

    } catch (error) {
        console.log("Error fetching product by Id");
        res.status(500).json({success: false, message: "Error while fetching products by id", error});
    }
}


module.exports = { listProducts, getProduct };