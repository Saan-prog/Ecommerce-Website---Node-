const mongoose = require("mongoose");
const Order = require("../models/orderModel.js");
const User = require("../models/userModel.js");
const Admin = require("../models/adminModel.js");
const Cart = require("../models/cartModel.js");

// ---------------------------------------------------------- Get all Orders --------------------------------------------------

const getAllOrders = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Status filter (from UI buttons)
    const filter = {};
    
    if (req.query.status) {
      switch(req.query.status) {
        case 'pending':
          filter.status = { $in: ['CREATED', 'CONFIRMED'] };
          break;
        case 'processing':
          filter.status = { $in: ['SHIPPED', 'OUT FOR DELIVERY'] };
          break;
        case 'shipped':
          filter.status = 'SHIPPED';
          break;
        case 'delivered':
          filter.status = 'DELIVERED';
          break;
        case 'cancelled':
          filter.status = 'CANCELLED';
          break;
        case 'all':
          // No filter - show all orders
          break;
        default:
          // For other status values from your enum
          filter.status = req.query.status;
      }
    }

    // Get total count for current filter
    const totalOrders = await Order.countDocuments(filter);

    // Get orders with pagination
    const orders = await Order.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 }) // Newest first
      .skip(skip)
      .limit(limit)
      .lean();

    // Transform data for table
    const tableData = orders.map(order => {
      // Format date
      const orderDate = new Date(order.createdAt);
      const formattedDate = `${orderDate.getDate().toString().padStart(2, '0')}/${(orderDate.getMonth() + 1).toString().padStart(2, '0')}/${orderDate.getFullYear()}`;

      // Get status label
      let statusLabel = order.status;
      let statusColor = 'secondary';
      
      if (order.status === 'CREATED' || order.status === 'CONFIRMED') {
        statusLabel = 'Pending';
        statusColor = 'warning';
      } else if (order.status === 'SHIPPED' || order.status === 'OUT FOR DELIVERY') {
        statusLabel = 'Processing';
        statusColor = 'info';
      } else if (order.status === 'DELIVERED') {
        statusLabel = 'Delivered';
        statusColor = 'success';
      } else if (order.status === 'CANCELLED') {
        statusLabel = 'Cancelled';
        statusColor = 'danger';
      }

      // Format amount
      const formattedAmount = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
      }).format(order.totalAmount);

      // Payment status
      let paymentLabel = order.paymentStatus === 'PAID' ? 'Paid' : 'Pending';
      let paymentColor = order.paymentStatus === 'PAID' ? 'success' : 'warning';

      return {
        _id: order._id,
        orderId: order.orderId || `ORD${order._id.toString().slice(-6).toUpperCase()}`,
        customer: order.user?.name || 'Customer',
        date: formattedDate,
        amount: order.totalAmount,
        formattedAmount: formattedAmount,
        status: statusLabel,
        statusValue: order.status,
        statusColor: statusColor,
        payment: paymentLabel,
        paymentColor: paymentColor,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod
      };
    });

    // Get counts for all status types (for the UI filter buttons)
    const statusCounts = await getStatusCounts();

    // Calculate pagination
    const totalPages = Math.ceil(totalOrders / limit);

    res.status(200).json({
      success: true,
      orders: tableData,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalOrders: totalOrders,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      counts: statusCounts
    });

  } catch (error) {
    console.error('Error getting orders:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading orders. Please try again.'
    });
  }
};

/**
 * Helper function to get counts for all status types
 */
const getStatusCounts = async () => {
  try {
    const [
      allOrders,
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders
    ] = await Promise.all([
      // All orders
      Order.countDocuments(),
      
      // Pending = CREATED + CONFIRMED
      Order.countDocuments({ 
        status: { $in: ['CREATED', 'CONFIRMED'] } 
      }),
      
      // Processing = SHIPPED + OUT FOR DELIVERY
      Order.countDocuments({ 
        status: { $in: ['SHIPPED', 'OUT FOR DELIVERY'] } 
      }),
      
      // Shipped only
      Order.countDocuments({ status: 'SHIPPED' }),
      
      // Delivered only
      Order.countDocuments({ status: 'DELIVERED' }),
      
      // Cancelled only
      Order.countDocuments({ status: 'CANCELLED' })
    ]);

    return {
      all: allOrders,
      pending: pendingOrders,
      processing: processingOrders,
      shipped: shippedOrders,
      delivered: deliveredOrders,
      cancelled: cancelledOrders
    };

  } catch (error) {
    console.error('Error getting status counts:', error);
    return {
      all: 0,
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0
    };
  }
};

// --------------------------------------------------------- Get Individual Orders ---------------------------------------------------------

const getOrderbyId = async(req, res) => {
    try {
        const orderId = req.params.id;
        if(!orderId){
            return res.status(400).json({success: false, message: "Order Id is required"});
        } 
        if(!mongoose.Types.ObjectId.isValid(orderId)){
            return res.status(400).json({success: false, message: "Invalid Order id format"}) 
        }
            console.log("Fetching Order Id", orderId);

            const order = await Order.findById(orderId)
            .populate('user', 'name email phone')
            .populate('address')
            .populate('items.product', 'name image');
            
        
                if(!order) {
                    return res.status(404).json({success: false, message: "Order not found"});
                }
        
                return res.status(200).json({success: true, message: "Order Found", order});

    } catch (error) {
        onsole.log("Error fetching order by Id:", error);
        res.status(500).json({success: false, message: "Error while fetching Order by id", error});
    }
}

// --------------------------------------------------------- Update Order Status ------------------------------------------------------------

const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Basic validation
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required"
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required"
      });
    }

    // Convert to uppercase
    const newStatus = status.toUpperCase();
    
    // Check if it's a valid status from your schema
    const allowedStatuses = ["CREATED", "CONFIRMED", "SHIPPED", "OUT FOR DELIVERY", "DELIVERED", "CANCELLED"];
    
    if (!allowedStatuses.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Use: ${allowedStatuses.join(', ')}`
      });
    }

    // Find the order
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // Check if status is already the same
    if (order.status === newStatus) {
      return res.status(200).json({
        success: true,
        message: "Status is already set to this value"
      });
    }

    // Save old status
    const oldStatus = order.status;

    // Just update the status
    order.status = newStatus;

    // Save to database
    await order.save();

    // Simple response
    res.status(200).json({
      success: true,
      message: `Status changed from ${oldStatus} to ${newStatus}`,
      order: {
        id: order._id,
        orderId: order.orderId,
        status: newStatus
      }
    });

  } catch (error) {
    console.error('Error updating status:', error);
    
    res.status(500).json({
      success: false,
      message: "Server error updating status"
    });
  }
};
module.exports = { getAllOrders, getOrderbyId, updateOrderStatus }