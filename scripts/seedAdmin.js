const bcrypt = require ("bcrypt");
const Admin = require ("../models/adminModel.js");

async function seedAdmin(){
    try{
        const existingAdmin = await Admin.findOne({ role: "admin"})

        if(existingAdmin) {
            // console.log("Admin already exists: ", existingAdmin);
            return;
        }
        const newAdmin = {
            name: "Admin",
            email: "admin@example.com",
            phone: 1234567890,
            password: "admin123",
            role: "admin",
        };
        const hashedPassword = await bcrypt.hash(newAdmin.password,10);
        newAdmin.password = hashedPassword;

        const adminData = await Admin.create(newAdmin);
        console.log("Admin created:", adminData.name);

    }catch(err){
        console.error("Error seeding Admin:", err.message);
    }
}

module.exports = seedAdmin;