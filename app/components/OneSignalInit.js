// app/components/OneSignalInit.js
// এটা app/components/ ফোল্ডারে রাখো

'use client'
import { useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function OneSignalInit() {
  useEffect(() => {
    const init = async () => {
      // User login আছে কিনা check
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      const userId = session.user.id

      // OneSignal SDK load করো
      const script = document.createElement('script')
      script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'
      script.defer = true
      document.head.appendChild(script)

      script.onload = () => {
        window.OneSignalDeferred = window.OneSignalDeferred || []
        window.OneSignalDeferred.push(async (OneSignal) => {
          await OneSignal.init({
            appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
            safari_web_id: process.env.NEXT_PUBLIC_ONESIGNAL_SAFARI_ID || '',
            notifyButton: { enable: false },
            allowLocalhostAsSecureOrigin: true,
          })

          // Permission চাও
          await OneSignal.Notifications.requestPermission()

          // User ID tag সেট করো — Python এ এই tag দিয়ে notification পাঠাবো
          await OneSignal.User.addTag('user_id', userId)

          // Player ID save করো Supabase এ
          const playerId = await OneSignal.User.getOnesignalId()
          if (playerId) {
            await supabase.from('push_tokens').upsert({
              user_id: userId,
              onesignal_player_id: playerId,
            }, { onConflict: 'user_id' })
          }

          console.log('✅ OneSignal initialized, user_id tag set:', userId)
        })
      }
    }

    init()
  }, [])

  return null
            }
