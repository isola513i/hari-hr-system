"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const OrgChartController_1 = __importDefault(require("../controllers/OrgChartController"));
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// All org-chart routes require authentication
router.use(auth_1.authenticateToken);
// GET /api/org-chart - Get full org chart (optional ?department=Engineering filter)
router.get("/", OrgChartController_1.default.getOrgChart.bind(OrgChartController_1.default));
// GET /api/org-chart/subtree/:employeeId - Get subtree rooted at specific employee
router.get("/subtree/:employeeId", OrgChartController_1.default.getSubTree.bind(OrgChartController_1.default));
exports.default = router;
