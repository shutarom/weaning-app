import { readFileSync } from "node:fs";
import { beforeAll, afterAll, beforeEach, describe, it } from "vitest";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";

/**
 * firestore.rules のアクセス制御テスト。
 *
 * このセッションで、ルールとクライアントの噛み合わせを2回壊している。
 *   1. members の更新を一切禁止していたため、既存メンバーの再参加が必ず失敗した
 *   2. members の読み取りに isMember() を要求したため、「メンバーでないと自分が
 *      メンバーか確認できない」循環になり、新しい端末が一切参加できなくなった
 * どちらも本番にデプロイして実際に使われるまで気づけなかった。
 * 「誰が何を読み書きできるか」をここで固定する。
 *
 * 実行には Firestore エミュレータ(Javaが必要)が要る: npm run test:rules
 */

const PROJECT_ID = "weaning-app-rules-test";
const OWNER = "uid_owner";
const MEMBER = "uid_member";
const OUTSIDER = "uid_outsider";
const HID = "household1";
const BABY = "baby1";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  // ルールを迂回して初期データを作る
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "households", HID), { ownerUid: OWNER, schemaVersion: 2 });
    await setDoc(doc(db, "households", HID, "members", OWNER), { role: "owner" });
    await setDoc(doc(db, "households", HID, "members", MEMBER), { role: "member" });
    await setDoc(doc(db, "households", HID, "babies", BABY), { name: "赤ちゃん", order: 0 });
    await setDoc(doc(db, "households", HID, "babies", BABY, "logs", "2026-08-15"), { dateIso: "2026-08-15" });
  });
});

const asOutsider = () => testEnv.authenticatedContext(OUTSIDER).firestore();
const asMember = () => testEnv.authenticatedContext(MEMBER).firestore();
const asOwner = () => testEnv.authenticatedContext(OWNER).firestore();
const asAnon = () => testEnv.unauthenticatedContext().firestore();

describe("参加の経路（過去に2回壊した箇所）", () => {
  it("未参加の端末が、自分のメンバー文書の有無を確認できる", async () => {
    // これができないと joinHousehold の存在確認で落ち、新しい端末が参加できない
    const db = asOutsider();
    await assertSucceeds(getDoc(doc(db, "households", HID, "members", OUTSIDER)));
  });

  it("未参加の端末が、招待コードで参加できる", async () => {
    const db = asOutsider();
    await assertSucceeds(
      setDoc(doc(db, "households", HID, "members", OUTSIDER), { role: "member" })
    );
  });

  it("既存メンバーが、同じ招待コードで入り直せる", async () => {
    // 匿名認証のuidは端末に保持されるため、「同期エラー→再参加」では
    // 既存メンバーとして同じ文書を書き直すことになる
    const db = asMember();
    await assertSucceeds(
      setDoc(doc(db, "households", HID, "members", MEMBER), { role: "member" })
    );
  });

  it("未参加の端末が、招待コードを知っていれば世帯の存在を確認できる", async () => {
    const db = asOutsider();
    await assertSucceeds(getDoc(doc(db, "households", HID)));
  });
});

describe("メンバー情報の保護", () => {
  it("未参加の端末は、他人のメンバー文書を読めない", async () => {
    const db = asOutsider();
    await assertFails(getDoc(doc(db, "households", HID, "members", MEMBER)));
  });

  it("他人になりすましたメンバー文書は作れない", async () => {
    const db = asOutsider();
    await assertFails(
      setDoc(doc(db, "households", HID, "members", "someone_else"), { role: "member" })
    );
  });

  it("member が owner に昇格できない", async () => {
    const db = asMember();
    await assertFails(
      setDoc(doc(db, "households", HID, "members", MEMBER), { role: "owner" })
    );
  });

  it("オーナーでない端末が owner を名乗って参加できない", async () => {
    const db = asOutsider();
    await assertFails(
      setDoc(doc(db, "households", HID, "members", OUTSIDER), { role: "owner" })
    );
  });

  it("メンバー文書は削除できない", async () => {
    const db = asMember();
    const { deleteDoc } = await import("firebase/firestore");
    await assertFails(deleteDoc(doc(db, "households", HID, "members", MEMBER)));
  });
});

describe("記録データへのアクセス", () => {
  it("メンバーは記録を読める", async () => {
    const db = asMember();
    await assertSucceeds(getDocs(collection(db, "households", HID, "babies", BABY, "logs")));
  });

  it("メンバーは記録を書ける", async () => {
    const db = asMember();
    await assertSucceeds(
      setDoc(doc(db, "households", HID, "babies", BABY, "logs", "2026-08-16"), { dateIso: "2026-08-16" })
    );
  });

  it("非メンバーは記録を読めない", async () => {
    const db = asOutsider();
    await assertFails(getDocs(collection(db, "households", HID, "babies", BABY, "logs")));
  });

  it("非メンバーは記録を書けない", async () => {
    const db = asOutsider();
    await assertFails(
      setDoc(doc(db, "households", HID, "babies", BABY, "logs", "2026-08-16"), { dateIso: "2026-08-16" })
    );
  });

  it("非メンバーは赤ちゃんのプロフィールを読めない", async () => {
    const db = asOutsider();
    await assertFails(getDoc(doc(db, "households", HID, "babies", BABY)));
  });
});

describe("世帯ドキュメント", () => {
  it("メンバーは schemaVersion 等のメタデータを更新できる（移行処理で必要）", async () => {
    const db = asMember();
    await assertSucceeds(
      setDoc(doc(db, "households", HID), { schemaVersion: "migrating" }, { merge: true })
    );
  });

  it("メンバーでも ownerUid は書き換えられない（世帯の乗っ取り防止）", async () => {
    const db = asMember();
    await assertFails(
      setDoc(doc(db, "households", HID), { ownerUid: MEMBER }, { merge: true })
    );
  });

  it("非メンバーは世帯を更新できない", async () => {
    const db = asOutsider();
    await assertFails(
      setDoc(doc(db, "households", HID), { schemaVersion: 99 }, { merge: true })
    );
  });

  it("世帯の一覧列挙はできない（招待コードの総当たり防止）", async () => {
    const db = asMember();
    await assertFails(getDocs(collection(db, "households")));
  });

  it("オーナーは自分の世帯を作成できる", async () => {
    const db = asOwner();
    await assertSucceeds(
      setDoc(doc(db, "households", "newhousehold"), { ownerUid: OWNER, schemaVersion: 2 })
    );
  });

  it("他人を ownerUid にした世帯は作れない", async () => {
    const db = asOwner();
    await assertFails(
      setDoc(doc(db, "households", "newhousehold2"), { ownerUid: OUTSIDER, schemaVersion: 2 })
    );
  });
});

describe("未認証", () => {
  it("未認証では世帯を読めない", async () => {
    const db = asAnon();
    await assertFails(getDoc(doc(db, "households", HID)));
  });

  it("未認証では記録を書けない", async () => {
    const db = asAnon();
    await assertFails(
      setDoc(doc(db, "households", HID, "babies", BABY, "logs", "x"), { dateIso: "x" })
    );
  });

  it("未認証ではルール外のパスに書けない", async () => {
    const db = asAnon();
    await assertFails(setDoc(doc(db, "randomCollection", "x"), { a: 1 }));
  });
});
