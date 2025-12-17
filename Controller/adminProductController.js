const Product = require("../models/productModel.js");
const Category = require("../models/categoryModel.js");
const Subcategories = require("../models/subCategoryModel.js");
const mongoose = require('mongoose');

// ------------------------------------------- List Products --------------------------------------------------
const listProducts = async (req, res) => {
    try {
        console.log('products loading');
        const { page = 1, limit = 9, search, category, priceRange, sort } = req.query;
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        // Build filter object
        let filter = { status: 'active', isAvailable: true };
        
        // Search filter
        if (search) {
            filter.name = { $regex: search, $options: 'i' };
        }

        // Category filter
        if (category) {
            filter.category = category;
        }

        // Price range filter
        if (priceRange) {
            const [minPrice, maxPrice] = priceRange.split('-').map(Number);
            filter.price = { $gte: minPrice, $lte: maxPrice };
        }

        // Build sort object
        let sortOptions = { createdAt: -1 };
        switch (sort) {
            case 'newest':
                sortOptions = { createdAt: -1 };
                break;
            case 'popular':
                sortOptions = { rating: -1 };
                break;
            case 'most-sale':
                sortOptions = { salesCount: -1 };
                break;
            default:
                sortOptions = { createdAt: -1 };
        }

        const [products, totalProducts] = await Promise.all([
            Product.find(filter)
                .select('name price image rating category subcategory status createdAt brand ')
                .sort(sortOptions)
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Product.countDocuments(filter)
        ]);

        const totalPages = Math.ceil(totalProducts / limitNum);
        res.status(200).json({ 
            success: true, 
            products, 
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
        console.error("Error fetching products:", error);
        res.status(500).json({
            success: false,
            message: 'Error fetching products'
        });
    }
}

// ----------------------------------------------- Get Product -----------------------------------------------------------
const getProduct = async (req, res) => {
    try {
        const productId = req.params.id;

        if(!productId || !mongoose.Types.ObjectId.isValid(productId)){
            return res.status(400).json({success: false, message: "Invalid Product id format"})
        }
        console.log("Fetching product Id", productId);

        const product = await Product.findById(productId);

        if(!product) {
            return res.status(404).json({success: false, message: "Product not found"});
        }

        return res.status(200).json({success: true, message: "Product Found", product});

    } catch (error) {
        console.log("Error fetching product by Id:", error);
        res.status(500).json({success: false, message: "Error while fetching products by id", error});
    }
}

// ----------------------------------------------Get Categories -----------------------------------------------------------
const getCategories = async (req, res) => {
    try {
        console.log("Fetching categories...");
        const categories = await Category.find({})
            
        
        console.log("Found categories:", categories.length);
        
        res.status(200).json({
            success: true,
            count: categories.length,
            categories
        });
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching categories",
            error: error.message
        });
    }
};

// ------------------------------------------------------------Get subcategories by category-----------------------------------------------
const getSubcategoriesByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        console.log("Fetching subcategories for category:", categoryId);
        
        // Validate category ID
        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid category ID"
            });
        }
        
        const subcategories = await Subcategories.find({ 
            category: categoryId
        }).select('name _id category description').sort({ name: 1 });
        
        console.log("Found subcategories:", subcategories.length);
        
        res.status(200).json({
            success: true,
            count: subcategories.length,
            subcategories
        });
    } catch (error) {
        console.error("Error fetching subcategories:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching subcategories",
            error: error.message
        });
    }
};
// ---------------------------------------------- Add Product ------------------------------------------------------------
const addProduct = async (req, res) => {
    try {
        console.log("📝 Add product called");
        console.log("👤 Full req.user:", req.user);
        // Authentication / Authorization
        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied, admin privilege required"
            });
        }

        // File validation
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one product image is required"
            });
        }

        // Max 5 images
        if (req.files.length > 5) {
            return res.status(400).json({
                success: false,
                message: "Maximum 5 images allowed per product"
            });
        }

        // Extract body data
        const { name, description, price, category, subcategory, brand, status, isAvailable } = req.body;

        // Simple validation
        if (!name || !price || !category || !subcategory) {
            return res.status(400).json({
                success: false,
                message: "Name, Price, Category and Subcategory are required"
            });
        }

        // Check category & subcategory existence
        const categoryExists = await Category.findById(category);
        const subcategoryExists = await Subcategories.findById(subcategory);

        if (!categoryExists) {
            return res.status(400).json({
                success: false,
                message: "Invalid category ID"
            });
        }

        if (!subcategoryExists) {
            return res.status(400).json({
                success: false,
                message: "Invalid subcategory ID"
            });
        }

        // Ensure subcategory belongs to the category
        if (subcategoryExists.category.toString() !== category.toString()) {
            return res.status(400).json({
                success: false,
                message: "Subcategory does not belong to the selected category"
            });
        }

        // Extract filenames only (matches schema)
        const images = req.files.map(file => file.filename);

        // Create product
        const newProduct = new Product({
            name: name.trim(),
            description: description?.trim() || "",
            price: parseFloat(price),
            category,
            subcategory,
            brand: brand?.trim() || "",
            status: status || "active",
            isAvailable: isAvailable === "true" || isAvailable === true,
            image: images,
            createdBy: req.user._id

        });

        // Validate against schema
        await newProduct.validate();

        // Save to DB
        const savedProduct = await newProduct.save();

        // Populate category/subcategory
        const populatedProduct = await Product.findById(savedProduct._id)
            .populate("category", "name")
            .populate("subcategory", "name")
            .populate("createdBy", "name email");

        // Convert to plain object
        const productResponse = populatedProduct.toObject();

        // Build full URLs for frontend
        productResponse.images = productResponse.image.map(filename => ({
            filename,
            url: `/uploads/${filename}`,
        }));

        return res.status(201).json({
            success: true,
            message: "Product added successfully",
            product: productResponse,
            imageCount: images.length
        });

    } catch (error) {
        console.error("Error adding product:", error);
        console.error("Error details:", error.message);
        console.error("Error stack:", error.stack);
        // Schema validation errors
        if (error.name === "ValidationError") {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: "Validation error",
                errors
            });
        }

        // Other errors
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// ---------------------------------------------- Update Product -----------------------------------------------------------
const updateProduct = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Access denied, admin privilege required"
            });
        }

        const { id } = req.params;
        const { name, description, price, category, subcategory, brand, status, isAvailable } = req.body;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID format"
            });
        }

        const existingProduct = await Product.findById(id);
        if (!existingProduct) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        const updateData = {};
        
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (price !== undefined) updateData.price = parseFloat(price);
        if (category !== undefined) updateData.category = category;
        if (subcategory !== undefined) updateData.subcategory = subcategory;
        if (brand !== undefined) updateData.brand = brand;
        if (status !== undefined) updateData.status = status;
        if (isAvailable !== undefined) updateData.isAvailable = isAvailable === 'true';

        // CRITICAL FIX: Handle image replacement
        if (req.files && req.files.length > 0) {
            console.log('Received new files:', req.files.length, 'files');
            
            // 1. Get new image paths
            const uploadedImages = req.files.map(file => 
                file.path.replace(/\\/g, '/')
            );
            
            // 2. Remove duplicates from new uploads
            const uniqueImages = [...new Set(uploadedImages)];
            
            // 3. Set ONLY the new images (REPLACE, not append)
            updateData.image = uniqueImages.slice(0, 5);
            
            console.log('Setting new images:', updateData.image);
            
            // 4. Optional: Delete old image files from server
            // (If you want to physically delete old files)
            if (existingProduct.image && existingProduct.image.length > 0) {
                const fs = require('fs').promises;
                const path = require('path');
                
                for (const oldImage of existingProduct.image) {
                    try {
                        const fullPath = path.join(__dirname, '..', oldImage);
                        await fs.unlink(fullPath);
                        console.log('Deleted old image:', oldImage);
                    } catch (err) {
                        console.log('Could not delete old image:', oldImage, err.message);
                        // Continue even if deletion fails
                    }
                }
            }
        } else {
            // If no new files, keep existing images
            updateData.image = existingProduct.image;
        }

        // Update the product
        const updatedProduct = await Product.findByIdAndUpdate(
            id,
            { $set: updateData },  // Use $set to explicitly set fields
            { 
                new: true,
                runValidators: true
            }
        );

        res.status(200).json({
            success: true,
            message: "Product updated successfully",
            product: updatedProduct
        });

    } catch (error) {
        console.error("Error updating product:", error);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: "Validation error",
                error: error.message
            });
        }
        
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID"
            });
        }

        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};
// ---------------------------------------------- Delete Product ------------------------------------------------------------
const deleteProduct = async (req, res) => {
    try {
        // Check if user is admin
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Access denied, admin privilege required"
            });
        }

        const { id } = req.params;

        // Validate product ID
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID format"
            });
        }

        // Check if product exists
        const existingProduct = await Product.findById(id);
        if (!existingProduct) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        // Optional: Check if product has associated orders before deleting
        // const hasOrders = await Order.exists({ 'items.product': id });
        // if (hasOrders) {
        //     return res.status(400).json({
        //         success: false,
        //         message: "Cannot delete product with existing orders. Consider archiving instead."
        //     });
        // }

        // Delete the product
        const deletedProduct = await Product.findByIdAndDelete(id);

        // Optional: Delete associated image file from server
        // if (deletedProduct.image && deletedProduct.image.startsWith('uploads/')) {
        //     const fs = require('fs');
        //     const path = require('path');
        //     const imagePath = path.join(__dirname, '..', deletedProduct.image);
        //     if (fs.existsSync(imagePath)) {
        //         fs.unlinkSync(imagePath);
        //     }
        // }

        res.status(200).json({
            success: true,
            message: "Product deleted successfully",
            product: {
                id: deletedProduct._id,
                name: deletedProduct.name
            }
        });

    } catch (error) {
        console.error("Error deleting product:", error);
        
        // Handle cast error (invalid ID)
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID"
            });
        }

        res.status(500).json({
            success: false,
            message: "Internal server error while deleting product",
            error: error.message
        });
    }
};




module.exports = { listProducts, getProduct, addProduct, getCategories, getSubcategoriesByCategory, updateProduct, deleteProduct };