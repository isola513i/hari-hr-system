import { Request, Response } from "express";
import SurveyService from "../services/SurveyService";
import { SURVEY_CATEGORIES, SurveyCategory } from "../models/Survey";
import NotificationService from "../services/NotificationService";

export class SurveyController {
  /**
   * GET /api/surveys - List all surveys
   */
  async list(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = req.user?.employeeId ?? null;
      const surveys = await SurveyService.listSurveys(employeeId);
      res.json(surveys);
    } catch (error) {
      console.error("Error listing surveys:", error);
      res.status(500).json({ error: "Failed to list surveys" });
    }
  }

  /**
   * GET /api/surveys/sentiment - Sentiment overview
   */
  async sentiment(_req: Request, res: Response): Promise<void> {
    try {
      const overview = await SurveyService.getSentimentOverview();
      res.json(overview);
    } catch (error) {
      console.error("Error fetching sentiment:", error);
      res.status(500).json({ error: "Failed to fetch sentiment data" });
    }
  }

  /**
   * GET /api/surveys/:id - Survey detail with questions
   */
  async detail(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = req.user?.employeeId ?? null;
      const survey = await SurveyService.getSurveyDetail(req.params.id, employeeId);
      if (!survey) {
        res.status(404).json({ error: "Survey not found" });
        return;
      }
      res.json(survey);
    } catch (error) {
      console.error("Error fetching survey:", error);
      res.status(500).json({ error: "Failed to fetch survey" });
    }
  }

  /**
   * POST /api/surveys - Create survey (admin)
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const { title, questions, allowRetake } = req.body;

      if (!title || typeof title !== "string" || title.trim() === "") {
        res.status(400).json({ error: "Title is required" });
        return;
      }

      if (!Array.isArray(questions) || questions.length === 0) {
        res.status(400).json({ error: "At least one question is required" });
        return;
      }

      const validCategories = new Set<string>(SURVEY_CATEGORIES);
      for (const q of questions) {
        if (!q.questionText || typeof q.questionText !== "string" || q.questionText.trim() === "") {
          res.status(400).json({ error: "Each question must have questionText" });
          return;
        }
        if (!validCategories.has(q.category)) {
          res.status(400).json({
            error: `Invalid category "${q.category}". Must be one of: ${SURVEY_CATEGORIES.join(", ")}`,
          });
          return;
        }
      }

      const normalizedQuestions = questions.map((q: any, i: number) => ({
        questionText: q.questionText.trim(),
        category: q.category as SurveyCategory,
        sortOrder: q.sortOrder ?? i,
      }));

      const result = await SurveyService.createSurvey(req.user!.userId, {
        title: title.trim(),
        questions: normalizedQuestions,
        allowRetake: allowRetake === true,
      });

      // Notify all employees about the new survey
      NotificationService.notifyAll({
        title: 'New Survey Available',
        message: `A new survey "${title.trim()}" is now available. Please take a moment to respond.`,
        type: 'info',
        link: '/wellbeing',
      }).catch((err) => console.error('Failed to notify employees about new survey:', err));

      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating survey:", error);
      res.status(500).json({ error: "Failed to create survey" });
    }
  }

  /**
   * POST /api/surveys/:id/respond - Submit anonymous response
   */
  async respond(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = req.user?.employeeId;
      if (!employeeId) {
        res.status(400).json({ error: "Employee ID is required" });
        return;
      }

      const { responses } = req.body;

      if (!Array.isArray(responses) || responses.length === 0) {
        res.status(400).json({ error: "At least one response is required" });
        return;
      }

      for (const r of responses) {
        if (!r.questionId) {
          res.status(400).json({ error: "Each response must have questionId" });
          return;
        }
        if (typeof r.rating !== "number" || r.rating < 1 || r.rating > 5) {
          res.status(400).json({ error: "Rating must be between 1 and 5" });
          return;
        }
      }

      await SurveyService.submitResponse(req.params.id, employeeId, { responses });
      res.json({ message: "Response submitted successfully" });
    } catch (error: any) {
      if (error.status === 409) {
        res.status(409).json({ error: error.message });
        return;
      }
      console.error("Error submitting survey response:", error);
      res.status(500).json({ error: "Failed to submit response" });
    }
  }

  /**
   * PATCH /api/surveys/:id/close - Close survey (admin)
   */
  async close(req: Request, res: Response): Promise<void> {
    try {
      const closed = await SurveyService.closeSurvey(req.params.id);
      if (!closed) {
        res.status(404).json({ error: "Survey not found or already closed" });
        return;
      }
      res.json({ message: "Survey closed successfully" });
    } catch (error) {
      console.error("Error closing survey:", error);
      res.status(500).json({ error: "Failed to close survey" });
    }
  }

  /**
   * PATCH /api/surveys/:id/reopen - Reopen closed survey (admin)
   */
  async reopen(req: Request, res: Response): Promise<void> {
    try {
      const reopened = await SurveyService.reopenSurvey(req.params.id);
      if (!reopened) {
        res.status(404).json({ error: "Survey not found or already active" });
        return;
      }
      res.json({ message: "Survey reopened successfully" });
    } catch (error) {
      console.error("Error reopening survey:", error);
      res.status(500).json({ error: "Failed to reopen survey" });
    }
  }

  /**
   * DELETE /api/surveys/:id - Delete survey (admin)
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const deleted = await SurveyService.deleteSurvey(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: "Survey not found" });
        return;
      }
      res.json({ message: "Survey deleted successfully" });
    } catch (error) {
      console.error("Error deleting survey:", error);
      res.status(500).json({ error: "Failed to delete survey" });
    }
  }
}

export default new SurveyController();
