const mongoose = require("mongoose");
const Order = require("../models/orderModel.js");
const User = require("../models/userModel.js");
const Product = require("../models/productModel.js");

const ORDER_STATUSES = [
  "CREATED",
  "CONFIRMED",
  "SHIPPED", 
  "OUT FOR DELIVERY",
  "DELIVERED",
  "CANCELLED"
];
// --------------------------------ShowDashboard----------------------------------------------------
const showDashboard = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can access dashboard"
      });
    }

    // Get basic counts
    const totalOrders = await Order.countDocuments();
    const totalCustomers = await User.countDocuments({ role: "user" });
    const totalProducts = await Product.countDocuments();
    
    // Get revenue from DELIVERED orders
    const revenueResult = await Order.aggregate([
      { $match: { status: "DELIVERED" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);
    
    const totalRevenue = revenueResult[0]?.total || 0;
    
    // Get recent orders
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("user", "name email")
      .lean();

    res.json({
      success: true,
      data: {
        statistics: {
          totalOrders,
          totalCustomers,
          totalProducts,
          totalRevenue
        },
        recentOrders: recentOrders.map(order => ({
          _id: order._id,
          orderId: `ORD-${order._id.toString().slice(-6).toUpperCase()}`,
          customer: order.user?.name || 'Guest',
          date: new Date(order.createdAt).toLocaleDateString(),
          amount: order.totalAmount || 0,
          status: order.status || 'CREATED',
          formattedAmount: `₹${order.totalAmount?.toFixed(2) || '0.00'}`
        }))
      }
    });

  } catch (error) {
    console.error("❌ Dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong"
    });
  }
};

// ------------------------------------------------------Sales Analytics-------------------------------------------------
const salesAnalytics = async (req, res) => {
    try {
        // 1. Authentication check
        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Access Denied"
            });
        }

        // 2. Parse period parameter
        const { period = '30d' } = req.params;
        let days = 30;

        if (period === '7d') days = 7;
        else if (period === '90d') days = 90;
        else if (period === '1y') days = 365;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // 3. Fetch sales data
        const salesData = await Order.aggregate([
            {
                $match: {
                    status: "DELIVERED",
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                    },
                    revenue: { $sum: "$totalAmount" },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // 4. Prepare chart data
        const labels = [];
        const revenueData = [];
        const ordersData = [];

        // Create data for each day
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i); // Fix: Changed from -1 to -i
            
            const dateStr = date.toISOString().split('T')[0];
            
            // Format for display (e.g., "Jan 25")
            const formattedDate = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });

            labels.push(formattedDate);

            // Find matching sales data for this date
            const dayData = salesData.find(item => item._id === dateStr);
            revenueData.push(dayData?.revenue || 0);
            ordersData.push(dayData?.orders || 0);
        }

        // Calculate totals
        const totalRevenue = revenueData.reduce((a, b) => a + b, 0);
        const totalOrders = salesData.reduce((sum, item) => sum + item.orders, 0);

        // 5. Send SINGLE response (OUTSIDE the loop!)
        return res.json({
            success: true,
            period,
            sales: {
                labels,
                revenueData,
                ordersData,
                totalRevenue,
                totalOrders,
                averageOrderValue: totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0
            },
            trends: {
                growth: calculateGrowth(salesData),
                avgOrderValue: calculateAvgOrderValue(salesData)
            }
        });

    } catch (error) {
        console.error("❌ Sales analytics error:", error);
        return res.status(500).json({
            success: false,
            message: "Error fetching sales analytics",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

function calculateGrowth(data) {
  if (data.length < 2) return 0;
  const firstWeek = data.slice(0, 7).reduce((sum, item) => sum + item.revenue, 0);
  const lastWeek = data.slice(-7).reduce((sum, item) => sum + item.revenue, 0);
  return lastWeek > 0 ? ((lastWeek - firstWeek) / firstWeek * 100).toFixed(1) : 0;
}

function calculateAvgOrderValue(data) {
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  const totalOrders = data.reduce((sum, item) => sum + item.orders, 0);
  return totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0;
}

// ------------------------------------------------------------------- constumer insighnt controller------------------------------------------------------
const getCutomerInsight = async(req, res) => {
    try {
       if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }
    
    const { period = '90d' } = req.params;
    let days = 90;
    if (period === '30d') days = 30;
    if (period === '1y') days = 365;
    if (period === '7d') days = 7; 

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

     const customerData = await User.aggregate([
      {
        $match: {
          role: "user",
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const repeatCustomers = await Order.aggregate([
      {
        $match: {
          status: "DELIVERED",
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: "$user",
          orderCount: { $sum: 1 }
        }
      },
      {
        $match: {
          orderCount: { $gt: 1 }
        }
      }
    ]);
// prepare label data
    const labels = [];
    const data = [];
// generate labels based on period

if(days <= 30) {
    for(let i = days -1; i >= 0; i--){
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('en-US', {
            month: 'short',
            day:'numeric'
        }));
    }
}else{
    for (let i = Math.floor(days/30) - 1; i >= 0; i--){
        const date = new Date();
        date.setMonth(date.getMonth()-i);
        labels.push(date.toLocaleDateString('en-US', { month: 'short'}));
    }
}
 if (days <= 30) {
      // Daily data for short periods
      const dailyData = await getDailyCustomerData(startDate);
      labels.forEach((label, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (days - 1 - index));
        const dateStr = date.toISOString().split('T')[0];
        data.push(dailyData[dateStr] || 0);
      });
    }else{
        // Monthly data for longer periods
      labels.forEach(month => {
        const monthData = customerData.find(item => {
          const itemMonth = new Date(item._id + '-01').toLocaleDateString('en-US', { month: 'short' });
          return itemMonth === month;
        });
        data.push(monthData?.count || 0);
      });
    }
    res.json({
      success: true,
      period: period, // Include the period in response
      insights: {
        customerGrowth: {
          labels,
          data,
          totalNewCustomers: data.reduce((a, b) => a + b, 0),
          period: `${days} days`
        },
        segmentation: {
          newCustomers: data[data.length - 1] || 0,
          repeatCustomers: repeatCustomers.length,
          totalCustomers: await User.countDocuments({ role: "user" })
        },
        conversionRate: await calculateConversionRate()
      }
    });
    } catch (error) {
      console.error("❌ Customer insights error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching customer insights",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });  
    }
}
async function getDailyCustomerData(startDate) {
  const dailyData = await User.aggregate([
    {
      $match: {
        role: "user",
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const result = {};
  dailyData.forEach(item => {
    result[item._id] = item.count;
  });
  return result;
}

async function calculateConversionRate() {
  const totalCustomers = await User.countDocuments({ role: "user" });
  const ordersWithCustomers = await Order.distinct("user");
  return totalCustomers > 0 ? ((ordersWithCustomers.length / totalCustomers) * 100).toFixed(1) : 0;
}

// -----------------------------------------------------------------product Data-------------------------------------------

const getProductPerformance = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Use URL params
    const { period = '30d' } = req.params;
    let days = 30;
    
    if (period === '7d') days = 7;
    if (period === '90d') days = 90;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // SIMPLE QUERY WITHOUT FACET (just what we need)
    const topProducts = await Order.aggregate([
      {
        $match: {
          status: "DELIVERED",
          createdAt: { $gte: startDate }
        }
      },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      { $unwind: "$productDetails" },
      {
        $lookup: {
          from: "categories",
          localField: "productDetails.category",
          foreignField: "_id",
          as: "categoryInfo"
        }
      },
      { $unwind: { path: "$categoryInfo", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$productDetails._id",
          name: { $first: "$productDetails.name" },
          categoryName: { $first: "$categoryInfo.name" || "Uncategorized" },
          revenue: { 
            $sum: { 
              $multiply: ["$items.price", "$items.quantity"] 
            } 
          },
          sales: { $sum: "$items.quantity" },
          stockStatus: { $first: "$productDetails.status" }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ]);

    // Category performance query
    const categoryPerformance = await Order.aggregate([
      {
        $match: {
          status: "DELIVERED",
          createdAt: { $gte: startDate }
        }
      },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      { $unwind: "$productDetails" },
      {
        $lookup: {
          from: "categories",
          localField: "productDetails.category",
          foreignField: "_id",
          as: "categoryInfo"
        }
      },
      { $unwind: { path: "$categoryInfo", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$categoryInfo._id",
          categoryName: { $first: "$categoryInfo.name" || "Uncategorized" },
          revenue: { 
            $sum: { 
              $multiply: ["$items.price", "$items.quantity"] 
            } 
          },
          productCount: { $addToSet: "$productDetails._id" },
          totalSales: { $sum: "$items.quantity" }
        }
      },
      {
        $project: {
          category: "$categoryName",
          revenue: 1,
          productCount: { $size: "$productCount" },
          totalSales: 1
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    // Get total products for summary
    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ 
      status: "active",
      isAvailable: true 
    });

    // Response with ONLY TWO CHARTS
    res.json({
      success: true,
      period: period,
      days: days,
      performance: {
        // Chart 1: Top Products (Horizontal Bar Chart)
        topProducts: {
          labels: topProducts.map(p => 
            p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name
          ),
          data: topProducts.map(p => p.revenue),
          tableData: topProducts.map(p => ({
            name: p.name,
            category: p.categoryName,
            revenue: p.revenue,
            sales: p.sales,
            formattedRevenue: `₹${p.revenue.toLocaleString()}`,
            status: p.stockStatus || "active"
          }))
        },
        
        // Chart 2: Category Performance (Bar Chart)
        categoryRevenue: {
          labels: categoryPerformance.map(c => c.category),
          data: categoryPerformance.map(c => c.revenue),
          details: categoryPerformance.map(c => ({
            category: c.category,
            revenue: c.revenue,
            productCount: c.productCount,
            totalSales: c.totalSales,
            formattedRevenue: `₹${c.revenue.toLocaleString()}`
          }))
        },
        
        // Summary stats (for dashboard cards)
        summary: {
          totalProducts,
          activeProducts,
          totalRevenue: topProducts.reduce((sum, p) => sum + p.revenue, 0),
          totalSales: topProducts.reduce((sum, p) => sum + p.sales, 0)
        }
      }
    });

  } catch (error) {
    console.error("❌ Product performance error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching product performance",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// -----------------------------------------------Reports---------------------------------------------

const getSalesReport = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Get parameters from URL params
    const { type = 'monthly' } = req.params;
    // Optional: Get startDate and endDate from query params for custom ranges
    const { startDate, endDate } = req.query;
    
    let reportData = {};
    let periodLabel = '';

    // Set date range based on report type
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date();
    
    if (!startDate) {
      // Set default start date based on report type
      if (type === 'daily') {
        start.setDate(start.getDate() - 1);
        periodLabel = 'Daily';
      } else if (type === 'weekly') {
        start.setDate(start.getDate() - 7);
        periodLabel = 'Weekly';
      } else if (type === 'monthly') {
        start.setMonth(start.getMonth() - 1);
        periodLabel = 'Monthly';
      } else if (type === 'quarterly') {
        start.setMonth(start.getMonth() - 3);
        periodLabel = 'Quarterly';
      } else if (type === 'yearly') {
        start.setFullYear(start.getFullYear() - 1);
        periodLabel = 'Yearly';
      } else if (type === 'custom') {
        // For custom reports without dates, show last 30 days
        start.setDate(start.getDate() - 30);
        periodLabel = 'Custom (Last 30 Days)';
      } else {
        // Default to monthly
        start.setMonth(start.getMonth() - 1);
        periodLabel = 'Monthly';
      }
    } else {
      periodLabel = 'Custom Range';
    }

    // Get sales data for the period
    const salesData = await Order.aggregate([
      {
        $match: {
          status: "DELIVERED",
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          totalOrders: { $sum: 1 },
          avgOrderValue: { $avg: "$totalAmount" }
        }
      }
    ]);

    // Get daily/weekly/monthly breakdown based on type
    let groupFormat = "%Y-%m";
    if (type === 'daily') groupFormat = "%Y-%m-%d";
    if (type === 'weekly') groupFormat = "%Y-%U"; // Week number

    const breakdown = await Order.aggregate([
      {
        $match: {
          status: "DELIVERED",
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: groupFormat, date: "$createdAt" }
          },
          revenue: { $sum: "$totalAmount" },
          orders: { $sum: 1 },
          avgOrderValue: { $avg: "$totalAmount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get top products for the period
    const topProducts = await Order.aggregate([
      {
        $match: {
          status: "DELIVERED",
          createdAt: { $gte: start, $lte: end }
        }
      },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      { $unwind: "$productDetails" },
      {
        $group: {
          _id: "$productDetails._id",
          name: { $first: "$productDetails.name" },
          revenue: { 
            $sum: { 
              $multiply: ["$items.price", "$items.quantity"] 
            } 
          },
          quantity: { $sum: "$items.quantity" }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ]);

    // Get order status summary
    const orderStatus = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // Format the response
    const summary = salesData[0] || {
      totalRevenue: 0,
      totalOrders: 0,
      avgOrderValue: 0
    };

    reportData = {
      reportType: type,
      period: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
        label: periodLabel
      },
      summary: {
        totalRevenue: summary.totalRevenue,
        totalOrders: summary.totalOrders,
        avgOrderValue: summary.avgOrderValue,
        formatted: {
          totalRevenue: `₹${summary.totalRevenue?.toLocaleString() || '0'}`,
          avgOrderValue: `₹${summary.avgOrderValue?.toFixed(2) || '0.00'}`
        }
      },
      breakdown: breakdown.map(item => ({
        period: item._id,
        revenue: item.revenue,
        orders: item.orders,
        avgOrderValue: item.avgOrderValue,
        formattedRevenue: `₹${item.revenue?.toLocaleString() || '0'}`
      })),
      topProducts: topProducts.map(product => ({
        name: product.name,
        revenue: product.revenue,
        quantity: product.quantity,
        formattedRevenue: `₹${product.revenue?.toLocaleString() || '0'}`
      })),
      orderStatus: orderStatus.reduce((acc, status) => {
        acc[status._id] = status.count;
        return acc;
      }, {}),
      generatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      report: reportData,
      message: `${periodLabel} sales report generated successfully`
    });

  } catch (error) {
    console.error("❌ Sales report error:", error);
    res.status(500).json({
      success: false,
      message: "Error generating sales report",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


module.exports = { showDashboard, salesAnalytics, getCutomerInsight, getProductPerformance, getSalesReport };