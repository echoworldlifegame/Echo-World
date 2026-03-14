import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { messages } = await req.json()
    const apiKey = process.env.GEMINI_API_KEY

    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }))

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: `তুমি Echo World-এর AI Assistant। তোমার নাম Echo AI। বাংলা ও English দুটোতেই কথা বলো। যেকোনো প্রশ্নের উত্তর দাও।` }]
          },
          generationConfig: { temperature: 0.7, maxOutputTokens: 1000 }
        })
      }
    )

    const data = await response.json()
    if (!response.ok) return NextResponse.json({ error: data.error?.message }, { status: 500 })
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'উত্তর পাওয়া যায়নি।'
    return NextResponse.json({ reply: text })

  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
