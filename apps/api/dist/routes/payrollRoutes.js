"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const PayrollService_1 = __importDefault(require("../services/PayrollService"));
const security_1 = require("../middlewares/security");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticateToken);
/**
 * POST /api/payroll
 * Create a new payroll record (admin only)
 */
router.post('/', auth_1.requireAdmin, security_1.apiLimiter, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const payroll = yield PayrollService_1.default.createPayroll(req.body);
        res.status(201).json(payroll);
    }
    catch (error) {
        console.error('Error creating payroll:', error);
        const message = error instanceof Error ? error.message : 'Failed to create payroll';
        res.status(400).json({ error: message });
    }
}));
/**
 * GET /api/payroll/my-payslips
 * Get payroll history for current user
 */
router.get('/my-payslips', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const employeeId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.employeeId;
        if (!employeeId) {
            return res.status(400).json({ error: 'Employee ID not found' });
        }
        const limit = parseInt(req.query.limit, 10) || 12;
        const payroll = yield PayrollService_1.default.getPayrollByEmployee(employeeId, limit);
        res.json(payroll);
    }
    catch (error) {
        console.error('Error getting payslips:', error);
        res.status(500).json({ error: 'Failed to get payslips' });
    }
}));
/**
 * GET /api/payroll/employee/:employeeId
 * Get payroll for a specific employee (admin or self)
 */
router.get('/employee/:employeeId', (0, auth_1.requireOwnerOrAdmin)((req) => req.params.employeeId), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { employeeId } = req.params;
        const limit = parseInt(req.query.limit, 10) || 12;
        const payroll = yield PayrollService_1.default.getPayrollByEmployee(employeeId, limit);
        res.json(payroll);
    }
    catch (error) {
        console.error('Error getting employee payroll:', error);
        res.status(500).json({ error: 'Failed to get payroll' });
    }
}));
/**
 * GET /api/payroll/:id
 * Get a specific payroll record
 */
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const payroll = yield PayrollService_1.default.getPayrollById(req.params.id);
        if (!payroll) {
            return res.status(404).json({ error: 'Payroll record not found' });
        }
        // Check if user can access this payroll
        const isOwner = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.employeeId) === payroll.employeeId;
        const isAdmin = ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) === 'HR_ADMIN';
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ error: 'Access denied' });
        }
        res.json(payroll);
    }
    catch (error) {
        console.error('Error getting payroll:', error);
        res.status(500).json({ error: 'Failed to get payroll' });
    }
}));
/**
 * PATCH /api/payroll/:id/status
 * Update payroll status (admin only)
 */
router.patch('/:id/status', auth_1.requireAdmin, security_1.apiLimiter, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status, paymentMethod } = req.body;
        if (!['Pending', 'Processed', 'Paid'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        const payroll = yield PayrollService_1.default.updatePayrollStatus(req.params.id, status, paymentMethod);
        res.json(payroll);
    }
    catch (error) {
        console.error('Error updating payroll status:', error);
        const message = error instanceof Error ? error.message : 'Failed to update payroll';
        res.status(400).json({ error: message });
    }
}));
/**
 * GET /api/payroll/summary
 * Get payroll summary for a period (admin only)
 */
router.get('/reports/summary', auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate are required' });
        }
        const summary = yield PayrollService_1.default.getPayrollSummary(startDate, endDate);
        res.json(summary);
    }
    catch (error) {
        console.error('Error getting payroll summary:', error);
        res.status(500).json({ error: 'Failed to get payroll summary' });
    }
}));
/**
 * POST /api/payroll/salary/:employeeId
 * Update employee salary (admin only)
 */
router.post('/salary/:employeeId', auth_1.requireAdmin, security_1.apiLimiter, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { employeeId } = req.params;
        const { newSalary, changeReason } = req.body;
        if (!newSalary || !changeReason) {
            return res.status(400).json({ error: 'newSalary and changeReason are required' });
        }
        const salaryHistory = yield PayrollService_1.default.updateSalary(employeeId, newSalary, changeReason, (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.employeeId) !== null && _b !== void 0 ? _b : undefined);
        res.status(201).json(salaryHistory);
    }
    catch (error) {
        console.error('Error updating salary:', error);
        const message = error instanceof Error ? error.message : 'Failed to update salary';
        res.status(400).json({ error: message });
    }
}));
/**
 * GET /api/payroll/salary/:employeeId/history
 * Get salary history for an employee (admin or self)
 */
router.get('/salary/:employeeId/history', (0, auth_1.requireOwnerOrAdmin)((req) => req.params.employeeId), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { employeeId } = req.params;
        const history = yield PayrollService_1.default.getSalaryHistory(employeeId);
        res.json(history);
    }
    catch (error) {
        console.error('Error getting salary history:', error);
        res.status(500).json({ error: 'Failed to get salary history' });
    }
}));
exports.default = router;
