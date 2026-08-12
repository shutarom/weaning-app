import type { BabyProfile, DailyLog, DailyPlan, IngredientStatus } from "../domain/types";
import { loadAllLogs, loadAllPlans, mergeFromCloud } from "./localStore";
import { loadProfile, mergeProfileFromCloud } from "./profileStore";
import { loadIngredientStatuses, mergeIngredientStatusesFromCloud } from "./ingredientStore";

export type BackupFile = {
  schema: "weaning-app-backup";
  version: 1;
  exportedAt: string;
  profile: BabyProfile;
  ingredientStatuses: Record<string, IngredientStatus>;
  logs: Record<string, DailyLog>;
  plans: Record<string, DailyPlan>;
};

export function buildBackup(): BackupFile {
  return {
    schema: "weaning-app-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    profile: loadProfile(),
    ingredientStatuses: loadIngredientStatuses(),
    logs: loadAllLogs(),
    plans: loadAllPlans(),
  };
}

export function serializeBackup(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2);
}

export type ParsedBackup = {
  backup: BackupFile;
  counts: { logs: number; plans: number; ingredientStatuses: number };
};

/** JSON文字列を検証してパースする。壊れたファイルや別アプリのファイルは例外を投げる。 */
export function parseBackup(json: string): ParsedBackup {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error("JSONとして読み取れませんでした");
  }
  if (
    typeof raw !== "object" || raw === null ||
    (raw as Partial<BackupFile>).schema !== "weaning-app-backup"
  ) {
    throw new Error("このアプリのバックアップファイルではありません");
  }
  const backup = raw as BackupFile;
  return {
    backup,
    counts: {
      logs: Object.keys(backup.logs ?? {}).length,
      plans: Object.keys(backup.plans ?? {}).length,
      ingredientStatuses: Object.keys(backup.ingredientStatuses ?? {}).length,
    },
  };
}

/**
 * バックアップを既存データへ取り込む。既存のマージ関数(updatedAtが新しい方を採用)を
 * そのまま再利用するため、誤って古いバックアップを読み込んでも最新の記録を
 * 巻き戻すことはない。
 */
export function importBackup(backup: BackupFile): void {
  mergeFromCloud(backup.logs ?? {}, backup.plans ?? {});
  mergeIngredientStatusesFromCloud(backup.ingredientStatuses ?? {});
  if (backup.profile) mergeProfileFromCloud(backup.profile);
}
