const express = require("express");
const app = express();
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const adminRoutes = require("./routes/admin.js");
const userRoutes = require("./routes/user.js");
const adminProductRoutes = require("./routes/adminProduct.js");
const adminCategoriesRoutes = require("./routes/adminCategories.js");
const adminSubcategories = require("./routes/adminSubcategories.js");
const userProductRoutes = require("./routes/userProduct.js");
const userCategoryRoute = require("./routes/userCategories.js");
const cartRoutes = require("./routes/cart.js");
const seedAdmin = require("./scripts/seedAdmin.js");
const { swaggerUi, swaggerSpec } = require("./swagger.js"); 

dotenv.config();

console.log('🔐 Environment check:');
console.log('  - JWT_SECRET loaded:', !!process.env.JWT_SECRET);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use("/api/admin/products", adminProductRoutes);
app.use("/api/user/products", userProductRoutes);
app.use("/api/admin/category", adminCategoriesRoutes);
app.use("/api/user/cart", cartRoutes);
app.use("/api/user/category", userCategoryRoute);
app.use("/api/admin/category", adminSubcategories);
// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "public", "ecommerce-html-template")));

app.get('/', (req, res) => {
    console.log("HTML file");
    res.sendFile(path.join(__dirname, "public", "ecommerce-html-template", "index.html"));
});

// Database connection
mongoose.connect(process.env.MONGO_URL)
.then(async () => {
    console.log("DB connected successfully");
    await seedAdmin();
})
.catch((error) => console.log("Data Base connection error", error.message));

const PORT = process.env.PORT || 8001;

app.listen(PORT, () => {
    console.log(`app listening on ${PORT}`);
});