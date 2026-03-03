export const metadata = {
  title: 'Echo World',
  description: 'Location-based social media RPG',
  manifest: '/manifest.json',
}

export const viewport = {
  themeColor: '#00e5ff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
        <meta name="apple-mobile-web-app-title" content="Echo World"/>
        <link rel="apple-touch-icon" href="/icon.svg"/>
        <link rel="manifest" href="/manifest.json"/>
        <script dangerouslySetInnerHTML={{__html:`
          if('serviceWorker' in navigator){
            window.addEventListener('load',()=>{
              navigator.serviceWorker.register('/sw.js')
            })
          }
        `}}/>
      </head>
      <body style={{margin:0,padding:0,background:'#070a10',fontFamily:'-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif'}}>
        {children}
      </body>
    </html>
  )
  }
