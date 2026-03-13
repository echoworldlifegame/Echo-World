// app/api/admin/change-password/route.js
// এটা app/api/admin/change-password/ ফোল্ডারে route.js নামে রাখো

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // ← Service Role Key লাগবে
)

const ADMIN_EMAIL = 'mdakibgoodboy4@gmail.com'

export async function POST(request) {
  try {
    // Auth check — শুধু admin call করতে পারবে
    const authHeader = request.headers.get('authorization') || ''
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authErr || !user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, newPassword } = await request.json()
    if (!userId || !newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    // Admin API দিয়ে password change
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword
    })
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('change-password error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
