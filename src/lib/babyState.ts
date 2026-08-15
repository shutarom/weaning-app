import { safeGetItem, safeRemoveItem, safeSetItem } from "./storage";

const KEY = "weaning_baby_id";

export function getBabyId(): string | null {
  return safeGetItem(KEY);
}
export function setBabyId(babyId: string): void {
  safeSetItem(KEY, babyId);
}
export function clearBabyId(): void {
  safeRemoveItem(KEY);
}
