"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type ApiResponse = { ok: boolean; content?: string; error?: string };

export default function Home() {
  const [payload, setPayload] = useState<ApiResponse | null>(null);

  useEffect(() => {
    fetch("/api/hello")
      .then((r) => r.json())
      .then((data: ApiResponse) => setPayload(data))
      .catch((err) => setPayload({ ok: false, error: String(err) }));
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />

        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Hello from XAMPP htdocs
          </h1>

          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            This page fetches a file from your XAMPP htdocs folder via a server API.
          </p>

          <div className="mt-4 w-full max-w-lg rounded border p-4 text-left">
            <strong>File contents:</strong>
            <pre className="whitespace-pre-wrap mt-2">{payload ? (payload.ok ? payload.content : payload.error) : "Loading..."}</pre>
          </div>
        </div>

        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <a
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="dark:invert"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={16}
              height={16}
            />
            Deploy Now
          </a>
          <a
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentation
          </a>
        </div>
      </main>
    </div>
  );
}
