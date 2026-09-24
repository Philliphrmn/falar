/** Leitner-Boxen: Abstand bis zur nächsten Wiederholung in Tagen */
const INTERVAL_DAYS = [0, 1, 2, 4, 8, 16, 32];
export const MAX_BOX = 6;

export type ReviewState = {
  item_id: string;
  box: number;
  due_at: string;
  correct_count: number;
  wrong_count: number;
};

export function nextState(
  itemId: string,
  prev: ReviewState | undefined,
  correct: boolean,
  now = new Date(),
): ReviewState {
  const box = correct ? Math.min((prev?.box ?? 0) + 1, MAX_BOX) : 1;
  const due = new Date(now);
  due.setHours(4, 0, 0, 0); // fällig ab früh morgens, nicht auf die Minute genau
  due.setDate(due.getDate() + INTERVAL_DAYS[box]);
  return {
    item_id: itemId,
    box,
    due_at: due.toISOString(),
    correct_count: (prev?.correct_count ?? 0) + (correct ? 1 : 0),
    wrong_count: (prev?.wrong_count ?? 0) + (correct ? 0 : 1),
  };
}

export const boxLabel = (box: number) =>
  ["", "neu", "lernend", "lernend", "sicher", "sicher", "gefestigt"][box] ?? "";
