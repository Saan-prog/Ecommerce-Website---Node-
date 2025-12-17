const jwt = require('jsonwebtoken');


const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        console.log("Authorization Header:", authHeader);

        if (!authHeader) return res.status(401).json({ success: false, message: "Access denied. No token provided" });

        const token = authHeader.split(" ")[1];
        console.log("Token extracted:", token);

        if (!token) return res.status(401).json({ success: false, message: "Invalid token format" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("🔐 FULL Decoded token:", JSON.stringify(decoded, null, 2));
        console.log("🔐 Does decoded have _id?", decoded._id);
        console.log("🔐 Does decoded have id?", decoded.id);
        console.log("🔐 Decoded keys:", Object.keys(decoded));

        if (decoded.role !== "admin" && decoded.role !== "admin.role") {
            return res.status(403).json({ success: false, message: "Access denied, admin privilege required" });
        }

         if (!decoded._id && !decoded.id) {
            console.error("❌ JWT doesn't contain user ID!");
            return res.status(401).json({ 
                success: false, 
                message: "Invalid token structure" 
            });
        }

        // Use the correct ID field
        req.user = {
            _id: decoded._id || decoded.id, // Handle both possibilities
            role: decoded.role,
            email: decoded.email || ''
        };
        
        console.log("🔐 req.user set to:", req.user);
        console.log("🔐 req.user._id:", req.user._id);
        
        next();
    } catch (error) {
        console.error("JWT Error:", error);
        res.status(401).json({ success: false, message: "Invalid token" });
    }
};


module.exports = { authenticate };
