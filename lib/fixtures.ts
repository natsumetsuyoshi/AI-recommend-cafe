/**
 * 開発・テスト用のカフェデータ。
 *
 * API キーが無い状態でもコア体験を通しで動かすために使う。
 * Google Places の Nearby Search + Place Details から得られる粒度に寄せてあり、
 * 実API実装へ差し替えたときのギャップを小さくしている。
 *
 * 座標は絶対値ではなく検索地点からの相対オフセットとして持つ。
 * `lib/places.ts` がこれを検索地点に足し直すので、
 * どこで検索しても「その場の周辺」にピンが並ぶ。
 */

import "server-only";

import type { Cafe } from "@/types";

/**
 * 検索地点からのオフセットを持つカフェ。
 *
 * `lat` / `lng` は検索時に決まるので持たない。両方を持つと
 * 片方だけ書き換えたときに静かにずれる。
 */
interface FixtureCafe extends Omit<Cafe, "lat" | "lng"> {
  latOffset: number;
  lngOffset: number;
}

export const FIXTURE_CAFES: readonly FixtureCafe[] = [
  {
    id: "fixture-shizuka-coffee",
    name: "しずか珈琲店",
    latOffset: 0.0018,
    lngOffset: 0.0012,
    rating: 4.6,
    userRatingCount: 312,
    priceLevel: 2,
    isOpenNow: true,
    address: "東京都千代田区丸の内1-2-3",
    reviewExcerpts: [
      "会話が少なく、本を読むのにちょうどいい静けさでした",
      "各席にコンセントがあって長居しても気を使わない",
      "BGMが控えめで集中できます",
    ],
  },
  {
    id: "fixture-hidamari-roasters",
    name: "ひだまりロースターズ",
    latOffset: -0.0009,
    lngOffset: 0.0021,
    rating: 4.4,
    userRatingCount: 528,
    priceLevel: 2,
    isOpenNow: true,
    address: "東京都中央区八重洲1-5-8",
    reviewExcerpts: [
      "大きな窓から日が差してきて、気持ちが軽くなりました",
      "焙煎したての香りがいい。浅煎りが好きな人向け",
      "昼過ぎは混みますが、回転は早いです",
    ],
  },
  {
    id: "fixture-yorumachi-stand",
    name: "夜まちスタンド",
    latOffset: 0.0031,
    lngOffset: -0.0014,
    rating: 4.2,
    userRatingCount: 145,
    priceLevel: 3,
    isOpenNow: true,
    address: "東京都千代田区大手町2-1-1",
    reviewExcerpts: [
      "22時まで開いていて、仕事帰りに寄れるのがありがたい",
      "照明が落としてあって落ち着く雰囲気",
      "カウンター席が中心なので一人でも入りやすい",
    ],
  },
  {
    id: "fixture-ao-to-hon",
    name: "青と本",
    latOffset: -0.0024,
    lngOffset: -0.0019,
    rating: 4.7,
    userRatingCount: 89,
    priceLevel: 2,
    isOpenNow: false,
    address: "東京都中央区京橋2-4-6",
    reviewExcerpts: [
      "本棚に囲まれた席があって、ひとりでぼんやりするのに向いています",
      "店主が寡黙で、放っておいてくれるのがよい",
      "席数が少ないので満席のことも",
    ],
  },
  {
    id: "fixture-hanare-terrace",
    name: "はなれテラス",
    latOffset: 0.0042,
    lngOffset: 0.0037,
    rating: 4.1,
    userRatingCount: 673,
    priceLevel: 3,
    isOpenNow: true,
    address: "東京都千代田区有楽町1-1-2",
    reviewExcerpts: [
      "テラス席が広く、友人とゆっくり話せました",
      "内装がおしゃれで写真映えします",
      "週末は待ち時間が出るほど人気",
    ],
  },
  {
    id: "fixture-kado-no-kissa",
    name: "角の喫茶",
    latOffset: -0.0036,
    lngOffset: 0.0008,
    rating: 3.9,
    userRatingCount: 204,
    priceLevel: 1,
    isOpenNow: true,
    address: "東京都中央区日本橋3-2-9",
    reviewExcerpts: [
      "昔ながらの喫茶店。値段が安くて長居しやすい",
      "常連さんの会話が聞こえてくる、にぎやかな雰囲気",
      "モーニングが充実しています",
    ],
  },
  {
    id: "fixture-kumo-no-ue",
    name: "雲の上コーヒー",
    latOffset: 0.0007,
    lngOffset: -0.0033,
    rating: 4.5,
    userRatingCount: 51,
    priceLevel: 2,
    isOpenNow: true,
    address: "東京都千代田区内幸町1-3-3",
    reviewExcerpts: [
      "高層階で見晴らしがよく、気分転換になりました",
      "平日の午前中は空いていて静かです",
    ],
  },
  {
    id: "fixture-machikado-bake",
    name: "まちかどベイク",
    latOffset: -0.0013,
    lngOffset: -0.0046,
    rating: 4.0,
    userRatingCount: 388,
    priceLevel: 1,
    isOpenNow: true,
    address: "東京都中央区銀座1-8-4",
    reviewExcerpts: [
      "焼き菓子が美味しくて、甘いものが欲しいときにちょうどいい",
      "席は狭めなので、作業には向かないかも",
      "店員さんが親切で気持ちよく過ごせました",
    ],
  },
] as const;
