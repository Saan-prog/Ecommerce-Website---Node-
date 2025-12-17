const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Admin = require("../models/adminModel.js");
const product = require("../models/productModel.js");
const Order = require("../models/orderModel.js");
const User = require("../models/userModel.js");

// ........ Admin Login .................

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin)
      return res
        .status(400)
        .json({ success: false, message: "Admin not found" });
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch)
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    
        const token = jwt.sign(
      { id: admin._id, 
        role: "admin" }, // include role in payload
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );
    // localStorage.setItem("adminToken", response.token);
    res.json({
      success: true,
      adminId: admin._id,
      token,
      adminName: admin.name || "Admin",
      message: "Admin Logined Successfully",
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Login failed", err_msg: err.message });
  }
};

// ----------------------------------Get Dashboard ----------------------------------------
const showDashboard = async (req, res) => {
  console.log("🎯 showDashboard function CALLED");
  console.log("Models loaded:", {
    User: typeof User,
    Order: typeof Order,
    product: typeof product, // ✅ FIXED: Changed Product to product
  });

  try {
    // 1. authentication check
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required",
      });
    }

    // 2. get current date ranges for calculation
    const today = new Date();
    const startOfToday = new Date(today);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // 3. execute all database queries in parallel for better performance
    const [
      totalOrders,
      totalCustomers,
      totalProducts,
      totalRevenue,
      todayOrders,
      weeklyRevenue,
      monthlyRevenue,
      recentOrders,
      lowStockProducts,
    ] = await Promise.all([
      // total counts
      Order.countDocuments(),
      User.countDocuments({ role: "user" }),
      // ✅ FIXED: Corrected typo
      product.countDocuments(),

      Order.aggregate([
        { $match: { status: "completed" } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),

      Order.countDocuments({ createdAt: { $gte: startOfToday } }),

      Order.aggregate([
        { $match: { status: "completed", createdAt: { $gte: startOfWeek } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),

      Order.aggregate([
        { $match: { status: "completed", createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),

      Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("user", "name email")
        .lean(),

      // ✅ FIXED: Use the correct variable name (product)
      product.countDocuments({ stock: { $lt: 10 } }),
    ]);

    const statistics = {
      totalOrders,
      totalCustomers,
      totalProducts,
      totalRevenue: totalRevenue[0]?.total || 0,
      todayOrders,
      weeklyRevenue: weeklyRevenue[0]?.total || 0,
      monthlyRevenue: monthlyRevenue[0]?.total || 0,
      lowStockProducts,
    };

    console.log("📊 Dashboard statistics:", statistics);

    res.json({
      success: true,
      data: {
        statistics,
        recentOrders,
        // Add any other data you want to send
      },
      message: "Dashboard data fetched successfully",
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard statistics",
    });
  }
};
// -------------------------Admin Dashboard----------------------------------

const getUsers = async (req, res) => {
  try {
    // 1.authentication check
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin previlages requied",
      });
    }

    // 2. extract and validate query parameters
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "",
      role = "",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;
    // validate pagination parameters
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(20, Math.max(1, parseInt(limit)));

    const sortDirection = sortOrder === "asc" ? 1 : -1;

    // database query to fetch data
    let query = {};

    // search filter (name, email, or customer id)

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { userId: { $regex: search, $options: "i" } },
      ];
    }

    // status filter(blocked, pending, active)
    if (status && ["active", "blocked", "pending"].includes(status)) {
      query.status = status;
    }

    // Role filter
    if (role && ["user", "admin"].includes(role)) {
      query.role = role;
    }

    // sort configuration
    const sortConfig = {};
    sortConfig[sortBy] = sortDirection;
    //  4.execute queries
    // Get total count for pagination (without filter for statistics)
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: "active" });
    const blockedusers = await User.countDocuments({ status: "blocked" });
    const pendingUsers = await User.countDocuments({ status: "pending" });

    // get filtered count for current query
    const filteredCount = await User.countDocuments(query);

    // Calculate pagination
    const totalPages = Math.ceil(filteredCount / limitNum);
    const skip = (pageNum - 1) * limitNum;

    // Get users with pagination and sorting
    const users = await User.find(query)
      .select("-password -__v") //exlude sensitive fields
      .sort(sortConfig)
      .skip(skip)
      .limit(limitNum)
      .lean(); //return to plain js objects

    // 5. format response
    // Transform user data

    const formattedUsers = users.map((user) => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      orderCount: user.orders ? user.orders.length : 0,
      userId: user.userId || `USR-${user._id.toString().slice(-6)}`,
    }));

    const response = {
      success: true,
      users: formattedUsers,
      statistics: {
        total: totalUsers,
        active: activeUsers,
        blocked: blockedusers,
        pending: pendingUsers,
      },
      pagination: {
        currentPage: pageNum,
        totalPages: totalPages,
        totalUsers: filteredCount,
        usersPerPage: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    };
    res.status(200).json(response);
  } catch (error) {
    console.error("Admin getUsers error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching users",
    });
  }
};

const blockUser = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied, admin previlage required",
      });
    }

    const { id: userId } = req.params;
    const { isBlocked, reason } = req.body;
    console.log(
      `Processing request: User ${userId}, isBlocked: ${isBlocked}, reason: ${reason}`
    );

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid userId" });
    }

    if (typeof isBlocked !== "boolean") {
      return res.status(400).json({
        success: false,
        message:
          "Missing or invalid isBlocked parameter. Must be boolean (true/false)",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    user.status = isBlocked ? "blocked" : "active";
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${isBlocked ? "blocked" : "unblocked"} successfully`,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Block user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
module.exports = { adminLogin, showDashboard, getUsers, blockUser };
