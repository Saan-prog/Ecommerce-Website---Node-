const express = require("express");
const { testLogs, userSignup, userLogin, forgotPassword, 
        resetPassword, getUserProfile, updateUserProfile, 
        getUserAddresses, createAddress, editAddresses, 
        removeAddresses } = require("../Controller/userController.js");
const { searchproducts } = require("../Controller/userSearchController");
const verifyToken  = require("../middilewares/authMiddleware.js");
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: User
 *   description: User authentication and account management
 */

/**
 * @swagger
 * /api/user/signup:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user account in the ShopStyle application.
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserSignup'
 *     responses:
 *       201:
 *         description: User successfully registered
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Signup successful. Please login.
 *       400:
 *         description: Email already registered
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/user/login:
 *   post:
 *     summary: Authenticate user and create session
 *     description: Logs in an existing user by validating email and password.
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserLogin'
 *     responses:
 *       200:
 *         description: Login successful, returns JWT/session token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserLogin'
 *       400:
 *         description: Invalid email or password
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/user/forgot-password:
 *   post:
 *     summary: Request a password reset link
 *     description: Sends a password reset link to the user's registered email.
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserEmail'
 *     responses:
 *       200:
 *         description: Success message (same response even if the email doesn't exist, for security reasons)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "If an account with that email exists, a password reset link has been sent."
 *                 resetLink:
 *                   type: string
 *                   example: "http://localhost:8070/reset-password.html?token=abc123xyz&user=60b8f8b4c9f1a33a4d9f25a1"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Server error. Please try again."
 *                 error:
 *                   type: string
 *                   example: "Cannot read property 'email' of undefined"
 */
/**
 * @swagger
 * /api/user/reset-password:
 *   post:
 *     summary: Reset a user's password
 *     description: Allows a user to reset their password using the token sent to their email.
 *     tags:
 *       - User
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserEmail'
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Password reset successful. You can now login with your new password.
 *       400:
 *         description: Invalid input or password mismatch
 *       401:
 *         description: Invalid or expired reset token
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */


/**
 * @swagger
 * /api/user/profile:
 *   get:
 *     summary: Get user profile
 *     description: Returns the profile details of the currently authenticated user.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserSignup'
 *       401:
 *         description: Unauthorized or invalid token
 */

/**
 * @swagger
 * /api/user/profile:
 *   put:
 *     summary: Update user profile
 *     description: Updates the profile details of the currently authenticated user.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserSignup'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/UserSignup'
 *                 message:
 *                   type: string
 *                   example: "Profile updated successfully"
 *       401:
 *         description: Unauthorized or invalid token
 *       404:
 *         description: User not found
 */
/**
 * @swagger
 * /api/user/addresses:
 *   get:
 *     summary: Get user addresses
 *     description: Returns all addresses associated with the currently authenticated user.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user addresses
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/UserAddress'
 *       401:
 *         description: Unauthorized or invalid token
 *       500:
 *         description: Server error
 */

router.get("/test-logs", testLogs);
router.post("/login", userLogin);
router.post("/signup", userSignup );

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.get("/profile", verifyToken, getUserProfile);
router.put("/profile", verifyToken, updateUserProfile);
router.get("/addresses", verifyToken, getUserAddresses);
router.post("/addresses", verifyToken, createAddress);
router.put("/addresses/:id", verifyToken, editAddresses);
router.delete("/addresses/:id", verifyToken, removeAddresses);

router.get("/search/:query", searchproducts);


module.exports = router;

