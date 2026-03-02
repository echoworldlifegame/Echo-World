export const metadata = {
  title: 'Echo World',
  description: 'Location-based social media RPG',
  manifest: '/manifest.json',
  themeColor: '#00e5ff',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Echo World',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
        <meta name="apple-mobile-web-app-title" content="Echo World"/>
        <meta name="theme-color" content="#00e5ff"/>
        <link rel="apple-touch-icon" href="/icon-192.png"/>
        <link rel="manifest" href="/manifest.json"/>
      </head>
      <body style={{margin:0,padding:0,background:'#070a10',fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif'}}>
        {children}
      </body>
    </html>
  )
}
