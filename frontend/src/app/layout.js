import './globals.css';

export const metadata = {
  title: 'CityDrive — Каршеринг',
  description: 'Сервис каршеринга CityDrive',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body className="min-h-screen" style={{ background: '#07070f', color: '#e2e8f0' }}>
        {children}
      </body>
    </html>
  );
}
