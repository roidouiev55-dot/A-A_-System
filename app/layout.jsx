import "./globals.css";
export const metadata = { title: "A&A HAFAKOT · מערכת ניהול", description: "מערכת ניהול הפקות" };
export default function RootLayout({ children }) {
  return <html lang="he" dir="rtl"><body>{children}</body></html>;
}
