import './globals.css'
import { Inter, League_Spartan } from 'next/font/google'
import { ThemeProvider } from '@/context/ThemeContext'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
})

const leagueSpartan = League_Spartan({
  subsets: ['latin'],
  weight: ['700', '800', '900'],
  variable: '--font-spartan',
})

export const metadata = {
  title: 'cryptofetch | Historical Cryptocurrency OHLCV Downloader',
  description: 'Fast, free, and self-hostable historical cryptocurrency data downloader powered by Binance Public API.',
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
      <body className={`${inter.className} ${leagueSpartan.variable} min-h-screen bg-white dark:bg-[#0b0b0b] text-black dark:text-white transition-colors duration-300`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var localTheme = localStorage.getItem('theme');
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
