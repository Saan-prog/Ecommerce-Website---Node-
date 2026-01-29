const express = require("express");
const router = express.Router();
const {listProducts, getProduct, getReviews} = require("../Controller/userProductController.js");


/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: List all active & available products
 *     tags: [Product]
 *     description: Returns paginated products filtered by active & available status.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 9
 *         description: Number of products per page
 *     responses:
 *       200:
 *         description: List of products with pagination details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 products:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                       example: 1
 *                     totalPages:
 *                       type: integer
 *                       example: 5
 *                     ProductsPerPage:
 *                       type: integer
 *                       example: 9
 *                     hasNextPage:
 *                       type: boolean
 *                       example: true
 *                     hasPrevPage:
 *                       type: boolean
 *                       example: false
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Product]
 *     description: Returns a single product using its MongoDB ObjectId.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: MongoDB product ID
 *         schema:
 *           type: string
 *           example: 67a10ef5f82b223344aa1234
 *     responses:
 *       200:
 *         description: Product retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Product Found
 *                 product:
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         description: Invalid product ID format
 *       404:
 *         description: Product not found
 *       500:
 *         description: Internal server error
 */

router.get("/", listProducts);
router.get("/:id", getProduct);
router.get("/:id/reviews", getReviews)


module.exports = router;