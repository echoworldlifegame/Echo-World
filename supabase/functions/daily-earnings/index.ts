// ═══════════════════════════════════════════════════════
// FILE: supabase/functions/daily-earnings/index.ts
// 
// এটা Supabase Edge Function — প্রতিদিন সকালে auto run হবে
// Setup: Supabase Dashboard → Edge Functions → Deploy
// Cron: প্রতিদিন সকাল ৭টায় (UTC 1:00 = BD 7:00)
// ═══════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const STREAK_BONUSES = {
  7:  { amount: 5,   badge: 'streak_7',  message: '🔥 7-Day Streak! $5 bonus added to your wallet!' },
  30: { amount: 20,  badge: 'streak_30', message: '⚡ 30-Day Streak Legend! $20 bonus added!' },
  90: { amount: 100, badge: 'streak_90', message: '🏆 90-Day Champion! $100 bonus added to your wallet!' },
}

Deno.serve(async (req) => {
  try {
    const today    = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    // 1. Get all active investments
    const { data: investments } = await supabase
      .from('investments')
      .select('*, investment_accounts(wallet_balance, total_earned, user_id)')
      .eq('status', 'active')

    if (!investments || investments.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), { headers: { 'Content-Type': 'application/json' } })
    }

    let processed = 0
    const earningsMap = {} // uid → total earnings today

    for (const inv of investments) {
      const uid = inv.user_id

      // Check if user posted today (required for earnings)
      const { data: posts } = await supabase
        .from('posts')
        .select('id')
        .eq('user_id', uid)
        .gte('created_at', `${today}T00:00:00`)
        .limit(1)

      if (!posts || posts.length === 0) continue // No post = no earning

      // Check already logged today
      const { data: existing } = await supabase
        .from('daily_earnings')
        .select('id')
        .eq('user_id', uid)
        .eq('date', today)
        .eq('investment_id', inv.id)
        .limit(1)

      if (existing && existing.length > 0) continue // Already logged

      const dailyAmount = inv.amount_usd * inv.daily_rate / 100

      // Log earning
      await supabase.from('daily_earnings').insert({
        user_id: uid,
        investment_id: inv.id,
        amount: dailyAmount,
        type: 'daily',
        date: today,
      })

      // Accumulate for wallet update
      earningsMap[uid] = (earningsMap[uid] || 0) + dailyAmount

      // Referral earnings
      const { data: account } = await supabase
        .from('investment_accounts')
        .select('referred_by')
        .eq('user_id', uid)
        .single()

      if (account?.referred_by) {
        const l1Amount = dailyAmount * 0.5
        await supabase.from('referral_earnings').insert({
          user_id: account.referred_by,
          from_user_id: uid,
          level: 1,
          amount: l1Amount,
          date: today,
        })
        earningsMap[account.referred_by] = (earningsMap[account.referred_by] || 0) + l1Amount

        // Level 2
        const { data: l1Acc } = await supabase
          .from('investment_accounts')
          .select('referred_by')
          .eq('user_id', account.referred_by)
          .single()

        if (l1Acc?.referred_by) {
          const l2Amount = dailyAmount * 0.25
          await supabase.from('referral_earnings').insert({
            user_id: l1Acc.referred_by,
            from_user_id: uid,
            level: 2,
            amount: l2Amount,
            date: today,
          })
          earningsMap[l1Acc.referred_by] = (earningsMap[l1Acc.referred_by] || 0) + l2Amount
        }
      }

      processed++
    }

    // 2. Update wallet balances
    for (const [uid, amount] of Object.entries(earningsMap)) {
      const { data: acc } = await supabase
        .from('investment_accounts')
        .select('wallet_balance, total_earned')
        .eq('user_id', uid)
        .single()

      if (!acc) continue

      await supabase.from('investment_accounts').update({
        wallet_balance: (acc.wallet_balance || 0) + amount,
        total_earned:   (acc.total_earned   || 0) + amount,
      }).eq('user_id', uid)
    }

    // 3. Update streaks
    const { data: allUsers } = await supabase.from('profiles').select('id')
    for (const u of (allUsers || [])) {
      const uid = u.id

      // Did user post today?
      const { data: todayPost } = await supabase
        .from('posts').select('id').eq('user_id', uid)
        .gte('created_at', `${today}T00:00:00`).limit(1)
      const postedToday = (todayPost || []).length > 0

      const { data: profile } = await supabase
        .from('profiles')
        .select('current_streak, longest_streak, last_post_date')
        .eq('id', uid).single()

      if (!profile) continue

      let streak = profile.current_streak || 0
      let longest = profile.longest_streak || 0

      if (postedToday) {
        const wasYesterday = profile.last_post_date === yesterday
        streak = wasYesterday ? streak + 1 : 1
        if (streak > longest) longest = streak

        await supabase.from('profiles').update({
          current_streak: streak,
          longest_streak: longest,
          last_post_date: today,
        }).eq('id', uid)

        // Check streak milestones
        const bonus = STREAK_BONUSES[streak]
        if (bonus) {
          // Award bonus
          const { data: acc } = await supabase.from('investment_accounts').select('wallet_balance, total_earned').eq('user_id', uid).single()
          if (acc) {
            await supabase.from('investment_accounts').update({
              wallet_balance: (acc.wallet_balance || 0) + bonus.amount,
              total_earned:   (acc.total_earned   || 0) + bonus.amount,
            }).eq('user_id', uid)

            await supabase.from('daily_earnings').insert({
              user_id: uid, investment_id: null,
              amount: bonus.amount, type: 'streak_bonus', date: today,
            })

            // Award badge
            await supabase.from('user_badges').upsert({
              user_id: uid, badge_key: bonus.badge,
            }, { onConflict: 'user_id,badge_key' })

            // Notify user
            await supabase.from('notifications').insert({
              user_id: uid, from_user_id: null, type: 'system',
              message: `🌐 Echo World: ${bonus.message}`,
              read: false,
            })
          }
        }
      } else {
        // Missed post — reset streak
        await supabase.from('profiles').update({ current_streak: 0 }).eq('id', uid)
      }
    }

    // 4. Send daily earning notifications (avoid duplicate)
    const earnedUsers = Object.keys(earningsMap)
    for (const uid of earnedUsers) {
      const amt = earningsMap[uid]
      if (!amt || amt <= 0) continue

      // Check if already sent today
      const { error } = await supabase.from('daily_notif_log').insert({
        user_id: uid, date: today, amount: amt,
      })
      if (error) continue // Already sent

      await supabase.from('notifications').insert({
        user_id: uid, from_user_id: null, type: 'system',
        message: `🌐 Echo World: 💰 আজ আপনার আয় হয়েছে $${amt.toFixed(4)}! প্রতিদিন পোস্ট করুন।`,
        read: false,
      })
    }

    return new Response(
      JSON.stringify({ ok: true, processed, walletUpdates: Object.keys(earningsMap).length }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})

// ═══════════════════════════════════════════════════════
// HOW TO DEPLOY THIS EDGE FUNCTION:
//
// 1. Install Supabase CLI:
//    npm install -g supabase
//
// 2. Login:
//    supabase login
//
// 3. Link project:
//    supabase link --project-ref ajfqewvetrjveuutgjpf
//
// 4. Create function folder:
//    mkdir -p supabase/functions/daily-earnings
//    (এই file টা index.ts নামে ওই folder এ রাখো)
//
// 5. Deploy:
//    supabase functions deploy daily-earnings
//
// 6. Set up Cron (Supabase Dashboard → Database → Cron Jobs):
//    Name: daily-earnings
//    Schedule: 0 1 * * *    (প্রতিদিন UTC 1:00 = BD সকাল 7:00)
//    Command:
//    select net.http_post(
//      url := 'https://ajfqewvetrjveuutgjpf.supabase.co/functions/v1/daily-earnings',
//      headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
//    );
//
// 7. Test manually from Supabase Dashboard → Edge Functions → Invoke
// ═══════════════════════════════════════════════════════
