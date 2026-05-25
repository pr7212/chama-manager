const express = require("express");

const router = express.Router();

const verifyToken =
    require("../middleware/authMiddleware");
const authorizeRoles =
    require("../middleware/roleMiddleware");

const {
    issueLoan,
    recordLoanPayment,
    getLoans
} = require("../controllers/loanController");

router.post(
    "/",
    verifyToken,
    authorizeRoles("admin"),
    issueLoan
);

router.post(
    "/payment",
    verifyToken,
    authorizeRoles("admin"),
    recordLoanPayment
);

router.get(
    "/",
    verifyToken,
    getLoans
);

module.exports = router;
