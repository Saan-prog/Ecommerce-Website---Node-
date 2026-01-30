const Product = require("../models/productModel");
const Category = require("../models/categoryModel");
const Subcategory = require("../models/subCategoryModel");

const searchproducts = async(req, res) => {
    try {
        const { query } = req.params;

        if(!query || query.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }

        const searchText = query.trim();

        const categories = await Category.find({
            name: { $regex: searchText, $options: 'i'}
        }).select('_id');

        const subcategories = await Subcategory.find({
            name: {$regex: searchText, $options: 'i'}
        }).select('_id');

        const categoryIds = categories.map(c => c._id);
        const subcategoryIds = subcategories.map(s => s._id);

        const products = await Product.find({
            status: 'active',
            isAvailable: true,
            $or: [
                { name: { $regex: searchText, $options: 'i'} },
                { category: { $in: categoryIds } },
                { subcategory: { $in: subcategoryIds } }
            ]
        })
        .populate('category', 'name')
        .populate('subcategory', 'name')
        .lean();

        res.status(200).json({
            success: true,
            totalResults: products.length,
            products
        });
    } catch (error) {
    console.error('Search Error:', error);
    res.status(500).json({
    success: false,
    message: 'Internal server error'
    });
    }
}

module.exports = { searchproducts };