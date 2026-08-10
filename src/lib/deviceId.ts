const KEY = "weaning_device_id";

export function getDeviceId(): string {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    localStorage.setItem(KEY, id);
  }
  return id;
}
