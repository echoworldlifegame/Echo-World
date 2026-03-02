import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file) {
      return NextResponse.json({ error: 'No file' }, { status: 400 })
    }

    const cloudFormData = new FormData()
    cloudFormData.append('file', file)
    cloudFormData.append('upload_preset', 'echoworld_preset')

    const fileType = file.type.startsWith('video') ? 'video' : 'image'

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/dbguxwpa8/${fileType}/upload`,
      { method: 'POST', body: cloudFormData }
    )

    const data = await res.json()
    return NextResponse.json({ url: data.secure_url, type: fileType })

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
