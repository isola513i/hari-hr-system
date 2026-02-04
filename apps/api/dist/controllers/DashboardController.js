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
exports.DashboardController = void 0;
const DashboardService_1 = __importDefault(require("../services/DashboardService"));
class DashboardController {
    /**
     * GET /api/dashboard/employee-stats
     * Get dashboard stats for the current employee
     */
    getEmployeeStats(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const employeeId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.employeeId;
                if (!employeeId) {
                    res.status(400).json({ error: "Employee ID not found" });
                    return;
                }
                const stats = yield DashboardService_1.default.getEmployeeStats(employeeId);
                res.json(stats);
            }
            catch (error) {
                console.error("Error fetching employee stats:", error);
                res.status(500).json({ error: "Failed to fetch employee stats" });
            }
        });
    }
    /**
     * GET /api/dashboard/my-team
     * Get team members (colleagues in same department)
     */
    getMyTeam(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const employeeId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.employeeId;
                if (!employeeId) {
                    res.status(400).json({ error: "Employee ID not found" });
                    return;
                }
                const limit = parseInt(req.query.limit) || 5;
                const team = yield DashboardService_1.default.getMyTeam(employeeId, limit);
                res.json(team);
            }
            catch (error) {
                console.error("Error fetching team:", error);
                res.status(500).json({ error: "Failed to fetch team" });
            }
        });
    }
    /**
     * GET /api/dashboard/direct-reports
     * Get direct reports for a manager
     */
    getDirectReports(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const employeeId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.employeeId;
                if (!employeeId) {
                    res.status(400).json({ error: "Employee ID not found" });
                    return;
                }
                const directReports = yield DashboardService_1.default.getDirectReports(employeeId);
                res.json(directReports);
            }
            catch (error) {
                console.error("Error fetching direct reports:", error);
                res.status(500).json({ error: "Failed to fetch direct reports" });
            }
        });
    }
    /**
     * GET /api/dashboard/my-team-hierarchy
     * Get full team hierarchy (manager, peers, direct reports, stats)
     */
    getMyTeamHierarchy(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const employeeId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.employeeId;
                if (!employeeId) {
                    res.status(400).json({ error: "Employee ID not found" });
                    return;
                }
                const hierarchy = yield DashboardService_1.default.getMyTeamHierarchy(employeeId);
                res.json(hierarchy);
            }
            catch (error) {
                console.error("Error fetching team hierarchy:", error);
                res.status(500).json({ error: "Failed to fetch team hierarchy" });
            }
        });
    }
}
exports.DashboardController = DashboardController;
exports.default = new DashboardController();
