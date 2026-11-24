import './globals.css'
import { Inter, Instrument_Serif, Geist_Mono } from 'next/font/google'
import { ThemeProvider } from '@/context/ThemeContext'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
})

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
})

export const metadata = {
  title: 'cryptofetch | Historical Cryptocurrency OHLCV Downloader',
  description: 'Fast, free, and self-hostable historical cryptocurrency data downloader from the public APIs of Binance, OKX, Coinbase, Bitget and Gate.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://data-api.binance.vision" />
      </head>
      <body className={`${inter.className} ${inter.variable} ${instrumentSerif.variable} ${geistMono.variable} min-h-screen`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var localTheme = localStorage.getItem('theme');
                  var parentOrigin = '';
                  try { parentOrigin = new URL(document.referrer).origin; } catch (_) {}
                  if (window.parent !== window && ['https://varshith.me', 'https://www.varshith.me'].includes(parentOrigin)) {
                    var inherited = new URLSearchParams(location.search).get('portfolioTheme');
                    if (inherited === 'light' || inherited === 'dark') localTheme = inherited;
                  }
                  var supportDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (localTheme === 'dark' || (!localTheme && supportDarkMode)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
