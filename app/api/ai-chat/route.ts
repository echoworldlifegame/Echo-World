import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    // Build conversation history for Gemini
    const contents = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }))

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{
              text: `তুমি Echo World-এর AI Assistant। তোমার নাম "Echo AI"।
Echo World একটি social investment platform যেখানে মানুষ invest করতে পারে এবং community-তে যুক্ত হতে পারে।
তুমি বাংলা এবং English দুটো ভাষায় কথা বলতে পারো।
User যে ভাষায় কথা বলবে তুমি সেই ভাষায় উত্তর দেবে।
তুমি সবসময় helpful, friendly এবং informative।
যেকোনো প্রশ্নের উত্তর দাও — general knowledge, math, code, creative writing সব।`
            }]
          },
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          }
        })
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ error: data.error?.message || 'Gemini error' }, { status: 500 })
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, no response.'

    return NextResponse.json({ reply: text })

  } catch (error) {
    console.error('AI Chat error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
