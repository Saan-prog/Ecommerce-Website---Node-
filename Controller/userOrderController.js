
const Order = require('../models/orderModel.js');
const Cart = require('../models/cartModel.js');
const Address = require('../models/addressModel.js');
const Razorpay = require('razorpay');


// Initialize Razorpay
const getRazorpayInstance = () => {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET

    
  });
};

// ------------------------------- checkout------------------------------------------------------


const checkout = async (req, res) => {
    try {
        
        const { cartId, addressId, paymentMethod } = req.params;
        const userId = req.user.id;

        const razorpay = getRazorpayInstance(); 

        // 1. Basic validation
        if (!cartId || !addressId || !paymentMethod) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters'
            });
        }

        // Validate payment method matches your schema enum
        if (!['COD', 'ONLINE'].includes(paymentMethod)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment method. Use COD or ONLINE'
            });
        }

        // 2. Get cart with proper population
        const cart = await Cart.findById(cartId).populate({
            path: 'items.product',
            select: 'name price images'
        });
        
        if (!cart || cart.user.toString() !== userId.toString()) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        // 3. Get address
        const address = await Address.findById(addressId);
        if (!address || address.user.toString() !== userId.toString()) {
            return res.status(404).json({
                success: false,
                message: 'Address not found'
            });
        }

        // Debug: Check product data structure
        console.log("Cart items:", JSON.stringify(cart.items, null, 2));

        // ========== DEBUG: Check Product Data Structure ==========
console.log("========== DEBUG: Product Data Structure ==========");
if (cart.items && cart.items.length > 0) {
    cart.items.forEach((item, index) => {
        console.log(`\nCart Item ${index + 1}:`);
        console.log(`  Has product populated:`, !!item.product);
        console.log(`  Product ID:`, item.product?._id);
        console.log(`  Product name:`, item.product?.name);
        
        // Check ALL possible image fields
        console.log(`  ===== IMAGE FIELDS =====`);
        console.log(`  product.images:`, item.product?.images);
        console.log(`  product.image:`, item.product?.image);
        console.log(`  product.mainImage:`, item.product?.mainImage);
        console.log(`  product.imageUrl:`, item.product?.imageUrl);
        console.log(`  product.imageURL:`, item.product?.imageURL);
        console.log(`  product.thumbnail:`, item.product?.thumbnail);
        
        // Check if product has any properties with 'image' in the name
        if (item.product) {
            const imageKeys = Object.keys(item.product).filter(key => 
                key.toLowerCase().includes('image') || 
                key.toLowerCase().includes('img') ||
                key.toLowerCase().includes('photo')
            );
            console.log(`  Image-related keys:`, imageKeys);
            imageKeys.forEach(key => {
                console.log(`    ${key}:`, item.product[key]);
            });
        }
    });
}
console.log("=================================================\n");
        
        // 4. Prepare order items (matches your items schema)
        const orderItems = cart.items.map(item => {
            // Debug each item
            console.log("Item product data:", {
                hasProduct: !!item.product,
                productId: item.product?._id,
                productName: item.product?.name,
                productPrice: item.product?.price,
                productImages: item.product?.images,
                itemSize: item.size
            });
             let productImages = [];
            // Get image - try multiple sources
             if (item.product) {
        // Check images array first
        if (item.product.images && item.product.images.length > 0) {
            productImages = item.product.images;
        } 
        // Check single image field
        else if (item.product.image) {
            productImages = [item.product.image];
        }
        // Check for mainImage field
        else if (item.product.mainImage) {
            productImages = [item.product.mainImage];
        }
    }


            // Ensure all required fields from your schema are present
            return {
                product: item.product?._id || null,
                name: item.product?.name || "Product",
                image: productImages,
                quantity: item.quantity || 1,
                price: item.product?.price || 0,
                size: item.size || 'M' // Your schema requires size
            };
        });

        // 5. Calculate totals (matches your financial fields)
        const subtotal = orderItems.reduce((sum, item) => 
            sum + (item.price * item.quantity), 0);
        
        const shipping = subtotal > 1000 ? 0 : 50;
        const tax = subtotal * 0.18; // 18% GST
        const discount = 0; // You can add coupon logic here
        const totalAmount = subtotal + shipping + tax - discount;

        // Debug calculated totals
        console.log("Calculated totals:", {
            subtotal,
            shipping,
            tax,
            discount,
            totalAmount
        });

        // 6. Create order (all fields match your schema)
        const orderData = {
            user: userId,
            address: addressId,
            items: orderItems,
            subtotal: subtotal,
            shipping: shipping,
            tax: tax,
            discount: discount, // Your schema has discount field
            totalAmount: totalAmount,
            paymentMethod: paymentMethod,
            paymentStatus: paymentMethod === 'COD' ? 'PENDING' : 'PENDING',
            status: 'CREATED', // Will trigger your statusHistory pre-save hook
            
            // Optional fields with defaults
            coupon: null,
            couponCode: '',
            refundStatus: 'NOT_INITIATED',
            refundAmount: 0
        };

        console.log("Order data to save:", JSON.stringify(orderData, null, 2));

        const order = new Order(orderData);
        await order.save(); // This triggers your pre-save hooks!
      

        // 7. Update cart
        // Clear cart items
        cart.items = [];
        cart.total = 0;
        cart.status = 'ordered';
        await cart.save();

        // 8. Handle Razorpay payment if ONLINE
        let paymentResponse = null;
        
        if (paymentMethod === 'ONLINE') {
            try {
                // Convert totalAmount to paise (smallest currency unit)
                const amountInPaise = Math.round(totalAmount * 100);
                
                // Ensure minimum amount for Razorpay
                if (amountInPaise < 100) { // Minimum ₹1
                    throw new Error("Amount too small for Razorpay payment");
                }

                const razorpayOrder = await razorpay.orders.create({
                    amount: amountInPaise,
                    currency: "INR",
                    receipt: `order_${order.orderId}`,
                    notes: {
                        orderId: order._id.toString(),
                        userId: userId.toString()
                    }
                });

                console.log("Razorpay order created:", razorpayOrder);

                // Update order with Razorpay details
                order.paymentId = razorpayOrder.id;
                order.paymentGateway = 'razorpay';
                await order.save();
               

                paymentResponse = {
                    razorpayOrderId: razorpayOrder.id,
                    amount: razorpayOrder.amount,
                    currency: razorpayOrder.currency,
                    key: process.env.RAZORPAY_KEY_ID
                };
                
            } catch (razorpayError) {
                console.error('Razorpay error:', razorpayError);
                
                // Update order status
                order.paymentStatus = 'FAILED';
                order.status = 'CANCELLED';
                await order.save();
                
                // Revert cart
                cart.status = 'active';
                await cart.save();
                
                return res.status(500).json({
                    success: false,
                    message: 'Payment initialization failed: ' + razorpayError.message
                });
            }
        }

        // 9. Prepare response with data from your schema
        const response = {
            success: true,
            message: paymentMethod === 'COD' 
                ? 'Order created successfully. Pay on delivery.' 
                : 'Order created. Please complete the payment.',
            data: {
                order: {
                    id: order._id,
                    orderId: order.orderId, // Auto-generated by your hook
                    totalAmount: order.totalAmount,
                    status: order.status, // 'CREATED'
                    paymentStatus: order.paymentStatus, // 'PENDING'
                    paymentMethod: order.paymentMethod,
                    createdAt: order.createdAt, // Auto-added by timestamps
                    items: order.items.map(item => ({
                        name: item.name,
                        quantity: item.quantity,
                        price: item.price,
                        size: item.size,
                        image: item.image
                    }))
                }
            }
        };

        // Add Razorpay payment details for frontend
        if (paymentMethod === 'ONLINE' && paymentResponse) {
            response.data.payment = paymentResponse;
        }

        console.log("Checkout successful, returning response");
        res.status(201).json(response);

    } catch (error) {
        console.error('Checkout error:', error);
        
        // Handle mongoose validation errors (for your schema)
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            console.error('Validation errors:', messages);
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: messages
            });
        }
        
        // Handle specific errors
        if (error.code === 11000) { // Duplicate key error
            return res.status(400).json({
                success: false,
                message: 'Duplicate order detected'
            });
        }
        
        console.error('Full error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

// ---------------------------------Verify Payment-------------------------------------------------
const verifyPayment = async (req, res) => {
    try {
        const { orderId, razorpayPaymentId, razorpaySignature } = req.body;
        const userId = req.user.id;

        if (!orderId || !razorpayPaymentId || !razorpaySignature) {
            return res.status(400).json({
                success: false,
                message: 'Missing payment details'
            });
        }

        // Find order (using your schema)
        const order = await Order.findOne({
            _id: orderId,
            user: userId,
            paymentMethod: 'ONLINE'
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Verify signature
        const crypto = require('crypto');
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(order.paymentId + "|" + razorpayPaymentId)
            .digest('hex');

        if (expectedSignature !== razorpaySignature) {
            // Update order status (triggers your statusHistory)
            order.paymentStatus = 'FAILED';
            order.status = 'CANCELLED';
            await order.save();
            
            return res.status(400).json({
                success: false,
                message: 'Payment verification failed'
            });
        }

        // Payment successful - update your schema fields
        order.paymentStatus = 'PAID';
        order.status = 'CONFIRMED'; // Will auto-set confirmedAt via your pre-save hook
        await order.save();

        res.json({
            success: true,
            message: 'Payment verified successfully',
            order: {
                id: order._id,
                orderId: order.orderId,
                status: order.status, // Now 'CONFIRMED'
                paymentStatus: order.paymentStatus, // Now 'PAID'
                confirmedAt: order.confirmedAt // Auto-set by your pre-save hook
            }
        });

    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Payment verification failed'
        });
    }
};

//----------------------------------------------------Get Order Details-------------------------------------------------

const getUserOrders = async (req, res) => {
  try {
    
    const userId = req.user._id;
    
    console.log("=== DEBUG: Fetching orders for user:", userId);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get total count of orders for this user
    const totalOrders = await Order.countDocuments({ user: userId });

    // Find orders with pagination
    const orders = await Order.find({ user: userId })
      .populate('address', 'fullName phone house street city state pinCode')
      .sort({ createdAt: -1 }) // Show newest first
      .skip(skip) // Skip documents for previous pages
      .limit(limit) // Limit to page size
      .lean();

      console.log("=== DEBUG: Raw orders from database ===");
    orders.forEach((order, orderIndex) => {
      console.log(`\nOrder ${orderIndex + 1} (ID: ${order._id}):`);
      if (order.items && order.items.length > 0) {
        order.items.forEach((item, itemIndex) => {
          console.log(`  Item ${itemIndex + 1}:`);
          console.log(`    Name: ${item.name}`);
          console.log(`    Image field:`, item.image);
          console.log(`    Image type:`, typeof item.image);
          console.log(`    Is array:`, Array.isArray(item.image));
          if (Array.isArray(item.image)) {
            console.log(`    Array length:`, item.image.length);
            console.log(`    Array contents:`, item.image);
          }
        });
      }
    });
    console.log("====================================\n");

    // If no orders found
    if (!orders || orders.length === 0) {
      return res.status(200).json({
        success: true,
        message: "You haven't placed any orders yet",
        orders: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalOrders: 0,
          hasNextPage: false,
          hasPrevPage: false,
          itemsPerPage: limit
        }
      });
    }

    // Calculate total pages
    const totalPages = Math.ceil(totalOrders / limit);

    // Format the orders for response
    const formattedOrders = orders.map(order => {
      // Calculate item count and total price
      let itemCount = 0;
      let itemsTotal = 0;

      if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
          itemCount += item.quantity;
          itemsTotal += item.price * item.quantity;
        });
      }

      return {
        orderId: order.orderId || order._id,
        orderNumber: `#${order.orderId || order._id.toString().slice(-6).toUpperCase()}`,
        items: order.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          size: item.size,
          image: item.image,
          total: item.price * item.quantity
        })),
        shippingAddress: order.address ? {
          name: order.address.fullName,
          address: `${order.address.house}, ${order.address.street}`,
          city: order.address.city,
          state: order.address.state,
          pincode: order.address.pinCode,
          phone: order.address.phone
        } : null,
        summary: {
          itemCount: itemCount,
          subtotal: order.subtotal || itemsTotal,
          shipping: order.shipping || 0,
          tax: order.tax || 0,
          discount: order.discount || 0,
          total: order.totalAmount || (itemsTotal + (order.shipping || 0))
        },
        payment: {
          method: order.paymentMethod,
          status: order.paymentStatus,
          paymentId: order.paymentId
        },
        status: order.status,
        orderDate: order.createdAt,
        deliveredDate: order.deliveredAt
      };
    });

    res.status(200).json({
      success: true,
      message: "Orders retrieved successfully",
      orders: formattedOrders,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalOrders: totalOrders,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        itemsPerPage: limit
      }
    });

  } catch (error) {
    console.log("Error getting user orders:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong while fetching your orders"
    });
  }
};
module.exports = { checkout, verifyPayment, getUserOrders };