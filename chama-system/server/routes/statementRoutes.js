const express = require("express");

const router = express.Router();

const verifyToken =
    require("../middleware/authMiddleware");

const {
    getMemberStatement,
    generateStatementPDF
} = require("../controllers/statementController");

router.get(
    "/pdf/:id",
    verifyToken,
    generateStatementPDF
);

router.get(
    "/:id",
    verifyToken,
    getMemberStatement
);

module.exports = router;
