
const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const mongooseToSwagger = require("mongoose-to-swagger");

// Models
const Admin = require("./models/adminModel.js");
const User = require("./models/userModel.js");
const Product = require("./models/productModel.js");

const options = {
  definition: {
    openapi: "3.0.0",

    info: {
      title: "ShopStyle API",
      version: "1.0.0",
      description: "ShopStyle is a mini e-commerce platform...",
      contact: {
        author: "ShopStyle Developer",
        email: "support@shopstyle.com"
      },
    },

    servers: [
      {
        url: "http://localhost:8070",
        description: "Development Server",
      },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },

      schemas: {
        User: mongooseToSwagger(User),
        Admin: mongooseToSwagger(Admin),
        Product: mongooseToSwagger(Product)
        // Product: {
        //   type: "object",
        //   required: ["name", "description", "price"],
        //   properties: {
        //     _id: { type: "string", example: "690fefdd300000b2ee4dba21" },
        //     name: { type: "string", example: "Dress" },
        //     description: { type: "string", example: "A stylish Black Dress" },
        //     price: { type: "number", example: 99 },
        //     category: { type: "string", example: "Women Western Wear" },
        //     brand: { type: "string", example: "Zera" },
        //     status: { type: "string", example: "active" },
        //     isAvailable: { type: "boolean", example: true },
        //     image: { type: "string", example: "img/product-1.jpg" },
        //   },
        // }
      },
    },

    security: [{ bearerAuth: [] }],
  },

  apis: [
    "./routes/admin.js",
    "./routes/user.js",
    "./routes/products.js",
  ],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = { swaggerSpec, swaggerUi };
