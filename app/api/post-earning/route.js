// app/api/post-earning/route.js
// Post করলে সাথে সাথে daily earning দেওয়া হবে

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { userId } = await request.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' })

    // আজ already earning পেয়েছে কিনা check
    const { data: existing } = await supabase
      .from('daily_earnings')
      .select('id')
      .eq('user_id', userId)
      .eq('date', today)
      .eq('type', 'daily')
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ success: true, alreadyPaid: true })
    }

    // Active investments load করো
    const { data: investments } = await supabase
      .from('investments')
      .select('amount_usd, daily_rate, end_date')
      .eq('user_id', userId)
      .eq('status', 'active')

    if (!investments || investments.length === 0) {
      return NextResponse.json({ success: true, noInvestment: true })
    }

    // Daily earning calculate
    let dailyTotal = 0
    for (const inv of investments) {
      if (inv.end_date && inv.end_date < today) continue
      const amount = parseFloat(inv.amount_usd || 0)
      const rate   = parseFloat(inv.daily_rate  || 0)
      dailyTotal  += Math.round(amount * rate / 100 * 10000) / 10000
    }

    if (dailyTotal <= 0) {
      return NextResponse.json({ success: true, noEarning: true })
    }

    // Daily earning record করো
    await supabase.from('daily_earnings').insert({
      user_id: userId,
      investment_id: null,
      amount: dailyTotal,
      type: 'daily',
      date: today,
      note: 'Post verified — instant earning',
    })

    // Wallet update
    const { data: acc } = await supabase
      .from('investment_accounts')
      .select('wallet_balance, total_earned, referred_by')
      .eq('user_id', userId)
      .single()

    if (!acc) return NextResponse.json({ success: true })

    const newBalance = Math.round((parseFloat(acc.wallet_balance || 0) + dailyTotal) * 10000) / 10000
    const newEarned  = Math.round((parseFloat(acc.total_earned   || 0) + dailyTotal) * 10000) / 10000

    await supabase.from('investment_accounts').update({
      wallet_balance: newBalance,
      total_earned:   newEarned,
    }).eq('user_id', userId)

    // DB notification
    await supabase.from('notifications').insert({
      user_id: userId,
      from_user_id: null,
      type: 'system',
      message: `🌐 Echo World: ✅ Post করার জন্য আজকের আয় $${dailyTotal.toFixed(2)} wallet এ যোগ হয়েছে!`,
      read: false,
    })

    // OneSignal push notification
    if (process.env.ONESIGNAL_REST_API_KEY) {
      await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_id: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
          filters: [{ field: 'tag', key: 'user_id', relation: '=', value: userId }],
          headings: { en: '💰 Echo World — Daily Earning' },
          contents: { en: `✅ Post করার জন্য আজকের আয় $${dailyTotal.toFixed(2)} wallet এ যোগ হয়েছে!` },
        }),
      }).catch(() => {})
    }

    // Referral commission
    if (acc.referred_by) {
      const l1Commission = Math.round(dailyTotal * 0.50 * 10000) / 10000
      const { data: refAcc } = await supabase
        .from('investment_accounts')
        .select('wallet_balance, total_earned, referred_by')
        .eq('user_id', acc.referred_by)
        .single()

      if (refAcc) {
        await supabase.from('investment_accounts').update({
          wallet_balance: Math.round((parseFloat(refAcc.wallet_balance || 0) + l1Commission) * 10000) / 10000,
          total_earned:   Math.round((parseFloat(refAcc.total_earned   || 0) + l1Commission) * 10000) / 10000,
        }).eq('user_id', acc.referred_by)

        await supabase.from('daily_earnings').insert({
          user_id: acc.referred_by,
          investment_id: null,
          amount: l1Commission,
          type: 'referral',
          date: today,
          note: 'L1 referral commission — instant',
        })

        await supabase.from('notifications').insert({
          user_id: acc.referred_by,
          from_user_id: null,
          type: 'system',
          message: `🌐 Echo World: 🔗 Referral commission $${l1Commission.toFixed(2)} wallet এ যোগ হয়েছে!`,
          read: false,
        })

        // L2 commission
        if (refAcc.referred_by) {
          const l2Commission = Math.round(dailyTotal * 0.25 * 10000) / 10000
          const { data: l2Acc } = await supabase
            .from('investment_accounts')
            .select('wallet_balance, total_earned')
            .eq('user_id', refAcc.referred_by)
            .single()

          if (l2Acc) {
            await supabase.from('investment_accounts').update({
              wallet_balance: Math.round((parseFloat(l2Acc.wallet_balance || 0) + l2Commission) * 10000) / 10000,
              total_earned:   Math.round((parseFloat(l2Acc.total_earned   || 0) + l2Commission) * 10000) / 10000,
            }).eq('user_id', refAcc.referred_by)

            await supabase.from('daily_earnings').insert({
              user_id: refAcc.referred_by,
              investment_id: null,
              amount: l2Commission,
              type: 'referral',
              date: today,
              note: 'L2 referral commission — instant',
            })
          }
        }
      }
    }

    // ECHO Token — 10 ECHO per post
    try {
      const { data: echoAcc } = await supabase.from('echo_tokens').select('*').eq('user_id', userId).maybeSingle()
      const newEcho = (parseFloat(echoAcc?.balance || 0) + 10)
      const newEchoEarned = (parseFloat(echoAcc?.total_earned || 0) + 10)
      await supabase.from('echo_tokens').upsert({
        user_id: userId, balance: newEcho, total_earned: newEchoEarned
      }, { onConflict: 'user_id' })
      await supabase.from('echo_token_transactions').insert({
        user_id: userId, amount: 10, type: 'daily_post', note: 'Daily post reward'
      })
      // profiles echo_balance update
      await supabase.from('profiles').update({ echo_balance: newEcho }).eq('id', userId)
    } catch(e) { console.log('ECHO earn error:', e) }

    return NextResponse.json({ success: true, earned: dailyTotal })

  } catch (e) {
    console.error('post-earning error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
