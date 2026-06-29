export default function Privacy() {
  return (
    <div dir="rtl" className="min-h-svh bg-[#f0f2f5] flex items-start justify-center py-12 px-5">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-[0_2px_24px_rgba(0,0,0,0.07)] overflow-hidden">
        <div className="h-1 bg-[#E30613]" />
        <div className="p-8 flex flex-col gap-6">

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E30613]/10 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-[#E30613]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-black text-gray-900">מדיניות פרטיות</h1>
                <p className="text-xs text-gray-400 mt-0.5">מד״א — מערכת ניהול משמרות מתנדבים</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">עדכון אחרון: יוני 2026</p>
          </div>

          <Section title="מבוא">
            מערכת זו מופעלת על ידי מד״א ומשמשת לניהול משמרות ושיבוצים של מתנדבים. אנו מחויבים להגן על פרטיות המשתמשים ולעמוד בדרישות חוק הגנת הפרטיות הישראלי.
          </Section>

          <Section title="מידע שאנו אוספים">
            <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm">
              <li>שם מלא, כתובת אימייל ומספר טלפון</li>
              <li>תאריך לידה (לצורך אימות גיל ומעקב)</li>
              <li>היסטוריית משמרות, בקשות ואישורים</li>
              <li>נתוני כניסה למערכת (זמן התחברות, פעולות)</li>
            </ul>
          </Section>

          <Section title="שימוש במידע">
            המידע שנאסף משמש אך ורק למטרות הבאות:
            <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm mt-2">
              <li>ניהול ותיאום משמרות ואירועים</li>
              <li>תקשורת עם המתנדב בנוגע לשיבוצים</li>
              <li>ניהול מסד הנתונים של מתנדבי מד״א</li>
              <li>הפקת דוחות פנימיים לצוות הניהול</li>
            </ul>
          </Section>

          <Section title="גישה למידע">
            המידע נגיש בלבד לגורמים הבאים:
            <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm mt-2">
              <li>המתנדב עצמו — לנתוניו האישיים ומשמרותיו</li>
              <li>מנהלי המערכת ודיספצ׳רים — לצורך שיבוץ ותיאום</li>
            </ul>
            המידע אינו נמסר לגורמים חיצוניים.
          </Section>

          <Section title="אבטחת מידע">
            המידע מאוחסן בשרתי Supabase עם הצפנה מלאה, אימות דו-שלבי זמין, וגישה מבוקרת לפי הרשאות תפקיד.
          </Section>

          <Section title="זכויות המשתמש">
            בהתאם לחוק הגנת הפרטיות, ניתן לפנות אלינו בכל עת לצורך עיון, תיקון או מחיקת המידע האישי שלך.
          </Section>

          <Section title="יצירת קשר">
            לכל שאלה בנושא פרטיות: <a href="mailto:info@mda-young.com" className="text-[#E30613] font-medium">info@mda-young.com</a>
          </Section>

        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-bold text-gray-900 text-sm">{title}</h2>
      <div className="text-sm text-gray-600 leading-relaxed">{children}</div>
    </div>
  )
}
