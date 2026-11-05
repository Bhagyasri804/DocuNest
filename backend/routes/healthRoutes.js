const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "DocuNest backend is healthy",
        status: "UP",
        timestamp: new Date().toISOString()
    });
});

module.exports = router;