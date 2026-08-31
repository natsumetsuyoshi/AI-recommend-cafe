import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { MoodInput } from "@/components/MoodInput";

describe("MoodInput", () => {
  it("入力して送信すると onSubmit が呼ばれる", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<MoodInput onSubmit={onSubmit} isSubmitting={false} />);

    await user.type(screen.getByLabelText("いまの気分は？"), "静かに集中したい");
    await user.click(screen.getByRole("button", { name: "カフェを探す" }));

    expect(onSubmit).toHaveBeenCalledWith("静かに集中したい");
  });

  it("空文字では送信できない", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<MoodInput onSubmit={onSubmit} isSubmitting={false} />);

    await user.click(screen.getByRole("button", { name: "カフェを探す" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("空白のみでは送信できない", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<MoodInput onSubmit={onSubmit} isSubmitting={false} />);

    await user.type(screen.getByLabelText("いまの気分は？"), "   ");
    await user.click(screen.getByRole("button", { name: "カフェを探す" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("前後の空白を落として渡す", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<MoodInput onSubmit={onSubmit} isSubmitting={false} />);

    await user.type(screen.getByLabelText("いまの気分は？"), "  ひと息つきたい  ");
    await user.click(screen.getByRole("button", { name: "カフェを探す" }));

    expect(onSubmit).toHaveBeenCalledWith("ひと息つきたい");
  });

  it("送信中は入力とボタンを止める", () => {
    render(<MoodInput onSubmit={vi.fn()} isSubmitting={true} />);

    expect(screen.getByLabelText("いまの気分は？")).toBeDisabled();
    expect(screen.getByRole("button", { name: "探しています…" })).toBeDisabled();
  });

  it("候補を押すと入力欄に入る", async () => {
    const user = userEvent.setup();
    render(<MoodInput onSubmit={vi.fn()} isSubmitting={false} />);

    await user.click(screen.getByRole("button", { name: "なんかモヤモヤする" }));

    expect(screen.getByLabelText("いまの気分は？")).toHaveValue("なんかモヤモヤする");
  });
});
