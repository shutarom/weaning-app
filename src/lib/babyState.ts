const KEY = "weaning_baby_id";

export function getBabyId(): string | null {
  return localStorage.getItem(KEY);
}
export function setBabyId(babyId: string) {
  localStorage.setItem(KEY, babyId);
}
export function clearBabyId() {
  localStorage.removeItem(KEY);
}
