export function getReviewPeriods(refDate: Date = new Date()): string[] {
  const year = refDate.getFullYear();
  return [
    `${year}-H1`, `${year}-H2`,
    `${year}-Q1`, `${year}-Q2`, `${year}-Q3`, `${year}-Q4`,
    `${year - 1}-H2`, `${year - 1}-Q4`,
  ];
}

export const REVIEW_PERIODS = getReviewPeriods();
