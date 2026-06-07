import { Analytics } from '@vercel/analytics/next';

export const metadata = {
  title: "Get The Check",
  description: "Tech news through the Get the Check lens",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
