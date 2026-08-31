<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 作業記録の使い分け

作業指示を受けたら、規模に応じて記録先を選ぶ。**全部作らない。**

| 置き場所 | 何を書くか | 寿命 | git |
|---|---|---|---|
| **GitHub Issue** | 着手しないこと / 判断が要ること / 着手前の requirements と design | 恒久 | — |
| **`.steering/<日付>-<名前>/tasklist.md`** | 着手中の進捗チェックリスト | そのセッション限り | ignore |
| **`docs/`** | 終わったあとに残す決定と理由 | 恒久 | tracked |

## ルール

1. **小さい作業ではどれも作らない。** 内部の TODO で足りる。
   `.steering/` を作るのは、フェーズ分割が必要な規模（サブタスク20個以上が目安）のときだけ。

2. **`.steering/` に置くのは `tasklist.md` だけ。**
   requirements と design は GitHub Issue に書く。着手前にレビューでき、恒久的に残るため。
   `.steering/` は `.gitignore` 済みなので、そこに書いた計画はリポジトリに残らない。

3. **着手しないことは必ず Issue にする。** 「あとで検討」を `.steering/` に書かない。ignore されて消える。

4. **終わったら、恒久的に残す価値のある決定と理由を `docs/` へ昇格させる。**
   アーキテクチャ上の決定は `docs/architecture.md` の「12. 決定事項」へ追記する。
   `.steering/` の振り返りに書いて終わりにしない。

5. Issue の作成・更新は `gh` CLI を使う。
