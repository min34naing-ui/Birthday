# Pink Romantic Birthday Website (Cloudflare Pages + Supabase)

ဒီ Project က HTML/CSS/JavaScript သီးသန့် Website ဖြစ်ပြီး Free Plan တွေနဲ့ စတင်နိုင်ပါတယ်။
Website ကို Cloudflare Pages မှာ တင်ပြီး Login နဲ့ Private Photo Storage ကို Supabase က ကိုင်တွယ်ပါတယ်။

## 1) Supabase Project ပြင်ဆင်ရန်

1. https://supabase.com မှာ project အသစ်လုပ်ပါ။
2. Authentication > Providers မှာ Email provider ဖွင့်ထားပါ။
3. Authentication > Settings / Sign In settings မှာ public sign-up ကို ပိတ်ပါ (Dashboard UI မှာ Enable email signups ကို OFF လုပ်ပါ)။
4. Authentication > Users မှာ email/password နဲ့ account နှစ်ခုကို ကိုယ်တိုင်ဖန်တီးပါ။ (သင်နဲ့ မွေးနေ့ရှင်)
5. User နှစ်ယောက်စလုံးရဲ့ UUID ကို copy လုပ်ထားပါ။
6. Storage မှာ `birthday-photos` ဆိုတဲ့ bucket အသစ်လုပ်ပြီး **Public bucket ကို OFF** ထားပါ။
7. `birthday-photos` ထဲမှာ `shared` folder အောက်ကို ပုံတွေ upload လုပ်ပါ။ ဥပမာ `shared/photo-01.jpg`။
8. SQL Editor ထဲ `supabase-setup.sql` ကို ကူးထည့်ပါ။ UUID placeholder နှစ်ခုကို အမှန် UUID နဲ့ အစားထိုးပြီး Run လုပ်ပါ။
9. Project Settings > API (သို့) Connect မှာ Project URL နဲ့ anon/publishable key ကို ရယူပါ။

> သတိ: SQL ထဲက `REPLACE-WITH-FIRST-USER-UUID` နဲ့ `REPLACE-WITH-SECOND-USER-UUID` ကို အစားမထိုးဘဲ Run မလုပ်ပါနဲ့။

## 2) Local config ပြင်ရန်

1. `config.example.js` ကို `config.js` လို့ copy/rename လုပ်ပါ။
2. `config.js` ထဲမှာ `SUPABASE_URL` နဲ့ `SUPABASE_ANON_KEY` ကို ဖြည့်ပါ။
3. `config.js` ကို GitHub မှာ တင်ရမယ်ဆိုတာ သိထားပါ။ ဒီ key က anon/publishable key သာဖြစ်ရပါမယ်။ Service role key, database password, user password ကို ဘယ်တော့မှ မထည့်ပါနဲ့။
4. `config.js` က public ဖြစ်နိုင်တာကြောင့် လုံခြုံရေးအားလုံးကို Supabase RLS နဲ့ Storage policies က enforce လုပ်ထားရပါမယ်။

## 3) GitHub + Cloudflare Pages တင်ရန်

1. GitHub မှာ private သို့မဟုတ် public repository တစ်ခုဖန်တီးပါ။
2. `index.html`, `style.css`, `script.js`, `config.js` ဖိုင်တွေကို repository root မှာတင်ပါ။
3. Cloudflare Dashboard > Workers & Pages > Create > Pages > Connect to Git ကိုရွေးပါ။
4. GitHub repository ကိုရွေးပါ။
5. Framework preset ကို None၊ Build command ကို blank၊ Build output directory ကို `.` ထားပါ။
6. Deploy လုပ်ပါ။
7. Cloudflare ပေးတဲ့ `*.pages.dev` link နဲ့ စမ်းသပ်ပါ။

## 4) Security Checklist

- [ ] Public sign-up ပိတ်ထားသည်။
- [ ] Account နှစ်ခုကို ကိုယ်တိုင်ဖန်တီးထားသည်။
- [ ] `birthday_members` ထဲ approved user UUID နှစ်ခုသာရှိသည်။
- [ ] `birthday-photos` bucket သည် Private ဖြစ်သည်။
- [ ] SQL policies ကို run လုပ်ပြီးပြီ။
- [ ] Website မှာ anon/publishable key သာရှိသည်။
- [ ] Service role key / DB password / account password ကို frontend ထဲ မထည့်ထားပါ။
- [ ] Incognito browser မှာ login မဝင်ဘဲ ပုံ link ကိုဖွင့်လို့မရကြောင်း စမ်းသပ်ထားသည်။
- [ ] ခွင့်မပြုထားတဲ့ တတိယ account နဲ့ login ဝင်လို့မရကြောင်း စမ်းသပ်ထားသည်။

## 5) ဓာတ်ပုံထည့်ရန်

Supabase Dashboard > Storage > birthday-photos > shared ထဲကို JPG, PNG, WEBP ပုံတွေတင်ပါ။
Website က folder ထဲကပုံတွေကို အလိုအလျောက်ပြသပါမယ်။ လက်ရှိ code က ပုံ 100 အထိ list လုပ်ထားပါတယ်။

## Important notes

- Static site source ကို လူတိုင်းကြည့်နိုင်ပါတယ်။ အဲဒါကြောင့် HTML/JS ထဲမှာ password သို့မဟုတ် secret မထားပါနဲ့။
- Cloudflare Pages hosting ကိုယ်တိုင်က login security မဟုတ်ပါ။ Supabase Auth + RLS + private bucket က access ကို ထိန်းချုပ်ပါတယ်။
- Supabase signed URL က သက်တမ်းကုန်ချိန်အထိ share လုပ်သူက အသုံးပြုနိုင်တဲ့ temporary link ဖြစ်ပါတယ်။ ဒီ project မှာ 1 နာရီသတ်မှတ်ထားပါတယ်။
- Supabase Free project တွေမှာ quota နဲ့ inactivity pause စတဲ့ စည်းကမ်းတွေ ပြောင်းလဲနိုင်ပါတယ်။ လက်ရှိ pricing page ကို စစ်ပါ။
- ဒီ starter project မှာ gallery ကို ကြည့်ခွင့်သာပေးထားပြီး website ကနေ photo upload မလုပ်နိုင်ပါ။ Dashboard ကနေ upload လုပ်ပါ။
