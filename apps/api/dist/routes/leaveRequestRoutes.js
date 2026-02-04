"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const LeaveRequestController_1 = __importDefault(require("../controllers/LeaveRequestController"));
const security_1 = require("../middlewares/security");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticateToken);
// GET /api/leave-requests - Get all leave requests (any authenticated user)
router.get('/', LeaveRequestController_1.default.getAllLeaveRequests.bind(LeaveRequestController_1.default));
// POST /api/leave-requests - Create leave request (any authenticated user can create their own)
router.post('/', security_1.apiLimiter, security_1.validateLeaveRequest, security_1.validateRequest, LeaveRequestController_1.default.createLeaveRequest.bind(LeaveRequestController_1.default));
// PATCH /api/leave-requests/:id - Update leave request status (HR_ADMIN only - for approval/rejection)
router.patch('/:id', auth_1.requireAdmin, security_1.apiLimiter, LeaveRequestController_1.default.updateLeaveRequest.bind(LeaveRequestController_1.default));
// DELETE /api/leave-requests/:id - Delete leave request (HR_ADMIN only)
router.delete('/:id', auth_1.requireAdmin, security_1.apiLimiter, LeaveRequestController_1.default.deleteLeaveRequest.bind(LeaveRequestController_1.default));
// GET /api/leave-balances/:employeeId - Get leave balances for employee (any authenticated user)
router.get('/balances/:employeeId', LeaveRequestController_1.default.getLeaveBalances.bind(LeaveRequestController_1.default));
exports.default = router;
