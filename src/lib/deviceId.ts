import { newLocalId } from "./compat";
import { safeGetItem, safeSetItem } from "./storage";

const KEY = "weaning_device_id";

// localStorage が使えない環境でも同一セッション中は同じIDを返せるようにしておく
// （毎回違うIDになると members への登録が増え続けてしまう）。
let memoryFallback: string | null = null;

export function getDeviceId(): string {
  const stored = safeGetItem(KEY);
  if (stored) return stored;
  if (memoryFallback) return memoryFallback;
  const id = newLocalId(16);
  memoryFallback = id;
  safeSetItem(KEY, id);
  return id;
}
