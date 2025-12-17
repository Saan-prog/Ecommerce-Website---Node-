const express = require("express");
const router = express.Router();
const { getAllCategories } = require("../Controller/userCategories.js");

router.get("/all", getAllCategories);


module.exports = router;