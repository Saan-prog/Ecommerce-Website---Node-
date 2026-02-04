const Order = require('../models/orderModel.js');
const Coupon = require('../models/couponModel');
const Cart = require('../models/cartModel.js');
const Address = require('../models/addressModel.js');
const Review = require('../models/reviewModels.js');
const Product = require('../models/productModel.js');
const Razorpay = require('razorpay');

// Initialize Razorpay
const getRazorpayInstance = () => {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
};

// ------------------------------- UPDATED CHECKOUT ------------------------------------------------------

// const checkout = async (req, res) => {
//     try {
//         // ========== CHANGE 1: Get data from req.body instead of req.params ==========
//         const { cartId, addressId, paymentMethod, couponCode } = req.body;
//         const userId = req.user._id;

//         console.log("\n=== CHECKOUT REQUEST BODY ===");
//         console.log("cartId:", cartId);
//         console.log("addressId:", addressId);
//         console.log("paymentMethod:", paymentMethod);
//         console.log("================================\n");

//         const razorpay = getRazorpayInstance();

//         // 1. Basic validation
//         if (!cartId || !addressId || !paymentMethod) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Missing required parameters'
//             });
//         }

//         // Validate payment method matches your schema enum
//         if (!['COD', 'ONLINE'].includes(paymentMethod)) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Invalid payment method. Use COD or ONLINE'
//             });
//         }

//         // 2. Get cart with proper population
//         const cart = await Cart.findById(cartId).populate({
//             path: 'items.product',
//             select: '_id name price image description' // Get all fields from Product
//         });
        
//         if (!cart || cart.user.toString() !== userId.toString()) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Cart not found'
//             });
//         }

//         // 3. Get address
//         const address = await Address.findById(addressId);
//         if (!address || address.user.toString() !== userId.toString()) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Address not found'
//             });
//         }

//         console.log("Cart items from database:", JSON.stringify(cart.items, null, 2));

//         // ========== Get product image from back end ==========
//         const orderItems = cart.items.map(cartItem => {
//             // Find matching frontend item
//             const product = cartItem.product;

//             console.log("\n=== Processing Cart Item ===");
//             console.log("Product:", product);
//             console.log("Product Images:", product?.image);
//             console.log("================================\n");

//             let productImages = [];
            
//             // Priority 1: Use image from frontend (has the actual image from cart page)
//             if (product?.image) {
                
//                 if (Array.isArray(product.image)) {
//                     productImages = product.image;
//                 } else if (typeof product.image === 'string') {
//                     productImages = [product.image];
//                 }
//             }
            
//              // If no images, use default
//             if (productImages.length === 0) {
//                 productImages = ['/uploads/default-product.jpg'];
//             }

//             return {
//                 product: product?._id || null,
//                 name: product?.name || "Product",
//                 image: productImages, // ✅ Images from DATABASE
//                 quantity: cartItem.quantity || 1,
//                 price: product?.price || 0,
//                 size: cartItem.size || 'M'
//             };
//         });
//         // Debug final order items
//         console.log("\n=== FINAL ORDER ITEMS WITH IMAGES ===");
//         orderItems.forEach((item, index) => {
//             console.log(`Item ${index + 1}: ${item.name}`);
//             console.log(`  Images:`, item.image);
//             console.log(`  Image count:`, item.image.length);
//         });
//         console.log("================================\n");

//         // 5. Calculate totals (matches your financial fields)
//         const subtotal = orderItems.reduce((sum, item) => 
//             sum + (item.price * item.quantity), 0);
        
//         const shipping = subtotal > 1000 ? 0 : 50;
//         const tax = subtotal * 0.18; // 18% GST
//         const discount = 0; // You can add coupon logic here
//         const totalAmount = subtotal + shipping + tax - discount;

//         // Debug calculated totals
//         console.log("Calculated totals:", {
//             subtotal,
//             shipping,
//             tax,
//             discount,
//             totalAmount
//         });

//         // 6. Create order (all fields match your schema)
//         const orderData = {
//             user: userId,
//             address: addressId,
//             items: orderItems,
//             subtotal: subtotal,
//             shipping: shipping,
//             tax: tax,
//             discount: discount, // Your schema has discount field
//             totalAmount: totalAmount,
//             paymentMethod: paymentMethod,
//             paymentStatus: paymentMethod === 'COD' ? 'PENDING' : 'PENDING',
//             status: 'CREATED', // Will trigger your statusHistory pre-save hook
            
//             // Optional fields with defaults
//             coupon: null,
//             couponCode: '',
//             refundStatus: 'NOT_INITIATED',
//             refundAmount: 0
//         };

//         console.log("Order data to save:", JSON.stringify(orderData, null, 2));

//         const order = new Order(orderData);
//         await order.save(); // This triggers your pre-save hooks!

//         // 7. Update cart
//         // Clear cart items
//         cart.items = [];
//         cart.total = 0;
//         cart.status = 'ordered';
//         await cart.save();

//         // 8. Handle Razorpay payment if ONLINE
//         let paymentResponse = null;
        
//         if (paymentMethod === 'ONLINE') {
//             try {
//                 // Convert totalAmount to paise (smallest currency unit)
//                 const amountInPaise = Math.round(totalAmount * 100);
                
//                 // Ensure minimum amount for Razorpay
//                 if (amountInPaise < 100) { // Minimum ₹1
//                     throw new Error("Amount too small for Razorpay payment");
//                 }

//                 const razorpayOrder = await razorpay.orders.create({
//                     amount: amountInPaise,
//                     currency: "INR",
//                     receipt: `order_${order.orderId}`,
//                     notes: {
//                         orderId: order._id.toString(),
//                         userId: userId.toString()
//                     }
//                 });

//                 console.log("Razorpay order created:", razorpayOrder);

//                 // Update order with Razorpay details
//                 order.paymentId = razorpayOrder.id;
//                 order.paymentGateway = 'razorpay';
//                 await order.save();

//                 paymentResponse = {
//                     razorpayOrderId: razorpayOrder.id,
//                     amount: razorpayOrder.amount,
//                     currency: razorpayOrder.currency,
//                     key: process.env.RAZORPAY_KEY_ID
//                 };
                
//             } catch (razorpayError) {
//                 console.error('Razorpay error:', razorpayError);
                
//                 // Update order status
//                 order.paymentStatus = 'FAILED';
//                 order.status = 'CANCELLED';
//                 await order.save();
                
//                 // Revert cart
//                 cart.status = 'active';
//                 await cart.save();
                
//                 return res.status(500).json({
//                     success: false,
//                     message: 'Payment initialization failed: ' + razorpayError.message
//                 });
//             }
//         }

//         // 9. Prepare response with data from your schema
//         const response = {
//             success: true,
//             message: paymentMethod === 'COD' 
//                 ? 'Order created successfully. Pay on delivery.' 
//                 : 'Order created. Please complete the payment.',
//             data: {
//                 order: {
//                     id: order._id,
//                     orderId: order.orderId, // Auto-generated by your hook
//                     totalAmount: order.totalAmount,
//                     status: order.status, // 'CREATED'
//                     paymentStatus: order.paymentStatus, // 'PENDING'
//                     paymentMethod: order.paymentMethod,
//                     createdAt: order.createdAt, // Auto-added by timestamps
//                     items: order.items.map(item => ({
//                         name: item.name,
//                         quantity: item.quantity,
//                         price: item.price,
//                         size: item.size,
//                         image: item.image // This should now have the real images!
//                     }))
//                 }
//             }
//         };

//         // Add Razorpay payment details for frontend
//         if (paymentMethod === 'ONLINE' && paymentResponse) {
//             response.data.payment = paymentResponse;
//         }

//         console.log("Checkout successful, returning response");
//         console.log("Order items in response:", response.data.order.items);
//         res.status(201).json(response);

//     } catch (error) {
//         console.error('Checkout error:', error);
        
//         // Handle mongoose validation errors (for your schema)
//         if (error.name === 'ValidationError') {
//             const messages = Object.values(error.errors).map(err => err.message);
//             console.error('Validation errors:', messages);
//             return res.status(400).json({
//                 success: false,
//                 message: 'Validation error',
//                 errors: messages
//             });
//         }
        
//         // Handle specific errors
//         if (error.code === 11000) { // Duplicate key error
//             return res.status(400).json({
//                 success: false,
//                 message: 'Duplicate order detected'
//             });
//         }
        
//         console.error('Full error stack:', error.stack);
//         res.status(500).json({
//             success: false,
//             message: 'Server error: ' + error.message
//         });
//     }
// };

const checkout = async (req, res) => {
    try {
        // ========== Get data from request body ==========
        const { cartId, addressId, paymentMethod, couponCode, amount, items: selectedItemsFromFrontend } = req.body;
        const userId = req.user._id;

        console.log("\n=== CHECKOUT REQUEST BODY ===");
        console.log("cartId:", cartId);
        console.log("addressId:", addressId);
        console.log("paymentMethod:", paymentMethod);
        console.log("couponCode:", couponCode);
        console.log("amount from frontend:", amount);
        console.log("selectedItems from frontend:", selectedItemsFromFrontend);
        console.log("================================\n");

        // IMPORTANT: Validate that selectedItems is present
        if (!selectedItemsFromFrontend || !Array.isArray(selectedItemsFromFrontend) || selectedItemsFromFrontend.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No items selected for checkout'
            });
        }

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
            select: '_id name price image description' // Get all fields from Product
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

        console.log("Cart items from database:", JSON.stringify(cart.items, null, 2));
        console.log("Selected items from frontend:", JSON.stringify(selectedItemsFromFrontend, null, 2));

        // ========== FILTER: Process ONLY selected cart items ==========
        const orderItems = [];
        const purchasedCartItemIds = []; // To track which cart items were purchased

        // Loop through selected items from frontend
        selectedItemsFromFrontend.forEach(selectedItem => {
            // Find matching cart item by productId and size
            const cartItem = cart.items.find(item => {
                const productId = item.product?._id.toString();
                const size = item.size || 'M';
                
                return productId === selectedItem.productId && 
                       size === selectedItem.size;
            });

            if (cartItem) {
                const product = cartItem.product;

                console.log("\n=== Processing SELECTED Cart Item ===");
                console.log("Selected item from frontend:", selectedItem);
                console.log("Matched cart item:", cartItem);
                console.log("Product:", product);
                console.log("Product Images:", product?.image);
                console.log("================================\n");

                let productImages = [];
                
                // Get images from product
                if (product?.image) {
                    if (Array.isArray(product.image)) {
                        productImages = product.image;
                    } else if (typeof product.image === 'string') {
                        productImages = [product.image];
                    }
                }
                
                // If no images, use default
                if (productImages.length === 0) {
                    productImages = ['/uploads/default-product.jpg'];
                }

                // Use quantity from selected item (not cart item)
                const quantity = selectedItem.quantity || cartItem.quantity || 1;
                
                orderItems.push({
                    product: product?._id || null,
                    name: product?.name || "Product",
                    image: productImages,
                    quantity: quantity,
                    price: product?.price || 0,
                    size: cartItem.size || 'M'
                });

                // Track this cart item as purchased
                purchasedCartItemIds.push(cartItem._id.toString());
            } else {
                console.warn("WARNING: Selected item not found in cart:", selectedItem);
            }
        });

        // Check if we found any items
        if (orderItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No matching items found in cart'
            });
        }

        // Debug final order items
        console.log("\n=== FINAL ORDER ITEMS (ONLY SELECTED) ===");
        console.log("Total selected items:", orderItems.length);
        orderItems.forEach((item, index) => {
            console.log(`Item ${index + 1}: ${item.name} (Qty: ${item.quantity})`);
            console.log(`  Product ID:`, item.product);
            console.log(`  Images:`, item.image);
            console.log(`  Image count:`, item.image.length);
            console.log(`  Size:`, item.size);
            console.log(`  Price: ₹${item.price} each`);
            console.log(`  Total: ₹${item.price * item.quantity}`);
        });
        console.log("================================\n");

        // 5. Calculate totals MATCHING FRONTEND
        const subtotal = orderItems.reduce((sum, item) => 
            sum + (item.price * item.quantity), 0);
        
        // FIXED: Use ₹50 shipping (not free above 1000)
        const shipping = 50;
        
        // FIXED: No tax calculation (since frontend doesn't show tax)
        const tax = 0;
        
        // FIXED: Calculate discount if coupon is provided
        let discount = 0;
        let couponData = null;
        let finalCouponCode = '';
        
        if (couponCode) {
            try {
                // Validate coupon from database
                const coupon = await Coupon.findOne({ 
                    code: couponCode.toUpperCase(),
                    isActive: true,
                    expiryDate: { $gt: new Date() }
                });
                
                if (coupon) {
                    // Check minimum purchase amount
                    if (subtotal >= (coupon.minPurchaseAmount || 0)) {
                        if (coupon.discountType === 'percentage') {
                            discount = (subtotal * parseFloat(coupon.discountValue)) / 100;
                            // Ensure discount doesn't exceed max discount if specified
                            if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
                                discount = coupon.maxDiscountAmount;
                            }
                        } else if (coupon.discountType === 'fixed') {
                            discount = parseFloat(coupon.discountValue);
                        }
                        
                        couponData = coupon._id;
                        finalCouponCode = coupon.code;
                        
                        console.log("Coupon applied successfully:", {
                            code: coupon.code,
                            discountType: coupon.discountType,
                            discountValue: coupon.discountValue,
                            discountApplied: discount
                        });
                    } else {
                        console.log("Coupon not applicable: Minimum purchase not met");
                    }
                } else {
                    console.log("Coupon not found or expired:", couponCode);
                }
            } catch (couponError) {
                console.error("Error validating coupon:", couponError);
                // Continue without coupon if there's an error
            }
        }
        
        // FIXED: Calculate total matching frontend
        const totalAmount = subtotal + shipping + tax - discount;

        // Debug calculated totals
        console.log("\n=== CALCULATED TOTALS (ONLY SELECTED ITEMS) ===");
        console.log("Selected Items Count:", orderItems.length);
        console.log("Subtotal (selected items only):", subtotal);
        console.log("Shipping (fixed ₹50):", shipping);
        console.log("Tax (0%):", tax);
        console.log("Discount from coupon:", discount);
        console.log("Coupon Code:", finalCouponCode);
        console.log("Total Amount:", totalAmount);
        console.log("Expected from frontend:", amount);
        
        // IMPORTANT: Verify amount matches frontend
        if (amount && Math.abs(totalAmount - parseFloat(amount)) > 0.01) {
            console.warn("WARNING: Backend total doesn't match frontend total!");
            console.warn("Frontend:", amount, "Backend:", totalAmount);
            console.warn("Difference:", Math.abs(totalAmount - parseFloat(amount)));
        }
        console.log("================================\n");

        // 6. Create order (all fields match your schema)
        const orderData = {
            user: userId,
            address: addressId,
            items: orderItems, // ONLY selected items
            subtotal: subtotal,
            shipping: shipping,
            tax: tax,
            discount: discount,
            totalAmount: totalAmount,
            paymentMethod: paymentMethod,
            paymentStatus: paymentMethod === 'COD' ? 'PENDING' : 'PENDING',
            status: 'CREATED',
            
            // Coupon data
            coupon: couponData,
            couponCode: finalCouponCode,
            
            // Optional fields with defaults
            refundStatus: 'NOT_INITIATED',
            refundAmount: 0
        };

        console.log("Order data to save (only selected items):", JSON.stringify(orderData, null, 2));

        const order = new Order(orderData);
        await order.save(); // This triggers your pre-save hooks!

        // 7. Update cart - REMOVE ONLY PURCHASED ITEMS
        console.log("\n=== UPDATING CART ===");
        console.log("Cart items before removal:", cart.items.length);
        console.log("Purchased cart item IDs:", purchasedCartItemIds);
        
        // Filter out only the purchased items
        cart.items = cart.items.filter(item => 
            !purchasedCartItemIds.includes(item._id.toString())
        );
        
        // Recalculate cart total
        cart.total = cart.items.reduce((sum, item) => {
            const product = item.product;
            const price = product?.price || 0;
            const quantity = item.quantity || 1;
            return sum + (price * quantity);
        }, 0);
        
        console.log("Cart items after removal:", cart.items.length);
        console.log("New cart total:", cart.total);
        
        // Update cart status
        if (cart.items.length === 0) {
            cart.status = 'ordered';
        } else {
            cart.status = 'active';
        }
        
        await cart.save();

        // 8. Handle Razorpay payment if ONLINE
        let paymentResponse = null;
        
        if (paymentMethod === 'ONLINE') {
            try {
                // Use the calculated totalAmount for payment (not subtotal + tax)
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
                        userId: userId.toString(),
                        discountApplied: discount,
                        couponCode: finalCouponCode,
                        itemsCount: orderItems.length // Add items count to notes
                    }
                });

                console.log("Razorpay order created:", razorpayOrder);

                // Update order with Razorpay details
                order.paymentId = razorpayOrder.id;
                order.paymentGateway = 'razorpay';
                await order.save();

                paymentResponse = {
                    razorpayOrderId: razorpayOrder.id,
                    amount: razorpayOrder.amount, // This is in paise
                    currency: razorpayOrder.currency,
                    key: process.env.RAZORPAY_KEY_ID
                };
                
            } catch (razorpayError) {
                console.error('Razorpay error:', razorpayError);
                
                // Update order status
                order.paymentStatus = 'FAILED';
                order.status = 'CANCELLED';
                await order.save();
                
                // Revert cart changes - add back the items
                // (You might want to implement this if needed)
                
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
                    discount: order.discount,
                    couponCode: order.couponCode,
                    createdAt: order.createdAt,
                    items: order.items.map(item => ({
                        name: item.name,
                        quantity: item.quantity,
                        price: item.price,
                        size: item.size,
                        image: item.image,
                        total: item.price * item.quantity
                    }))
                }
            }
        };

        // Add Razorpay payment details for frontend
        if (paymentMethod === 'ONLINE' && paymentResponse) {
            response.data.payment = paymentResponse;
        }

        console.log("\n=== CHECKOUT SUCCESSFUL ===");
        console.log("Order created with ID:", order._id);
        console.log("Total items in order:", order.items.length);
        console.log("Total amount:", order.totalAmount);
        console.log("Items:", order.items.map(item => `${item.name} (Qty: ${item.quantity})`));
        console.log("================================\n");

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
        const userId = req.user._id;

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
                discount: order.discount,
                totalAmount: order.totalAmount,
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
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    console.log("=== DEBUG: Checking _id in raw orders ===");
    orders.forEach((order, orderIndex) => {
      console.log(`Order ${orderIndex + 1}:`);
      console.log(`  MongoDB _id:`, order._id);
      console.log(`  Order ID (order number):`, order.orderId);
      console.log(`  Has _id field?`, '_id' in order);
    });
    console.log("====================================\n");

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

    const totalPages = Math.ceil(totalOrders / limit);

    const formattedOrders = orders.map(order => {
      let itemCount = 0;
      let itemsTotal = 0;

      if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
          itemCount += item.quantity;
          itemsTotal += item.price * item.quantity;
        });
      }

      return {
        _id: order._id, // ADD THIS LINE - MongoDB _id
        orderId: order.orderId, // Order number like "ORD-..."
        orderNumber: `#${order.orderId || order._id.toString().slice(-6).toUpperCase()}`,
        items: order.items.map(item => {
          let processedImages = [];

          if (item.image) {
            if (Array.isArray(item.image)) {
              processedImages = item.image.map(img => {
                if (img && typeof img === 'string') {
                  if (!img.startsWith('http') && !img.startsWith('//')) {
                    const imagePath = img.startsWith('/uploads/')
                      ? img
                      : `/uploads/${img}`;
                    return `${req.protocol}://${req.get('host')}${imagePath}`;
                  }
                }
                return img;
              }).filter(img => img);
            } else if (typeof item.image === 'string') {
              if (!item.image.startsWith('http') && !item.image.startsWith('//')) {
                const imagePath = item.image.startsWith('/uploads/')
                  ? item.image
                  : `/uploads/${item.image}`;
                processedImages = [`${req.protocol}://${req.get('host')}${imagePath}`];
              } else {
                processedImages = [item.image];
              }
            }
          }

          return {
            name: item.name,
            productId: item.product, // This should be the product ID
            quantity: item.quantity,
            price: item.price,
            size: item.size,
            image: processedImages.length > 0 ? processedImages[0] : null,
            total: item.price * item.quantity
          };
        }),
        shippingAddress: order.address ? {
          name: order.address.fullName,
          address: `${order.address.house}, ${order.address.street}`,
          city: order.address.city,
          state: order.address.state,
          pincode: order.address.pinCode,
          phone: order.address.phone
        } : null,
        summary: {
          itemCount,
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

    console.log("=== DEBUG: Final formatted orders ===");
    console.log("First formatted order keys:", Object.keys(formattedOrders[0]));
    console.log("Has _id?", '_id' in formattedOrders[0]);
    console.log("_id value:", formattedOrders[0]._id);
    console.log("====================================\n");

    res.status(200).json({
      success: true,
      message: "Orders retrieved successfully",
      orders: formattedOrders,
      pagination: {
        currentPage: page,
        totalPages,
        totalOrders,
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
}
// ---------------------------------------------------Add Review ----------------------------------------------------------------

const addReview = async(req, res) => {
    try {
        console.log("=== ADD REVIEW DEBUG ===");
        console.log("Request Body:", req.body);
        
        const userId = req.user._id;
        const { productId, orderId, rating, comment } = req.body;
        
        if(!productId || !orderId || !rating){
            return res.status(400).json({
                success: false,
                message: "productId, orderId and rating are required"
            });
        }

        // Validate product exists
        const product = await Product.findById(productId);
        if(!product){
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        // Check if orderId is a MongoDB ID or order number
       const order = await Order.findOne({
            _id: orderId,  // Now this will be MongoDB _id
            user: userId
        });
        
        if(!order){
            console.log("Order not found:", orderId);
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        // Check if order is delivered (case-insensitive)
        const isDelivered = order.status && order.status.toLowerCase() === 'delivered';
        if (!isDelivered) {
            return res.status(403).json({
                success: false,
                message: `Order is not delivered. Current status: ${order.status}`
            });
        }

        // Check if product exists in this order
        const productInOrder = order.items.find(item => {
            // Check both product and productId fields
            const itemProductId = item.product?.toString() || item.productId?.toString();
            return itemProductId === productId.toString();
        });

        if(!productInOrder){
            console.log("Product not in order. Order items:", order.items);
            console.log("Looking for productId:", productId);
            
            return res.status(403).json({
                success: false,
                message: "Product was not part of this order"
            });
        }

        // Check if user already reviewed this product for this order
        const existingReview = await Review.findOne({
            user: userId,
            product: productId,
            order: order._id // Use the MongoDB _id for the review
        });

        if(existingReview){
            return res.status(409).json({
                success: false,
                message: "You have already reviewed this product for this order"
            });
        }

        // Create new review
        const newReview = new Review({
            user: userId,
            product: productId,
            order: order._id, // Store MongoDB _id
            rating: rating,
            comment: comment || ""
        });

        await newReview.save();

        // Populate user info
        const savedReview = await Review.findById(newReview._id)
            .populate({
                path: "user",
                select: "name email"
            });

        return res.status(201).json({
            success: true,
            message: "Review added successfully",
            review: savedReview
        });

    } catch (error) {
        console.error("Add Review Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while adding review",
            error: error.message
        });
    }
}

module.exports = { checkout, verifyPayment, getUserOrders, addReview };