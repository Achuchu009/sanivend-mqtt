// app/layout.js
import './globals.css';

export const metadata = {
  title: 'Sanivend Dashboard',
  description: 'IoT Vending Machine',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}