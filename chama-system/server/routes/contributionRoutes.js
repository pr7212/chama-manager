const express = require("express");

const router = express.Router();

const verifyToken =
    require("../middleware/authMiddleware");
const authorizeRoles =
    require("../middleware/roleMiddleware");

const {
    addContribution,
    getContributions
} = require("../controllers/contributionController");

router.post(
    "/",
    verifyToken,
    authorizeRoles("admin"),
    addContribution
);

router.get(
    "/",
    verifyToken,
    getContributions
);

module.exports = router;
