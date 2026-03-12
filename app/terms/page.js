'use client'
import { useState } from 'react'

export default function Terms() {
  const [activeSection, setActiveSection] = useState(null)
  const [lang, setLang] = useState('en')

  const sections = [
    {
      id: 1,
      icon: '📋',
      title: { en: 'Terms of Service', bn: 'সেবার শর্তাবলী' },
      content: {
        en: [
          'By using Echo World, you agree to these terms.',
          'You must be at least 18 years old to use this platform.',
          'Each person may only create one account.',
          'Fake or duplicate accounts are strictly prohibited and will result in a permanent ban.',
          'Echo World reserves the right to update these terms at any time.',
        ],
        bn: [
          'Echo World ব্যবহার করে আপনি এই শর্তাবলী মেনে নিচ্ছেন।',
          'আপনার বয়স কমপক্ষে ১৮ বছর হতে হবে।',
          'একজন ব্যক্তি শুধুমাত্র একটি account খুলতে পারবেন।',
          'ভুয়া বা duplicate account খোলা সম্পূর্ণ নিষিদ্ধ — ধরা পড়লে permanent ban করা হবে।',
          'Echo World যেকোনো সময় এই শর্তাবলী পরিবর্তন করার অধিকার রাখে।',
        ]
      }
    },
    {
      id: 2,
      icon: '📸',
      title: { en: 'Content Policy', bn: 'Content নীতি' },
      content: {
        en: [
          'You may only upload your own original content.',
          'Downloading and uploading content from YouTube, Facebook, TikTok or other platforms is strictly prohibited.',
          'Uploading copyrighted music, dramas, or movies is not allowed.',
          'Obscene, violent, or religiously offensive content is prohibited.',
          'Sharing others\' personal information or photos without permission is not allowed.',
          'Violations will result in content removal and account suspension.',
          'Echo World is not responsible for copyright violations — full liability rests with the uploader.',
        ],
        bn: [
          'আপনি শুধুমাত্র নিজের original content upload করতে পারবেন।',
          'YouTube, Facebook, TikTok বা অন্য platform থেকে download করে upload করা সম্পূর্ণ নিষিদ্ধ।',
          'Copyright করা গান, নাটক, সিনেমা upload করা যাবে না।',
          'অশ্লীল, হিংসাত্মক বা ধর্মীয় অনুভূতিতে আঘাত করে এমন content নিষিদ্ধ।',
          'অন্যের ব্যক্তিগত তথ্য বা ছবি অনুমতি ছাড়া share করা যাবে না।',
          'নিয়ম ভাঙলে content delete এবং account suspend করা হবে।',
          'Echo World কোনো copyright লঙ্ঘনের জন্য দায়ী থাকবে না — সম্পূর্ণ দায় content uploader এর।',
        ]
      }
    },
    {
      id: 3,
      icon: '💰',
      title: { en: 'Investment Policy', bn: 'Investment নীতি' },
      content: {
        en: [
          'Minimum deposit: $100 USDT TRC20.',
          'Daily returns: Starter 2%, Growth 2.5%, Elite 3%.',
          'You must post daily to unlock daily earnings.',
          'Withdrawals are only allowed on the 14th and 28th of each month.',
          'Minimum withdrawal: $50.',
          'Principal is returned after 365 days.',
          'Investment always carries risk — Echo World does not guarantee profit.',
          'Fraudulent transactions will result in a permanent ban and fund seizure.',
        ],
        bn: [
          'Minimum deposit $100 USDT TRC20।',
          'Investment এর দৈনিক return: Starter 2%, Growth 2.5%, Elite 3%।',
          'Daily earning পেতে প্রতিদিন একটি post করতে হবে।',
          'Withdrawal শুধুমাত্র প্রতি মাসের ১৪ ও ২৮ তারিখে।',
          'Minimum withdrawal $50।',
          'Investment ৩৬৫ দিন পর principal ফেরত দেওয়া হবে।',
          'Investment এ সর্বদা ঝুঁকি থাকে — Echo World কোনো guaranteed profit এর প্রতিশ্রুতি দেয় না।',
          'ভুয়া transaction বা fraud ধরা পড়লে account permanent ban এবং fund জব্দ করা হবে।',
        ]
      }
    },
    {
      id: 4,
      icon: '🔗',
      title: { en: 'Referral Policy', bn: 'Referral নীতি' },
      content: {
        en: [
          'Valid referral = referred user has an admin-approved deposit of $100+.',
          'Level 1 commission: 50% of referred user\'s daily income.',
          'Level 2 commission: 25% of indirect referral\'s daily income.',
          'Silver Salary: 12+ valid referrals + active Growth/Elite plan = $100/month.',
          'Gold Salary: 25+ valid referrals + active Growth/Elite plan = $250/month.',
          'You cannot use your own referral code.',
          'Fake or self-referrals will result in commission cancellation and account ban.',
        ],
        bn: [
          'Valid referral = referred user এর $100+ deposit admin approved হলে।',
          'Level 1 referral commission: referred user এর daily income এর 50%।',
          'Level 2 referral commission: indirect referral এর daily income এর 25%।',
          'Silver Salary: ১২+ valid referral + active Growth/Elite plan = $100/month।',
          'Gold Salary: ২৫+ valid referral + active Growth/Elite plan = $250/month।',
          'নিজের referral নিজে ব্যবহার করা যাবে না।',
          'Fake referral বা self-referral ধরা পড়লে সব commission বাতিল এবং account ban।',
        ]
      }
    },
    {
      id: 5,
      icon: '🔒',
      title: { en: 'Privacy Policy', bn: 'Privacy নীতি' },
      content: {
        en: [
          'Your personal information will not be sold to third parties.',
          'Your data is securely stored on Supabase (Singapore).',
          'Payment information is only used to verify transactions.',
          'All data will be deleted if you delete your account.',
          'Echo World is not responsible for security breaches caused by users sharing their PIN or password.',
        ],
        bn: [
          'আপনার personal তথ্য তৃতীয় পক্ষের কাছে বিক্রি করা হবে না।',
          'আপনার data Supabase (Singapore) এ সুরক্ষিতভাবে রাখা হয়।',
          'Payment তথ্য শুধুমাত্র transaction verify করতে ব্যবহার হয়।',
          'আপনার account delete করলে সব data মুছে ফেলা হবে।',
          'Echo World security breach এর জন্য দায়ী নয় যদি user নিজে PIN বা password share করে।',
        ]
      }
    },
    {
      id: 6,
      icon: '🚫',
      title: { en: 'Prohibited Activities', bn: 'নিষিদ্ধ কার্যক্রম' },
      content: {
        en: [
          'Using spam, bots or automated systems to boost engagement.',
          'Harassing, threatening or blackmailing other users.',
          'Attempting to hack or exploit the platform.',
          'Creating multiple accounts.',
          'Submitting fake investment screenshots.',
          'Uploading copyrighted content from other platforms.',
          'Any violation will result in a permanent account ban.',
        ],
        bn: [
          'Spam, bot বা automated system দিয়ে engagement বাড়ানো।',
          'অন্য user কে harass, threaten বা blackmail করা।',
          'Platform hack বা exploit করার চেষ্টা।',
          'Multiple account খোলা।',
          'Fake investment screenshot দিয়ে deposit করার চেষ্টা।',
          'অন্য platform এর copyrighted content upload করা।',
          'এই নিয়মের যেকোনো লঙ্ঘনে account permanent ban করা হবে।',
        ]
      }
    },
    {
      id: 7,
      icon: '⚖️',
      title: { en: 'Liability', bn: 'দায়বদ্ধতা' },
      content: {
        en: [
          'Echo World is a social and investment platform — not a financial advisor.',
          'Echo World is not responsible for investment gains or losses.',
          'Users are fully responsible for their own content.',
          'Echo World is not liable for service interruptions due to technical issues.',
          'Cryptocurrency transactions are irreversible — Echo World cannot recover funds sent to wrong addresses.',
        ],
        bn: [
          'Echo World একটি social ও investment platform — financial advisor নয়।',
          'Investment এ লাভ বা ক্ষতির জন্য Echo World দায়ী নয়।',
          'User এর নিজের content এর জন্য সম্পূর্ণ দায় user এর।',
          'Technical সমস্যার কারণে service বন্ধ হলে Echo World দায়ী নয়।',
          'Cryptocurrency transaction irreversible — ভুল address এ পাঠালে ফেরত দেওয়া সম্ভব নয়।',
        ]
      }
    },
    {
      id: 8,
      icon: '📞',
      title: { en: 'Contact Us', bn: 'যোগাযোগ' },
      content: {
        en: [
          'For any issues, contact us via Support Chat.',
          'Email: support@echoworld.vip',
          'We typically reply within 24 hours.',
          'For account or investment issues, please include your User ID.',
        ],
        bn: [
          'যেকোনো সমস্যায় Support Chat এ যোগাযোগ করুন।',
          'Email: support@echoworld.vip',
          'সাধারণত ২৪ ঘণ্টার মধ্যে reply দেওয়া হয়।',
          'Account বা investment সংক্রান্ত সমস্যায় User ID সহ যোগাযোগ করুন।',
        ]
      }
    },
  ]

  return (
    <div style={{ minHeight:'100vh', background:'#070a10', color:'#eef2f7', fontFamily:"'DM Sans',system-ui,sans-serif", paddingBottom:40 }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{display:none}
      `}</style>

      {/* Header */}
      <div style={{ position:'sticky', top:0, zIndex:100, background:'rgba(7,10,16,.97)', backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(255,255,255,.06)', padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={()=>window.history.back()} style={{ background:'rgba(255,255,255,.06)', border:'none', borderRadius:10, padding:'8px 14px', color:'#eef2f7', fontSize:13, fontWeight:700, cursor:'pointer' }}>
            ← {lang==='en' ? 'Back' : 'ফিরে যাও'}
          </button>
          <div>
            <div style={{ fontSize:16, fontWeight:900, background:'linear-gradient(90deg,#00e5ff,#00ff88)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              {lang==='en' ? 'Terms & Privacy' : 'শর্তাবলী ও Privacy'}
            </div>
            <div style={{ fontSize:10, color:'#4a5568' }}>{lang==='en' ? 'Last updated: January 2025' : 'সর্বশেষ আপডেট: জানুয়ারি ২০২৫'}</div>
          </div>
        </div>

        {/* Language Toggle */}
        <div style={{ display:'flex', background:'rgba(255,255,255,.06)', borderRadius:10, padding:3, gap:3 }}>
          <button onClick={()=>setLang('en')}
            style={{ padding:'6px 12px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:700, background: lang==='en' ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : 'transparent', color: lang==='en' ? '#070a10' : '#4a5568', transition:'all .2s' }}>
            EN
          </button>
          <button onClick={()=>setLang('bn')}
            style={{ padding:'6px 12px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:700, background: lang==='bn' ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : 'transparent', color: lang==='bn' ? '#070a10' : '#4a5568', transition:'all .2s' }}>
            বাং
          </button>
        </div>
      </div>

      <div style={{ padding:'20px 16px', maxWidth:600, margin:'0 auto' }}>

        {/* Hero */}
        <div style={{ background:'linear-gradient(135deg,rgba(0,229,255,.06),rgba(0,255,136,.04))', border:'1px solid rgba(0,229,255,.15)', borderRadius:20, padding:'24px 20px', marginBottom:20, textAlign:'center', animation:'fadeUp .3s ease' }}>
          <div style={{ fontSize:48, marginBottom:10 }}>⚖️</div>
          <div style={{ fontSize:20, fontWeight:900, color:'#eef2f7', marginBottom:6 }}>Echo World</div>
          <div style={{ fontSize:13, color:'#8892a4', lineHeight:1.7 }}>
            {lang==='en'
              ? 'By using this platform, you agree to all the terms below. Please read carefully.'
              : 'এই platform ব্যবহার করে আপনি নিচের সকল শর্তাবলী মেনে নিচ্ছেন। অনুগ্রহ করে সম্পূর্ণ পড়ুন।'}
          </div>
        </div>

        {/* Sections */}
        {sections.map((sec, idx) => (
          <div key={sec.id}
            style={{ background:'#111620', border:`1px solid ${activeSection===sec.id ? 'rgba(0,229,255,.3)' : 'rgba(255,255,255,.06)'}`, borderRadius:16, marginBottom:10, overflow:'hidden', animation:`fadeUp ${.3+idx*.05}s ease`, transition:'border .2s' }}>

            <div onClick={()=>setActiveSection(activeSection===sec.id ? null : sec.id)}
              style={{ padding:'16px', display:'flex', alignItems:'center', gap:12, cursor:'pointer' }}>
              <div style={{ width:42, height:42, borderRadius:12, background:'rgba(0,229,255,.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
                {sec.icon}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:800, color:'#eef2f7' }}>{sec.title[lang]}</div>
                <div style={{ fontSize:11, color:'#4a5568' }}>{lang==='en' ? sec.title.bn : sec.title.en}</div>
              </div>
              <div style={{ fontSize:20, color:'#4a5568', transition:'transform .2s', transform: activeSection===sec.id ? 'rotate(90deg)' : 'rotate(0)' }}>›</div>
            </div>

            {activeSection === sec.id && (
              <div style={{ padding:'0 16px 16px', borderTop:'1px solid rgba(255,255,255,.04)' }}>
                {sec.content[lang].map((item, i) => (
                  <div key={i} style={{ display:'flex', gap:10, padding:'8px 0', borderBottom: i < sec.content[lang].length-1 ? '1px solid rgba(255,255,255,.03)' : 'none' }}>
                    <div style={{ width:6, height:6, borderRadius:'50%', background:'#00e5ff', flexShrink:0, marginTop:6 }}/>
                    <div style={{ fontSize:13, color:'#8892a4', lineHeight:1.7 }}>{item}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Footer note */}
        <div style={{ background:'rgba(255,165,0,.05)', border:'1px solid rgba(255,165,0,.15)', borderRadius:14, padding:'14px 16px', marginTop:10, textAlign:'center' }}>
          <div style={{ fontSize:12, color:'#ffa500', fontWeight:700, marginBottom:4 }}>⚠️ {lang==='en' ? 'Important' : 'গুরুত্বপূর্ণ'}</div>
          <div style={{ fontSize:11, color:'#8892a4', lineHeight:1.7 }}>
            {lang==='en'
              ? 'These terms are governed by the laws of Bangladesh. Any disputes will be settled in Bangladeshi courts.'
              : 'এই শর্তাবলী Bangladesh এর আইন অনুযায়ী প্রযোজ্য। যেকোনো বিরোধ Bangladesh এর আদালতে নিষ্পত্তি হবে।'}
          </div>
        </div>

        {/* Accept button */}
        <button onClick={()=>window.history.back()}
          style={{ width:'100%', padding:16, background:'linear-gradient(135deg,#00e5ff,#00ff88)', border:'none', borderRadius:14, color:'#070a12', fontSize:15, fontWeight:900, cursor:'pointer', marginTop:16 }}>
          {lang==='en' ? '✅ I Agree' : '✅ বুঝেছি, একমত'}
        </button>
      </div>
    </div>
  )
    }
