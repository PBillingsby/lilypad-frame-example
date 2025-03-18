import Image from "next/image";
import { getFrameMetadata } from "@coinbase/onchainkit/frame";
import type { Metadata } from "next";

const frameMetadata = getFrameMetadata({
  buttons: [
    {
      label: "Test Button",
    },
  ],
  image: `${process.env.NEXT_PUBLIC_BASE_URL}/test.gif`, // Changed image
  post_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/frame?id=2`, // Changed id to test state changes
});

export const metadata: Metadata = {
  title: "Lilysay Farcaster Frame (Test)",
  description: "Testing frame update",
  openGraph: {
    title: "Lilysay Farcaster Frame (Test)",
    description: "Updated frame for testing",
    images: ["/test.png"], // Changed test image
  },
  other: {
    ...frameMetadata,
  },
};

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <Image
          className="dark:invert"
          src="https://nextjs.org/icons/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />
        <ol className="list-inside list-decimal text-sm text-center sm:text-left font-[family-name:var(--font-geist-mono)]">
          <li className="mb-2">
            <strong>This is a new test for changes</strong>: Click the button
            below to trigger a test event.
          </li>
          <li>Check the console or API response to verify updates.</li>
        </ol>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <a
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
            href={`${process.env.NEXT_PUBLIC_BASE_URL}/api/test`}
            target="_blank"
            rel="noopener noreferrer"
          >
            🔄 Run Test
          </a>
        </div>
      </main>
    </div>
  );
}
