import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * 画面に出る日本語に、キリル文字やハングルが混ざっていないことを確認する。
 *
 * 「材料」を「материал」、「がゆ」を「가ゆ」と書いてしまう類の混入は、
 * 見た目が似ているため目視レビューをすり抜けやすく、実際に2回発生した。
 * 表示テキストの品質はテストで担保する。
 */
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...sourceFiles(p));
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

// このファイル自身は説明のために該当文字を含むので対象外にする
const SELF = "uiText.test.ts";
const FILES = sourceFiles(join(process.cwd(), "src")).filter((f) => !f.endsWith(SELF));

describe("表示テキストの文字種", () => {
  it("srcの.ts/.tsxが1つ以上見つかる（探索の失敗で素通りしないため）", () => {
    expect(FILES.length).toBeGreaterThan(10);
  });

  it("キリル文字が混入していない", () => {
    for (const f of FILES) {
      const lines = readFileSync(f, "utf8").split("\n");
      lines.forEach((line: string, i: number) => {
        expect(/[Ѐ-ӿ]/.test(line), `${f}:${i + 1} にキリル文字: ${line.trim()}`).toBe(false);
      });
    }
  });

  it("ハングルが混入していない", () => {
    for (const f of FILES) {
      const lines = readFileSync(f, "utf8").split("\n");
      lines.forEach((line: string, i: number) => {
        expect(/[가-힯ᄀ-ᇿ]/.test(line), `${f}:${i + 1} にハングル: ${line.trim()}`).toBe(false);
      });
    }
  });
});
