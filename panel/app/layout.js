import './globals.css';
import RegisterSW from '@/components/RegisterSW';

export const metadata = {
  title: { default: 'Moderación', template: '%s · Moderación' },
  description: 'Panel de moderación de la comunidad de WhatsApp',
  applicationName: 'Moderación',
  appleWebApp: { capable: true, title: 'Moderación', statusBarStyle: 'default' },
  icons: { apple: '/icons/apple-touch-icon.png' },
  robots: { index: false, follow: false },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f6f8' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0f14' },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="es-CL">
      <body className="min-h-dvh font-sans antialiased">
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
