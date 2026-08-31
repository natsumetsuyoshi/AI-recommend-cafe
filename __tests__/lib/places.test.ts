import { describe, it, expect } from "vitest";

import { FIXTURE_CAFES } from "@/lib/fixtures";
import { searchNearbyCafes } from "@/lib/places";

const SHIBUYA = { lat: 35.658, lng: 139.7016 };

describe("searchNearbyCafes", () => {
  it("検索地点の周辺の座標を返す", async () => {

    const cafes = await searchNearbyCafes({
      ...SHIBUYA,
      radiusMeters: 800,
      limit: 20,
    });

    for (const cafe of cafes) {
      expect(Math.abs(cafe.lat - SHIBUYA.lat)).toBeLessThan(0.01);
      expect(Math.abs(cafe.lng - SHIBUYA.lng)).toBeLessThan(0.01);
    }
  });

  it("検索地点が変われば返る座標も動く", async () => {

    const [tokyo] = await searchNearbyCafes({
      lat: 35.681,
      lng: 139.767,
      radiusMeters: 800,
      limit: 1,
    });
    const [shibuya] = await searchNearbyCafes({
      ...SHIBUYA,
      radiusMeters: 800,
      limit: 1,
    });

    expect(shibuya.lat).not.toBe(tokyo.lat);
    expect(shibuya.id).toBe(tokyo.id);
  });

  it("limit の件数までしか返さない", async () => {

    const cafes = await searchNearbyCafes({
      ...SHIBUYA,
      radiusMeters: 800,
      limit: 3,
    });

    expect(cafes).toHaveLength(3);
  });

  it("limit がフィクスチャ件数を超えても落ちない", async () => {

    const cafes = await searchNearbyCafes({
      ...SHIBUYA,
      radiusMeters: 800,
      limit: 999,
    });

    expect(cafes).toHaveLength(FIXTURE_CAFES.length);
  });

  it("レビュー抜粋を持ったカフェを返す", async () => {

    const [cafe] = await searchNearbyCafes({
      ...SHIBUYA,
      radiusMeters: 800,
      limit: 1,
    });

    expect(cafe.name).not.toBe("");
    expect(cafe.reviewExcerpts.length).toBeGreaterThan(0);
  });
});
