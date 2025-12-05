"use client";

import { useState, useEffect } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [authorHash, setAuthorHash] = useState("");

  useEffect(() => {
    const hash = window.localStorage.getItem("safeyak_author_hash");
    if (hash) setAuthorHash(hash);
  }, []);

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased pb-16`}
      >
        {children}
        
        {/* Bottom Navigation - Removed Profile button, composer is now in FeedWithComposer */}
      </body>
    </html>
  );
}
