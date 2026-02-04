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
const AttendanceService_1 = __importDefault(require("../services/AttendanceService"));
const security_1 = require("../middlewares/security");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticateToken);
/**
 * POST /api/attendance/clock-in
 * Clock in for the current user
 */
router.post('/clock-in', security_1.apiLimiter, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const employeeId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.employeeId;
        if (!employeeId) {
            return res.status(400).json({ error: 'Employee ID not found' });
        }
        const attendance = yield AttendanceService_1.default.clockIn({
            employeeId,
            notes: req.body.notes,
        });
        res.status(201).json(attendance);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to clock in';
        res.status(400).json({ error: message });
    }
}));
/**
 * POST /api/attendance/clock-out
 * Clock out for the current user
 */
router.post('/clock-out', security_1.apiLimiter, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const employeeId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.employeeId;
        if (!employeeId) {
            return res.status(400).json({ error: 'Employee ID not found' });
        }
        const attendance = yield AttendanceService_1.default.clockOut({
            employeeId,
            notes: req.body.notes,
        });
        res.json(attendance);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to clock out';
        res.status(400).json({ error: message });
    }
}));
/**
 * GET /api/attendance/today
 * Get today's attendance status for current user
 */
router.get('/today', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const employeeId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.employeeId;
        if (!employeeId) {
            return res.status(400).json({ error: 'Employee ID not found' });
        }
        const attendance = yield AttendanceService_1.default.getTodayStatus(employeeId);
        res.json(attendance || { status: 'Not clocked in' });
    }
    catch (error) {
        console.error('Error getting today status:', error);
        res.status(500).json({ error: 'Failed to get attendance status' });
    }
}));
/**
 * GET /api/attendance/my-history
 * Get attendance history for current user
 */
router.get('/my-history', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const employeeId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.employeeId;
        if (!employeeId) {
            return res.status(400).json({ error: 'Employee ID not found' });
        }
        const { startDate, endDate } = req.query;
        const attendance = yield AttendanceService_1.default.getAttendanceByEmployee(employeeId, startDate, endDate);
        res.json(attendance);
    }
    catch (error) {
        console.error('Error getting attendance history:', error);
        res.status(500).json({ error: 'Failed to get attendance history' });
    }
}));
/**
 * GET /api/attendance/employee/:employeeId
 * Get attendance for a specific employee (admin or self)
 */
router.get('/employee/:employeeId', (0, auth_1.requireOwnerOrAdmin)((req) => req.params.employeeId), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { employeeId } = req.params;
        const { startDate, endDate } = req.query;
        const attendance = yield AttendanceService_1.default.getAttendanceByEmployee(employeeId, startDate, endDate);
        res.json(attendance);
    }
    catch (error) {
        console.error('Error getting employee attendance:', error);
        res.status(500).json({ error: 'Failed to get attendance' });
    }
}));
/**
 * GET /api/attendance/summary/:employeeId
 * Get attendance summary for an employee
 */
router.get('/summary/:employeeId', (0, auth_1.requireOwnerOrAdmin)((req) => req.params.employeeId), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { employeeId } = req.params;
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate are required' });
        }
        const summary = yield AttendanceService_1.default.getAttendanceSummary(employeeId, startDate, endDate);
        res.json(summary);
    }
    catch (error) {
        console.error('Error getting attendance summary:', error);
        res.status(500).json({ error: 'Failed to get attendance summary' });
    }
}));
exports.default = router;
