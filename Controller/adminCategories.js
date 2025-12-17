const Product = require("../models/productModel.js");
const Category = require("../models/categoryModel.js");
const Subcategories = require("../models/subCategoryModel.js");
const mongoose = require('mongoose');

// ------------------------------------- Get All Categories ------------------------------------
// Update getCategories function in adminCategories.js
const getCategories = async (req, res) => {
    try {
        // Use aggregation to get categories with subcategory counts
        const categories = await Category.aggregate([
            {
                $lookup: {
                    from: 'subcategories', 
                    localField: '_id', 
                    foreignField: 'category', 
                    as: 'subcategories'
                }
            },
            {
                $addFields: {
                    subcategoriesCount: { $size: '$subcategories' }
                }
            },
            {
                $project: {
                    __v: 0
                }
            },
            {
                $sort: { name: 1 }
            }
        ]);

        res.json({
            success: true,
            count: categories.length,
            data: categories,
        });

    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching categories',
            error: error.message
        });
    }
};

// ----------------------------------------------------  Add New Category---------------------------------------
const addNewCategory = async( req, res) => {
    try {
        if(!req.user || req.user.role !== 'admin'){
            return res.status(403).json({success: false, message: "Access denied, admin previlage required"});
        }
        
        const { name, description } = req.body;

        const newCategory = new Category({
            name,
            description,
        });

        const saveCategory = await newCategory.save();

        res.status(201).json({
            success: true,
            message: "Category added successfully",
            category: saveCategory
        });
        
    } catch (error) {
        console.error("Error adding product:", error);
        res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message
        });
    }
}

//  ------------------------------------------------- Update Category ----------------------------------------------------
const updateCategory = async(req, res) => {
    try {
         if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Access denied, admin privilege required"
            });
        }
        const { id } = req.params;
        const { name, description } = req.body;

        
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID format"
            });
        }

        const existingCategory = await Category.findById(id);
        if (!existingCategory) {
            return res.status(404).json({
                success: false,
                message: "Category not found"
            });
        }

         const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;

        const updatedCategory = await Category.findByIdAndUpdate(
            id,
            updateData,
            { 
                new: true,
                runValidators: true
            }
        );

         res.status(200).json({
            success: true,
            message: "Category updated successfully",
            category: updatedCategory
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
                message: "Invalid category ID"
            });
        }

        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

// ---------------------------------------------------- Delete Category -------------------------------------------------------------
const deleteCategory = async (req, res) => {
    try {
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

        const existingCategory = await Category.findById(id);
        if (!existingCategory) {
            return res.status(404).json({
                success: false,
                message: "Category not found"
            });
        }
        const deletedCategory = await Category.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: "Category deleted successfully",
            category: {
                id: deletedCategory._id,
                name: deletedCategory.name
            }
        });
    } catch (error) {
        console.error("Error deleting product:", error);
        
        // Handle cast error (invalid ID)
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: "Invalid category ID"
            });
        }

        res.status(500).json({
            success: false,
            message: "Internal server error while deleting product",
            error: error.message
        });
    }
}

// ---------------------------------------------------- Get Subcategories -------------------------------------------------------------

const getSubcategories = async (req, res) => {
    try {
        console.log('Fetching categories with subcategory counts...');
        
        // First, let's see what collections exist
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Available collections:', collections.map(c => c.name));
        
        // Test: Count total subcategories
        const totalSubcategories = await Subcategories.countDocuments();
        console.log('Total subcategories in database:', totalSubcategories);
        
        // Test: Get first few subcategories to see their structure
        const sampleSubcategories = await Subcategories.find().limit(3);
        console.log('Sample subcategories:', sampleSubcategories);
        
        // Now run the aggregation
        const categories = await Category.aggregate([
            {
                $lookup: {
                    from: 'subcategories', 
                    localField: '_id', 
                    foreignField: 'category', 
                    as: 'subcategories'
                }
            },
            {
                $addFields: {
                    subcategoriesCount: { 
                        $cond: {
                            if: { $isArray: "$subcategories" },
                            then: { $size: "$subcategories" },
                            else: 0
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    description: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    subcategoriesCount: 1,
                    subcategories: 1 // Keep for debugging
                }
            },
            {
                $sort: { name: 1 }
            }
        ]);

        // Debug: Check what we got
        console.log(`Found ${categories.length} categories`);
        categories.forEach((cat, index) => {
            console.log(`${index + 1}. ${cat.name}: ${cat.subcategoriesCount} subcategories`);
            if (cat.subcategories && cat.subcategories.length > 0) {
                console.log(`   Subcategory IDs:`, cat.subcategories.map(s => s._id));
            }
        });

        // Remove subcategories array from final response if not needed
        const finalCategories = categories.map(cat => {
            const { subcategories, ...rest } = cat;
            return rest;
        });

        res.status(200).json({
            success: true,
            count: finalCategories.length,
            data: finalCategories,
            debug: {
                totalSubcategories,
                collectionNames: collections.map(c => c.name),
                sampleSubcategoryCount: sampleSubcategories.length
            }
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching categories',
            error: error.message
        });
    }
};

// --------------------------------------------------- Get Subcategories BY Category Id --------------------------------------
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

// -------------------------------------------------------- Add Subcategory ----------------------------------------------------
const createSubcategory = async (req, res) => {
  try {
    const { name, description, categoryId } = req.body;

    if (!name || !categoryId) {
      return res.status(400).json({
        success: false,
        message: "Subcategory name and category are required"
      });
    }

    const subcategory = await Subcategories.create({
      name,
      description,
      category: categoryId
    });

    res.status(201).json({
      success: true,
      message: "Subcategory created successfully",
      data: subcategory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create subcategory",
      error: error.message
    });
  }
};

module.exports = { getCategories, addNewCategory, updateCategory, 
                    deleteCategory, getSubcategories, getSubcategoriesByCategory, 
                    createSubcategory};