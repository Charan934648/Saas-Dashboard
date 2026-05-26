import type { Metadata } from "next";
import "./globals.css";
import DashboardLayout from "@/components/DashboardLayout";

export const metadata: Metadata = {
  title: "Gearbox SaaS | Elite Supercar Fleet Analytics",
  description: "High-Performance Multi-Tenant Supercar SaaS Analytics & Real-Time Telemetry Dashboard",
  keywords: ["Supercar", "SaaS", "Telemetry", "Next.js", "React", "Node.js", "MySQL", "Dashboard", "Multi-tenant"],
  authors: [{ name: "Gearbox Engineering" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <DashboardLayout>{children}</DashboardLayout>
      </body>
    </html>
  );
}
