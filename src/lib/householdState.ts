import { safeGetItem, safeRemoveItem, safeSetItem } from "./storage";

const KEY = "weaning_household_id";

export function getHouseholdId(): string | null {
  return safeGetItem(KEY);
}
export function setHouseholdId(hid: string) {
  safeSetItem(KEY, hid);
}
export function clearHouseholdId() {
  safeRemoveItem(KEY);
}
