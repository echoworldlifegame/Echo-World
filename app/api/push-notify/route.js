// app/api/push-notify/route.js
import { NextResponse } from 'next/server'

const ONESIGNAL_APP_ID  = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
const ONESIGNAL_REST_KEY = process.env.ONESIGNAL_REST_API_KEY

export async function POST(request) {
  try {
    const { userId, title, message } = await request.json()
    if (!userId || !title || !message) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_KEY) {
      return NextResponse.json({ error: 'OneSignal not configured' }, { status: 500 })
    }

    const res = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${ONESIGNAL_REST_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        filters: [{ field: 'tag', key: 'user_id', relation: '=', value: userId }],
        headings: { en: title },
        contents: { en: message },
      }),
    })

    const data = await res.json()
    return NextResponse.json({ success: true, data })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
