"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const DashboardController_1 = __importDefault(require("../controllers/DashboardController"));
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// All dashboard routes require authentication
router.use(auth_1.authenticateToken);
// GET /api/dashboard/employee-stats - Get employee dashboard stats
router.get("/employee-stats", DashboardController_1.default.getEmployeeStats.bind(DashboardController_1.default));
// GET /api/dashboard/my-team - Get team members
router.get("/my-team", DashboardController_1.default.getMyTeam.bind(DashboardController_1.default));
// GET /api/dashboard/direct-reports - Get direct reports (for managers)
router.get("/direct-reports", DashboardController_1.default.getDirectReports.bind(DashboardController_1.default));
// GET /api/dashboard/my-team-hierarchy - Get full team hierarchy (manager, peers, direct reports, stats)
router.get("/my-team-hierarchy", DashboardController_1.default.getMyTeamHierarchy.bind(DashboardController_1.default));
exports.default = router;
