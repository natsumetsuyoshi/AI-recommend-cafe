import { describe, it, expect, vi, afterEach } from "vitest";

import { FALLBACK_LOCATION, resolveCurrentLocation } from "@/lib/geolocation";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("resolveCurrentLocation", () => {
  it("取得できたら現在地を返す", async () => {
    vi.stubGlobal("navigator", {
      ...navigator,
      geolocation: {
        getCurrentPosition: vi.fn((onSuccess: PositionCallback) => {
          onSuccess({
            coords: { latitude: 34.7, longitude: 135.5 },
          } as GeolocationPosition);
        }),
      },
    });

    await expect(resolveCurrentLocation()).resolves.toEqual({ lat: 34.7, lng: 135.5 });
  });

  it("拒否されたら既定座標を返す", async () => {
    vi.stubGlobal("navigator", {
      ...navigator,
      geolocation: {
        getCurrentPosition: vi.fn(
          (_onSuccess: PositionCallback, onError: PositionErrorCallback) => {
            onError({ code: 1, message: "拒否されました" } as GeolocationPositionError);
          },
        ),
      },
    });

    await expect(resolveCurrentLocation()).resolves.toEqual(FALLBACK_LOCATION);
  });

  it("Geolocation 非対応なら既定座標を返す", async () => {
    vi.stubGlobal("navigator", { ...navigator, geolocation: undefined });

    await expect(resolveCurrentLocation()).resolves.toEqual(FALLBACK_LOCATION);
  });

  it("既定座標は東京駅", () => {
    expect(FALLBACK_LOCATION).toEqual({ lat: 35.681236, lng: 139.767125 });
  });
});
