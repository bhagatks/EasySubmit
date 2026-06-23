/** Labels that must never be captured or auto-filled (Field Memory + Workday autofill). */
export const APPLICATION_FIELD_DENYLIST =
  /social.?security|ssn|\bsin\b|tax.?id|bank.?account|password|credit.?card/i;

export function isDenylistedApplicationField(label: string): boolean {
  return APPLICATION_FIELD_DENYLIST.test(label);
}
