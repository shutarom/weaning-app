const KEY = "weaning_household_id";

export function getHouseholdId(): string | null {
  return localStorage.getItem(KEY);
}
export function setHouseholdId(hid: string) {
  localStorage.setItem(KEY, hid);
}
export function clearHouseholdId() {
  localStorage.removeItem(KEY);
}
