// app/api/admin/get-user-email/route.js
// এটা app/api/admin/get-user-email/ ফোল্ডারে route.js নামে রাখো

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ADMIN_EMAIL = 'mdakibgoodboy4@gmail.com'

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization') || ''
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authErr || !user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const { data: { user: targetUser }, error } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (error) throw error

    return NextResponse.json({
      email: targetUser.email || '—',
      last_sign_in: targetUser.last_sign_in_at || null,
      created_at: targetUser.created_at || null,
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
      }
