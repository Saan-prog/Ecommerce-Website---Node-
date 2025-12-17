const Category = require("../models/categoryModel.js");
const subcategories = require("../models/subCategoryModel.js");
const mongoose = require('mongoose');



// --------------------------------------------Get Categories-----------------------------------------------------
const getAllCategories = async (req, res) => {
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

module.exports = { getAllCategories };