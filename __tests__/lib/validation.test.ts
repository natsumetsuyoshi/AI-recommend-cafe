import { describe, it, expect } from "vitest";

import { ValidationError } from "@/lib/errors";
import { MOOD_MAX_LENGTH } from "@/lib/constants";
import { parseRecommendRequest } from "@/lib/validation";

const validBody = {
  mood: "静かに集中したい",
  lat: 35.681236,
  lng: 139.767125,
  localHour: 14,
};

describe("parseRecommendRequest", () => {
  it("正しい入力をそのまま返す", () => {
    const parsed = parseRecommendRequest(validBody);

    expect(parsed).toEqual(validBody);
  });

  it("mood の前後の空白を取り除く", () => {
    const parsed = parseRecommendRequest({ ...validBody, mood: "  ひと息つきたい  " });

    expect(parsed.mood).toBe("ひと息つきたい");
  });

  it("mood の制御文字を空白に置き換える", () => {
    const moodWithNewline = ["前半", "後半"].join(String.fromCharCode(10));

    const parsed = parseRecommendRequest({ ...validBody, mood: moodWithNewline });

    expect(parsed.mood).toBe("前半 後半");
  });

  describe("mood の境界値", () => {
    it("空文字は弾く", () => {
      expect(() => parseRecommendRequest({ ...validBody, mood: "" })).toThrow(
        ValidationError,
      );
    });

    it("空白のみは弾く", () => {
      expect(() => parseRecommendRequest({ ...validBody, mood: "   " })).toThrow(
        ValidationError,
      );
    });

    it("上限ちょうどの文字数は通す", () => {
      const mood = "あ".repeat(MOOD_MAX_LENGTH);

      const parsed = parseRecommendRequest({ ...validBody, mood });

      expect(parsed.mood).toHaveLength(MOOD_MAX_LENGTH);
    });

    it("上限を1文字超えると弾く", () => {
      const mood = "あ".repeat(MOOD_MAX_LENGTH + 1);

      expect(() => parseRecommendRequest({ ...validBody, mood })).toThrow(
        ValidationError,
      );
    });

    it("文字列以外は弾く", () => {
      expect(() => parseRecommendRequest({ ...validBody, mood: 123 })).toThrow(
        ValidationError,
      );
    });
  });

  describe("座標の範囲", () => {
    it.each([
      ["lat", 90.1],
      ["lat", -90.1],
      ["lng", 180.1],
      ["lng", -180.1],
    ])("%s が %s のとき弾く", (field, value) => {
      expect(() => parseRecommendRequest({ ...validBody, [field]: value })).toThrow(
        ValidationError,
      );
    });

    it.each([
      ["lat", 90],
      ["lat", -90],
      ["lng", 180],
      ["lng", -180],
    ])("%s が %s のとき通す", (field, value) => {
      expect(() =>
        parseRecommendRequest({ ...validBody, [field]: value }),
      ).not.toThrow();
    });

    it("NaN を弾く", () => {
      expect(() => parseRecommendRequest({ ...validBody, lat: Number.NaN })).toThrow(
        ValidationError,
      );
    });

    it("数値以外を弾く", () => {
      expect(() => parseRecommendRequest({ ...validBody, lng: "139.7" })).toThrow(
        ValidationError,
      );
    });
  });

  describe("localHour", () => {
    it.each([0, 23])("%s は通す", (localHour) => {
      expect(() => parseRecommendRequest({ ...validBody, localHour })).not.toThrow();
    });

    it.each([-1, 24])("%s は弾く", (localHour) => {
      expect(() => parseRecommendRequest({ ...validBody, localHour })).toThrow(
        ValidationError,
      );
    });

    it("小数は弾く", () => {
      expect(() => parseRecommendRequest({ ...validBody, localHour: 12.5 })).toThrow(
        ValidationError,
      );
    });
  });

  describe("ボディの形", () => {
    it.each([[null], [undefined], ["文字列"], [[]], [42]])(
      "%s は弾く",
      (body) => {
        expect(() => parseRecommendRequest(body)).toThrow(ValidationError);
      },
    );
  });

  it("ValidationError は status 400 と field を持つ", () => {
    try {
      parseRecommendRequest({ ...validBody, mood: "" });
      expect.unreachable("ValidationError が投げられるはず");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const validationError = error as ValidationError;
      expect(validationError.status).toBe(400);
      expect(validationError.code).toBe("VALIDATION_ERROR");
      expect(validationError.field).toBe("mood");
    }
  });
});
