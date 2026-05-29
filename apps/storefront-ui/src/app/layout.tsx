import type { Metadata } from "next";
import "./globals.css";
import AffiliateTracker from '../components/AffiliateTracker';
import Header from '../components/Header';



export const metadata: Metadata = {
  title: "Aura E-Commerce | Premium Store",
  description: "Experience the next generation of headless e-commerce built on Cloudflare.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AffiliateTracker />
        <Header />
        <div className="container" style={{ paddingTop: '20px' }}>
          {children}
        </div>
      </body>
    </html>
  );
}
