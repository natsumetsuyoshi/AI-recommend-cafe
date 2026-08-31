import { MoodRecommender } from "@/components/MoodRecommender";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 dark:bg-black">
      <main className="flex w-full max-w-2xl flex-1 flex-col gap-10 px-6 py-16">
        <header className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            気分から、カフェを見つける
          </h1>
          <p className="text-base leading-7 text-zinc-600 dark:text-zinc-400">
            いまの気分を入れると、AIが近くのカフェを3軒、
            「なぜあなたに合うか」の理由つきで選びます。
          </p>
        </header>

        <MoodRecommender />
      </main>
    </div>
  );
}
