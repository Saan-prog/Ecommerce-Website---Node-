const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');
const Order = require('../models/orderModel'); // Your existing Order model

class InvoiceController {
    // Store the browser instance for reuse
    static browser = null;
    
    /**
     * 1. MAIN FUNCTION: Download invoice
     * This is the function that gets called when user clicks "Download Invoice"
     */
    static async downloadInvoice(req, res) {
        console.log('🔄 Starting invoice generation...');
        
        try {
            // Get order ID from URL - THIS IS MONGODB _id FROM FRONTEND
            const { orderId } = req.params;
            
            // Get user ID from authentication
            const userId = req.user ? req.user._id : null;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Please login to download invoice'
                });
            }
            
            console.log(`📋 Looking for order by MongoDB _id: ${orderId} for user: ${userId}`);
            
            // 2. FIND ORDER IN DATABASE - FIXED: Use MongoDB _id instead of orderId
            const order = await Order.findOne({
                _id: orderId, // CHANGED: Use MongoDB _id, not orderId field
                user: userId
            })
            .populate('user', 'name email phone') // Get user details
            .populate('address') // Get shipping address
            .populate('items.product', 'name images'); // Get product details if needed
            
            // Check if order exists
            if (!order) {
                console.log('❌ Order not found with _id:', orderId);
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }
            
            console.log('✅ Order found:', {
                mongoId: order._id,
                orderNumber: order.orderId,
                status: order.status,
                itemsCount: order.items.length
            });
            
            // 3. PREPARE DATA FOR INVOICE TEMPLATE
            const invoiceData = InvoiceController.prepareInvoiceData(order);
            
            // 4. GENERATE PDF
            console.log('📄 Generating PDF...');
            const pdfBuffer = await InvoiceController.generatePDF(invoiceData);
            
            // 5. SEND PDF TO USER
            console.log('📤 Sending PDF to user...');
            
            // Set response headers for download
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="invoice-${order.orderId}.pdf"`);
            
            // Send the PDF
            res.send(pdfBuffer);
            
            console.log('✅ Invoice sent successfully!');
            
        } catch (error) {
            console.error('❌ Invoice generation failed:', error);
            console.error('❌ Stack trace:', error.stack);
            
            // For development, show actual error
            if (process.env.NODE_ENV === 'development') {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to generate invoice',
                    error: error.message,
                    stack: error.stack
                });
            }
            
            // For production, show user-friendly message
            res.status(500).json({
                success: false,
                message: 'Invoice will be available soon! For now, you can print this page or take a screenshot.'
            });
        }
    }
    
    /**
     * 2. HELPER: Convert order data to invoice format - FIXED FOR INDIAN CURRENCY
     */
    static prepareInvoiceData(order) {
        console.log('📊 Preparing invoice data...');
        
        // Calculate item totals
        const items = order.items.map(item => {
            const itemTotal = item.price * item.quantity;
            return {
                name: item.name,
                price: parseFloat(item.price).toFixed(2),
                quantity: item.quantity,
                total: itemTotal.toFixed(2),
                size: item.size || 'Not specified'
            };
        });
        
        // Get customer info
        const customer = {
            name: order.user?.name || 'Customer',
            email: order.user?.email || 'Not provided',
            phone: order.user?.phone || 'Not provided'
        };
        
        // Get shipping address
        let shippingAddress = 'Address not available';
        if (order.address) {
            // Check if address is populated or has direct fields
            if (typeof order.address === 'object' && order.address !== null) {
                // If address is populated with address document
                const addr = order.address;
                shippingAddress = `${addr.house || ''} ${addr.street || ''}, ${addr.city || ''}, ${addr.state || ''}, ${addr.country || 'India'} - ${addr.pinCode || addr.postalCode || ''}`;
            } else if (order.shippingAddress) {
                // If using shippingAddress field from your frontend
                shippingAddress = order.shippingAddress;
            }
        }
        
        // Format dates
        const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        
        const invoiceDate = new Date().toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        
        // Prepare the data for template - UPDATED FOR INDIAN CURRENCY
        return {
            // Order info
            orderId: order.orderId || `ORD-${order._id.toString().slice(-6)}`,
            orderDate: orderDate,
            invoiceDate: invoiceDate,
            status: order.status || 'PROCESSING',
            paymentMethod: order.paymentMethod || 'Online',
            paymentStatus: order.paymentStatus || 'PAID',
            transactionId: order.paymentId || `TXN-${order._id.toString().slice(-6)}`,
            
            // Customer info
            customer: customer,
            shippingAddress: shippingAddress,
            
            // Items
            items: items,
            
            // Totals (using your schema field names)
            subtotal: (order.subtotal || order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)).toFixed(2),
            shipping: (order.shipping || 0).toFixed(2),
            tax: (order.tax || 0).toFixed(2),
            discount: (order.discount || 0).toFixed(2),
            total: (order.totalAmount || order.subtotal + (order.shipping || 0) + (order.tax || 0) - (order.discount || 0)).toFixed(2),
            
            // Tax rate (calculate percentage)
            taxRate: order.tax > 0 ? Math.round((order.tax / (order.subtotal || 1)) * 100) : 18 // Default 18% GST
        };
    }
    
    /**
     * 3. HELPER: Generate PDF from HTML
     */
    static async generatePDF(invoiceData) {
        console.log('🎨 Creating PDF from template...');
        
        let browser = null;
        let page = null;
        
        try {
            // 1. GET OR CREATE BROWSER
            if (!InvoiceController.browser) {
                console.log('🌐 Launching browser...');
                InvoiceController.browser = await puppeteer.launch({
                    headless: 'new',
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                });
            }
            
            browser = InvoiceController.browser;
            
            // 2. CREATE NEW PAGE
            page = await browser.newPage();
            
            // 3. READ HTML TEMPLATE
            const templatePath = path.join(__dirname, '../templates/invoice-template.html');
            const htmlTemplate = await fs.readFile(templatePath, 'utf8');
            
            // 4. REPLACE VARIABLES IN TEMPLATE
            const template = handlebars.compile(htmlTemplate);
            const htmlContent = template(invoiceData);
            
            // 5. SET CONTENT AND GENERATE PDF
            await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
            
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20mm',
                    right: '20mm',
                    bottom: '20mm',
                    left: '20mm'
                }
            });
            
            console.log('✅ PDF generated successfully');
            return pdfBuffer;
            
        } catch (error) {
            console.error('❌ PDF generation error:', error);
            throw error;
        } finally {
            // Close page but keep browser open for next request
            if (page) {
                await page.close();
            }
        }
    }
    
    /**
     * 4. BONUS: Preview invoice in browser (for testing)
     */
    static async previewInvoice(req, res) {
        try {
            const { orderId } = req.params;
            const userId = req.user._id;
            
            // Find order - FIXED: Use MongoDB _id
            const order = await Order.findOne({
                _id: orderId, // CHANGED
                user: userId
            }).populate('user').populate('address');
            
            if (!order) {
                return res.status(404).send('Order not found');
            }
            
            // Prepare data
            const invoiceData = InvoiceController.prepareInvoiceData(order);
            
            // Read template
            const templatePath = path.join(__dirname, '../templates/invoice-template.html');
            const htmlTemplate = await fs.readFile(templatePath, 'utf8');
            
            // Fill template with data
            const template = handlebars.compile(htmlTemplate);
            const htmlContent = template(invoiceData);
            
            // Send as HTML for preview
            res.send(htmlContent);
            
        } catch (error) {
            res.status(500).send(`Error: ${error.message}`);
        }
    }
    
    /**
     * 5. BONUS: Check invoice service health
     */
    static async healthCheck(req, res) {
        try {
            let browserHealthy = false;
            
            if (InvoiceController.browser) {
                const version = await InvoiceController.browser.version();
                browserHealthy = true;
            }
            
            res.json({
                status: 'OK',
                browser: browserHealthy ? 'Running' : 'Not started',
                message: 'Invoice service is ready'
            });
            
        } catch (error) {
            res.status(500).json({
                status: 'ERROR',
                message: 'Invoice service is not ready'
            });
        }
    }
    
    /**
     * 6. Cleanup when server shuts down
     */
    static async closeBrowser() {
        if (InvoiceController.browser) {
            await InvoiceController.browser.close();
            InvoiceController.browser = null;
            console.log('✅ Browser closed');
        }
    }
}

module.exports = InvoiceController;