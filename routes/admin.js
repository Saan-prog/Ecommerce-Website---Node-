const express = require ("express");
const router = express.Router();
const { adminLogin, getUsers, blockUser } = require ("../Controller/adminController.js");
const  { authenticate } = require("../middilewares/adminAuthMiddleware.js");
/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin authentication and management
 */

/**
 * @swagger
 * /api/admin/login:
 *   post:
 *     summary: Admin login
 *     description: Authenticate admin user and return JWT token
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 default: "admin@example.com"  
 *               password:
 *                 type: string
 *                 format: password
 *                 default: "admin123"         
 *     responses:
 *       200:
 *         description: Admin logged in successfully
 *       400:
 *         description: Invalid credentials or admin not found
 *       500:
 *         description: Internal server error
 */
/**
 * @swagger
 * /api/admin/products/addProduct:
 *   post:
 *     summary: Add a new product (Admin only)
 *     description: Create a new product in the system. Requires admin privileges and product image.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - price
 *               - image
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               category:
 *                 type: string
 *               brand:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *               isAvailable:
 *                 type: string
 *                 enum: [true, false]
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Product image file (JPEG, PNG)
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 product:
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         description: Bad request - Missing required fields or image
 *       403:
 *         description: Forbidden - Admin privileges required
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/admin/products/updateProduct/{id}:
 *   put:
 *     summary: Update a product (Admin only)
 *     description: Update an existing product. Requires admin privileges. All fields are optional - only provided fields will be updated.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         description: MongoDB Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Product name
 *               description:
 *                 type: string
 *                 description: Product description
 *               price:
 *                 type: number
 *                 description: Product price
 *               category:
 *                 type: string
 *                 description: Product category
 *               brand:
 *                 type: string
 *                 description: Product brand
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 description: Product status
 *               isAvailable:
 *                 type: string
 *                 enum: [true, false]
 *                 description: Product availability
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: New product image (optional - if not provided, current image is retained)
 *     responses:
 *       200:
 *         description: Product updated successfully
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
 *                   example: "Product updated successfully"
 *                 product:
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         description: Bad request - Invalid data or product ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Validation error"
 *                 error:
 *                   type: string
 *                   example: "Price must be a number"
 *       403:
 *         description: Forbidden - Admin privileges required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Access denied, admin privilege required"
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Product not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 *                 error:
 *                   type: string
 *                   example: "Database connection error"
 */

router.get("/login", (req, res) => {
  console.log("admin login page");
  res.send("Admin login route");
});

router.post("/login", adminLogin);

router.get("/users", authenticate, getUsers);
router.patch("/users/:id/block", authenticate, blockUser);



module.exports = router;