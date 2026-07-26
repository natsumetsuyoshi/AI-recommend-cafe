import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

// テスト基盤の動作確認用サンプル。
// 実際のコンポーネントができたら、これを参考にテストを書き足す。
function Hello({ name }: { name: string }) {
  return <h1>Hello, {name}</h1>;
}

describe("example", () => {
  it("renders a greeting", () => {
    render(<Hello name="Cafe" />);
    expect(screen.getByRole("heading")).toHaveTextContent("Hello, Cafe");
  });
});
