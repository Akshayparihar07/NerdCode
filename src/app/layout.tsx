import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppHeader } from "@/components/app-header";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--app-font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--app-font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "NerdCode — DSA that makes sense",
    template: "%s · NerdCode",
  },
  description:
    "Learn data structures and algorithms through the systems they power in the real world.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <ClerkProvider>
            <AppHeader />
            {children}
          </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
