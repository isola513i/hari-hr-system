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
exports.OrgChartController = void 0;
const OrgChartService_1 = __importDefault(require("../services/OrgChartService"));
class OrgChartController {
    /**
     * GET /api/org-chart
     * Get full org chart with enriched data
     * Optional query param: ?department=Engineering
     */
    getOrgChart(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const department = req.query.department;
                const nodes = yield OrgChartService_1.default.getOrgChart(department);
                res.json(nodes);
            }
            catch (error) {
                console.error("Error fetching org chart:", error);
                res.status(500).json({ error: "Failed to fetch org chart" });
            }
        });
    }
    /**
     * GET /api/org-chart/subtree/:employeeId
     * Get org chart subtree rooted at specific employee
     */
    getSubTree(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { employeeId } = req.params;
                if (!employeeId) {
                    res.status(400).json({ error: "Employee ID is required" });
                    return;
                }
                const nodes = yield OrgChartService_1.default.getSubTree(employeeId);
                if (nodes.length === 0) {
                    res.status(404).json({ error: "Employee not found" });
                    return;
                }
                res.json(nodes);
            }
            catch (error) {
                console.error("Error fetching org chart subtree:", error);
                res.status(500).json({ error: "Failed to fetch org chart subtree" });
            }
        });
    }
}
exports.OrgChartController = OrgChartController;
exports.default = new OrgChartController();
