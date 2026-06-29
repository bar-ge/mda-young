export default function Terms() {
  return (
    <div dir="rtl" className="min-h-svh bg-[#f0f2f5] flex items-start justify-center py-12 px-5">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-[0_2px_24px_rgba(0,0,0,0.07)] overflow-hidden">
        <div className="h-1 bg-[#E30613]" />
        <div className="p-8 flex flex-col gap-6">

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E30613]/10 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-[#E30613]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-black text-gray-900">תנאי שימוש</h1>
                <p className="text-xs text-gray-400 mt-0.5">מד״א — מערכת ניהול משמרות מתנדבים</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">עדכון אחרון: יוני 2026</p>
          </div>

          <Section title="כללי">
            השימוש במערכת זו מהווה הסכמה לתנאי השימוש המפורטים להלן. המערכת מיועדת למתנדבי מד״א בלבד ולצוות הניהול המורשה.
          </Section>

          <Section title="זכאות לשימוש">
            <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm">
              <li>מתנדבי מד״א פעילים שקיבלו אישור גישה</li>
              <li>דיספצ׳רים ומנהלי עמדה מורשים</li>
              <li>גיל מינימלי: 14 שנים</li>
            </ul>
          </Section>

          <Section title="כללי שימוש">
            <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm">
              <li>חל איסור מוחלט על שיתוף פרטי הכניסה עם גורמים אחרים</li>
              <li>יש לעדכן את פרטי הקשר במידה ומשתנים</li>
              <li>ביטול משמרת ייעשה בזמן סביר ובהתאם להנחיות הארגון</li>
              <li>חל איסור על שימוש במערכת לכל מטרה שאינה קשורה לפעילות מד״א</li>
            </ul>
          </Section>

          <Section title="אחריות המשתמש">
            המשתמש אחראי לדיוק המידע שמסר בעת ההרשמה ולכל פעולה שתבוצע תחת חשבונו. יש לדווח מיידית על כל שימוש חשוד בחשבון.
          </Section>

          <Section title="הגבלת אחריות">
            מד״א אינה אחראית לנזקים שיגרמו כתוצאה מתקלות טכניות, אובדן גישה זמני, או שימוש לא מורשה שנבע מרשלנות המשתמש.
          </Section>

          <Section title="שינויים בתנאים">
            מד״א שומרת לעצמה את הזכות לשנות את תנאי השימוש בכל עת. שינויים מהותיים יפורסמו בהתראה מראש דרך מערכת ההודעות.
          </Section>

          <Section title="יצירת קשר">
            לכל שאלה או בירור: <a href="mailto:info@mda-young.com" className="text-[#E30613] font-medium">info@mda-young.com</a>
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
