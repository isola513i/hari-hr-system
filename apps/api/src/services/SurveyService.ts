import pool, { query } from "../db";
import { getOrSet } from "../utils/cache";
import type {
  CreateSurveyRequest,
  SubmitSurveyRequest,
  SurveyListItem,
  SurveyDetail,
  SentimentOverview,
} from "../models/Survey";

export class SurveyService {
  async createSurvey(
    createdBy: string,
    data: CreateSurveyRequest
  ): Promise<{ id: string }> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const surveyResult = await client.query(
        `INSERT INTO surveys (title, created_by, allow_retake) VALUES ($1, $2, $3) RETURNING id`,
        [data.title, createdBy, data.allowRetake ?? false]
      );
      const surveyId = surveyResult.rows[0].id;

      if (data.questions.length > 0) {
        const values: any[] = [];
        const placeholders: string[] = [];
        data.questions.forEach((q, i) => {
          const offset = i * 4;
          placeholders.push(
            `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`
          );
          values.push(surveyId, q.questionText, q.category, q.sortOrder);
        });

        await client.query(
          `INSERT INTO survey_questions (survey_id, question_text, category, sort_order) VALUES ${placeholders.join(", ")}`,
          values
        );
      }

      await client.query("COMMIT");
      return { id: surveyId };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async listSurveys(employeeId: string | null): Promise<SurveyListItem[]> {
    const result = await query(
      `SELECT
         s.id,
         s.title,
         s.status,
         s.allow_retake,
         s.created_at,
         s.closed_at,
         COUNT(DISTINCT sq.id)::int AS question_count,
         (SELECT COUNT(DISTINCT sc2.employee_id)::int
          FROM survey_completions sc2
          WHERE sc2.survey_id = s.id) AS response_count,
         CASE WHEN $1::uuid IS NOT NULL
           THEN EXISTS(
             SELECT 1 FROM survey_completions sc
             WHERE sc.survey_id = s.id AND sc.employee_id = $1
           )
           ELSE false
         END AS has_completed
       FROM surveys s
       LEFT JOIN survey_questions sq ON sq.survey_id = s.id
       GROUP BY s.id
       ORDER BY s.created_at DESC`,
      [employeeId]
    );

    return result.rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      allowRetake: r.allow_retake,
      createdAt: r.created_at,
      closedAt: r.closed_at,
      questionCount: r.question_count,
      responseCount: r.response_count,
      hasCompleted: r.has_completed,
    }));
  }

  async getSurveyDetail(
    surveyId: string,
    employeeId: string | null
  ): Promise<SurveyDetail | null> {
    const surveyResult = await query(
      `SELECT
         s.id, s.title, s.status, s.allow_retake, s.created_at, s.closed_at,
         CASE WHEN $2::uuid IS NOT NULL
           THEN EXISTS(
             SELECT 1 FROM survey_completions sc
             WHERE sc.survey_id = s.id AND sc.employee_id = $2
           )
           ELSE false
         END AS has_completed
       FROM surveys s
       WHERE s.id = $1`,
      [surveyId, employeeId]
    );

    if (surveyResult.rows.length === 0) return null;

    const survey = surveyResult.rows[0];

    const questionsResult = await query(
      `SELECT id, question_text, category, sort_order
       FROM survey_questions
       WHERE survey_id = $1
       ORDER BY sort_order, id`,
      [surveyId]
    );

    return {
      id: survey.id,
      title: survey.title,
      status: survey.status,
      allowRetake: survey.allow_retake,
      createdAt: survey.created_at,
      closedAt: survey.closed_at,
      hasCompleted: survey.has_completed,
      questions: questionsResult.rows.map((q: any) => ({
        id: q.id,
        questionText: q.question_text,
        category: q.category,
        sortOrder: q.sort_order,
      })),
    };
  }

  async submitResponse(
    surveyId: string,
    employeeId: string,
    data: SubmitSurveyRequest
  ): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Check if survey allows retake
      const surveyRow = await client.query(
        `SELECT allow_retake FROM surveys WHERE id = $1`,
        [surveyId]
      );
      const allowRetake = surveyRow.rows[0]?.allow_retake === true;

      // Check if already completed
      const existing = await client.query(
        `SELECT id FROM survey_completions WHERE survey_id = $1 AND employee_id = $2`,
        [surveyId, employeeId]
      );

      if (existing.rows.length > 0) {
        if (!allowRetake) {
          await client.query("ROLLBACK");
          throw Object.assign(new Error("You have already completed this survey"), { status: 409 });
        }

        // Delete old completion record and get its timestamp
        const deletedCompletion = await client.query(
          `DELETE FROM survey_completions WHERE survey_id = $1 AND employee_id = $2 RETURNING completed_at`,
          [surveyId, employeeId]
        );

        // Delete old responses for this survey's questions using the exact completion timestamp
        if (deletedCompletion.rows.length > 0) {
          await client.query(
            `DELETE FROM survey_responses
             WHERE question_id IN (SELECT id FROM survey_questions WHERE survey_id = $1)
               AND submitted_at = $2`,
            [surveyId, deletedCompletion.rows[0].completed_at]
          );
        }
      }

      // Insert anonymous responses
      if (data.responses.length > 0) {
        const values: any[] = [];
        const placeholders: string[] = [];
        data.responses.forEach((r, i) => {
          const offset = i * 2;
          placeholders.push(`($${offset + 1}, $${offset + 2})`);
          values.push(r.questionId, r.rating);
        });

        await client.query(
          `INSERT INTO survey_responses (question_id, rating) VALUES ${placeholders.join(", ")}`,
          values
        );
      }

      // Record completion
      await client.query(
        `INSERT INTO survey_completions (survey_id, employee_id) VALUES ($1, $2)`,
        [surveyId, employeeId]
      );

      await client.query("COMMIT");
    } catch (err: any) {
      await client.query("ROLLBACK");
      if (err.status === 409) throw err;
      throw err;
    } finally {
      client.release();
    }
  }

  async closeSurvey(surveyId: string): Promise<boolean> {
    const result = await query(
      `UPDATE surveys SET status = 'closed', closed_at = CURRENT_TIMESTAMP WHERE id = $1 AND status = 'active' RETURNING id`,
      [surveyId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async reopenSurvey(surveyId: string): Promise<boolean> {
    const result = await query(
      `UPDATE surveys SET status = 'active', closed_at = NULL WHERE id = $1 AND status = 'closed' RETURNING id`,
      [surveyId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async deleteSurvey(surveyId: string): Promise<boolean> {
    const result = await query(`DELETE FROM surveys WHERE id = $1 RETURNING id`, [surveyId]);
    return (result.rowCount ?? 0) > 0;
  }

  async getSentimentOverview(): Promise<SentimentOverview> {
    return getOrSet('sentiment_overview', async () => {
      // Category breakdown: average rating per category across ALL surveys
      const catResult = await query(
        `SELECT
           sq.category,
           ROUND(AVG(sr.rating) * 20)::int AS score,
           COUNT(sr.id)::int AS response_count
         FROM survey_responses sr
         JOIN survey_questions sq ON sq.id = sr.question_id
         GROUP BY sq.category
         ORDER BY sq.category`
      );

      // Total unique respondents (across all surveys)
      const respondentsResult = await query(
        `SELECT COUNT(DISTINCT employee_id)::int AS total FROM survey_completions`
      );

      // Total active employees
      const employeesResult = await query(
        `SELECT COUNT(*)::int AS total FROM employees WHERE status = 'Active'`
      );

      const totalResponses = respondentsResult.rows[0]?.total ?? 0;
      const totalEmployees = employeesResult.rows[0]?.total ?? 0;

      const categoryBreakdown = catResult.rows.map((r: any) => ({
        category: r.category,
        score: r.score,
        responseCount: r.response_count,
      }));

      const overallScore =
        categoryBreakdown.length > 0
          ? Math.round(
              categoryBreakdown.reduce((sum: number, c: any) => sum + c.score, 0) /
                categoryBreakdown.length
            )
          : 0;

      const responseRate =
        totalEmployees > 0 ? Math.round((totalResponses / totalEmployees) * 100) : 0;

      // Sentiment distribution: positive (4-5), neutral (3), negative (1-2)
      const distResult = await query(
        `SELECT
           COUNT(*) FILTER (WHERE sr.rating >= 4)::int AS positive,
           COUNT(*) FILTER (WHERE sr.rating = 3)::int  AS neutral,
           COUNT(*) FILTER (WHERE sr.rating <= 2)::int  AS negative,
           COUNT(*)::int AS total
         FROM survey_responses sr`
      );
      const dist = distResult.rows[0];
      const distTotal = dist?.total ?? 0;
      const distribution = distTotal > 0
        ? {
            positive: Math.round((dist.positive / distTotal) * 100),
            neutral:  Math.round((dist.neutral / distTotal) * 100),
            negative: Math.round((dist.negative / distTotal) * 100),
          }
        : { positive: 0, neutral: 0, negative: 0 };

      return {
        overallScore,
        responseRate,
        totalResponses,
        totalEmployees,
        categoryBreakdown,
        distribution,
      };
    }, 14400); // 4-hour TTL
  }
}

export default new SurveyService();
