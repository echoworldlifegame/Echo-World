export const metadata = {
  title: 'Echo World — Life is a Game',
  description: 'The Real-Life RPG Social Media',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet"/>
      </head>
      <body style={{margin:0, background:'#070a10', color:'#eef2f7', fontFamily:'DM Sans, sans-serif'}}>
        {children}
      </body>
    </html>
  )
}
