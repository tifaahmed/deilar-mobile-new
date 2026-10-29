import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useContact } from '../hooks/useCatalog';

export type LegalKind = 'privacy' | 'terms';

type Section = { h: string; p: string[] };

const PRIVACY: Record<'ar' | 'en', { title: string; sections: Section[] }> = {
  ar: {
    title: 'سياسة الخصوصية',
    sections: [
      { h: 'البيانات التي نجمعها', p: [
        'الاسم ورقم الهاتف (وهو وسيلة الدخول)، وعند الحاجة: الرقم القومي والبريد الإلكتروني وتاريخ الميلاد والنوع والوظيفة والعنوان وصورتك الشخصية.',
        'بيانات الأقارب الذين تضيفهم على كارتك: الاسم وصلة القرابة والرقم القومي وصور البطاقة والصورة الشخصية. أنت مسؤول عن حصولك على موافقتهم.',
        'الطلبات والمدفوعات (المبلغ وطريقة الدفع وإيصالات التحويل). لا نخزّن أرقام بطاقات البنك؛ تتم معالجتها لدى بوابة الدفع.',
        'الموقع التقريبي لجهازك إذا سمحت به، لعرض أقرب المنشآت. وبيانات استخدام التطبيق (الشاشات المفتوحة ونوع الجهاز) وتقارير الأخطاء لتحسين الخدمة.',
        'إجابات لعبة الأسئلة والنقاط المرتبطة بحسابك.',
      ] },
      { h: 'كيف نستخدمها', p: [
        'لإصدار كارت ديلار وتفعيله، وإثبات الخصم لدى المنشآت الشريكة، وتوصيل الطلبات، وتأكيد المدفوعات، والتواصل معك بخصوص حسابك، ومنع الاحتيال (مثل تجربة مجانية واحدة لكل رقم هاتف).',
        'لا نبيع بياناتك ولا نستخدمها للإعلانات الخارجية.',
      ] },
      { h: 'مع من نشاركها', p: [
        'بوابة الدفع (Paymob) لإتمام الدفع، ومزوّد رسائل SMS لإرسال كود التحقق، والمنشآت والمتاجر الشريكة بالقدر اللازم لتنفيذ طلبك أو التحقق من كارتك، وشركة التوصيل عند طلب منتج. نلتزم بالإفصاح عند طلب جهة قانونية مختصة.',
      ] },
      { h: 'الاحتفاظ بالبيانات وحذفها', p: [
        'تستطيع حذف حسابك في أي وقت من: حسابي ← حذف الحساب. عند الحذف يختفي كارتك وبياناتك فوراً من التطبيق والخدمة، وإذا كنت صاحب الكارت الأساسي يُحذف معك جميع الأقارب التابعين له.',
        'نحتفظ بنسخة مخفية من البيانات، لا يراها أحد ولا نستخدمها. إذا سجّلت مجدداً بنفس رقم الهاتف أعدناها لك. وإن أردت المسح النهائي فاطلبه من خدمة العملاء ونمسحها خلال 30 يوماً.',
        'قد نحتفظ بسجلات الطلبات والمدفوعات للمدة التي يفرضها القانون المحاسبي والضريبي، وبسجل مختصر يمنع إساءة استخدام التجربة المجانية.',
      ] },
      { h: 'حقوقك', p: [
        'يمكنك الاطلاع على بياناتك وتعديلها من «حسابي»، وطلب نسخة منها أو تصحيحها أو حذفها عبر خدمة العملاء.',
        'يمكنك سحب إذن الموقع أو الكاميرا في أي وقت من إعدادات هاتفك، وسيعمل التطبيق بدونهما بشكل محدود.',
      ] },
      { h: 'الأطفال', p: ['الكارت للبالغين. يضيف صاحب الكارت أبناءه تحت مسؤوليته، ولا نطلب بيانات من الأطفال مباشرة.'] },
      { h: 'الأمان', p: ['نستخدم اتصالاً مشفّراً (HTTPS) وصلاحيات وصول محدودة للعاملين. لا توجد وسيلة نقل أو تخزين آمنة بنسبة 100%.'] },
      { h: 'التحديثات والتواصل', p: ['قد نحدّث هذه السياسة، وسنعرض النسخة الأحدث داخل التطبيق. للاستفسار تواصل مع خدمة العملاء.'] },
    ],
  },
  en: {
    title: 'Privacy Policy',
    sections: [
      { h: 'What we collect', p: [
        'Your name and phone number (your sign-in) and, when needed: national ID, email, date of birth, gender, job, address and profile photo.',
        'Details of the relatives you add to your card: name, relationship, national ID, ID photos and a portrait. You are responsible for having their consent.',
        'Orders and payments (amount, method, transfer receipts). We do not store bank card numbers; they are handled by the payment gateway.',
        'Your approximate location if you allow it, to show the nearest facilities. App usage data (screens opened, device type) and error reports to improve the service.',
        'Quiz answers and the loyalty points tied to your account.',
      ] },
      { h: 'How we use it', p: [
        'To issue and activate your Deilar card, prove your discount at partner facilities, deliver orders, confirm payments, contact you about your account and prevent fraud (for example one free trial per phone number).',
        'We do not sell your data and do not use it for third-party advertising.',
      ] },
      { h: 'Who we share it with', p: [
        'The payment gateway (Paymob) to complete payments, our SMS provider to send verification codes, partner facilities and stores only as needed to fulfil your order or verify your card, and delivery when you order a product. We disclose data when a competent legal authority requires it.',
      ] },
      { h: 'Retention and deletion', p: [
        'You can delete your account at any time: Account → Delete account. Your card and data disappear from the app and the service at once, and if you are the primary card holder, all relatives on that card are deleted with you.',
        'We keep a hidden copy that nobody sees or uses. If you sign up again with the same phone number we restore it for you. To have it erased for good, ask customer service and we erase it within 30 days.',
        'We may keep order and payment records for as long as accounting and tax law require, and a minimal record that prevents abuse of the free trial.',
      ] },
      { h: 'Your rights', p: [
        'You can view and edit your data under “Account”, and ask customer service for a copy, a correction or deletion.',
        'You can withdraw location or camera permission at any time in your phone settings; the app keeps working in a limited way without them.',
      ] },
      { h: 'Children', p: ['The card is for adults. A card holder adds their children under their own responsibility; we do not collect data from children directly.'] },
      { h: 'Security', p: ['We use encrypted connections (HTTPS) and restricted staff access. No method of transfer or storage is 100% secure.'] },
      { h: 'Updates and contact', p: ['We may update this policy and will show the latest version in the app. Contact customer service with any question.'] },
    ],
  },
};

const TERMS: Record<'ar' | 'en', { title: string; sections: Section[] }> = {
  ar: {
    title: 'شروط الاستخدام',
    sections: [
      { h: 'الخدمة', p: ['ديلار كارت خصومات لدى منشآت طبية ومتاجر شريكة، وتطبيق لعرضها وطلب المنتجات. الخصومات والعروض تحددها المنشآت الشريكة وقد تتغير.'] },
      { h: 'الحساب والكارت', p: [
        'الدخول برقم الهاتف وكود التحقق. أنت مسؤول عن صحة بياناتك وسرية الكود، والكارت شخصي ولا يُعار.',
        'التجربة المجانية مرة واحدة لكل رقم هاتف وللمالك فقط. الكارت المنتهي لا يعطي خصماً حتى يُجدَّد.',
      ] },
      { h: 'الأقارب', p: ['يضم الكارت حتى 15 قريباً من الدرجة الأولى (زوج/زوجة، ابن/ابنة، أب، أم) بعد الاشتراك المدفوع، ويراجعهم فريقنا قبل التفعيل. إساءة استخدام الكارت قد تؤدي إلى إيقافه.'] },
      { h: 'الاشتراك والدفع', p: [
        'الاشتراك سنوي أو نصف سنوي بالسعر المعروض داخل التطبيق، ويُدفع إلكترونياً أو عبر خدمة العملاء. الاشتراك خدمة تُستهلك خارج التطبيق لدى المنشآت الشريكة.',
        'يتم التفعيل بعد تأكيد الدفع. سياسة الاسترداد والإلغاء متاحة عبر خدمة العملاء.',
      ] },
      { h: 'الطلبات', p: ['أسعار المنتجات وتوفرها كما تظهر وقت الطلب. نبلغك بأي تعذّر في التنفيذ ونرد المبلغ في هذه الحالة.'] },
      { h: 'لعبة الأسئلة والنقاط', p: ['النقاط للتسلية ولا قيمة نقدية لها، وتُحتسب من الخادم، وللشركة تعديل قواعدها أو تعديل رصيد ثبت فيه خطأ أو غش.'] },
      { h: 'حذف الحساب', p: ['يمكنك حذف حسابك من «حسابي ← حذف الحساب». حذف صاحب الكارت الأساسي يحذف الأقارب التابعين له، وتعود البيانات إن سجّلت مجدداً بنفس الرقم. لا يُسترد ما تبقى من مدة اشتراك بعد الحذف.'] },
      { h: 'المسؤولية والتغييرات', p: [
        'الخدمات الطبية يقدمها مقدموها المستقلون، ولا تتحمل ديلار مسؤولية جودتها. قد نعدّل هذه الشروط وسنعرض النسخة الأحدث داخل التطبيق.',
        'تخضع هذه الشروط لقوانين جمهورية مصر العربية.',
      ] },
    ],
  },
  en: {
    title: 'Terms of Use',
    sections: [
      { h: 'The service', p: ['Deilar is a discount card for partner medical facilities and stores, and an app to browse them and order products. Discounts and offers are set by the partners and may change.'] },
      { h: 'Account and card', p: [
        'You sign in with your phone number and a verification code. You are responsible for the accuracy of your details and for keeping your code private; the card is personal and must not be lent.',
        'The free trial is once per phone number and for the owner only. An expired card gives no discount until renewed.',
      ] },
      { h: 'Relatives', p: ['A card holds up to 15 first-degree relatives (spouse, son/daughter, father, mother) once the subscription is paid; our team reviews them before activation. Misuse of the card may lead to its suspension.'] },
      { h: 'Subscription and payment', p: [
        'The subscription is yearly or half-yearly at the price shown in the app, paid online or through customer service. It is a service used outside the app, at partner facilities.',
        'The card is activated once payment is confirmed. Refund and cancellation terms are available from customer service.',
      ] },
      { h: 'Orders', p: ['Product prices and availability are as shown when you order. If we cannot fulfil an order we tell you and refund it.'] },
      { h: 'Quiz and points', p: ['Points are for fun and have no cash value; they are computed by the server, and the company may adjust rules or correct a balance affected by error or cheating.'] },
      { h: 'Deleting your account', p: ['You can delete your account under Account → Delete account. Deleting a primary card holder also deletes their relatives; signing up again with the same number restores them. Remaining subscription time is not refunded after deletion.'] },
      { h: 'Liability and changes', p: [
        'Medical services are provided by independent providers and Deilar is not responsible for their quality. We may change these terms and will show the latest version in the app.',
        'These terms are governed by the laws of the Arab Republic of Egypt.',
      ] },
    ],
  },
};

/** A policy as a full-screen sheet, opened from the account list, the sign-in popup and the delete-account screen. */
export const LegalSheet: React.FC<{ kind: LegalKind; onClose: () => void }> = ({ kind, onClose }) => {
  const { isAr } = useLanguage();
  const contact = useContact();
  const doc = (kind === 'privacy' ? PRIVACY : TERMS)[isAr ? 'ar' : 'en'];

  return (
    <div role="dialog" aria-modal="true" aria-label={doc.title} dir={isAr ? 'rtl' : 'ltr'} className="fixed inset-0 z-[1000] bg-white text-slate-900 flex flex-col animate-in fade-in duration-150">
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <h2 className="text-base font-black">{doc.title}</h2>
        <button onClick={onClose} aria-label={isAr ? 'إغلاق' : 'Close'} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer">
          <X className="w-5 h-5" />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 text-[13px] leading-6" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
        {doc.sections.map((s, i) => (
          <section key={s.h}>
            <h3 className="text-sm font-black text-[#941946] mb-1">{i + 1}. {s.h}</h3>
            {s.p.map((line) => <p key={line} className="text-slate-700 mb-1.5">{line}</p>)}
          </section>
        ))}
        {(contact.phone || contact.email) && (
          <p className="text-slate-500 text-xs pt-2 border-t border-slate-100">
            {isAr ? 'خدمة العملاء: ' : 'Customer service: '}
            {[contact.phone, contact.email].filter(Boolean).join(' • ')}
          </p>
        )}
      </div>
    </div>
  );
};

/** "By continuing you accept the Terms and the Privacy Policy" with both opening in place. */
export const LegalConsent: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isAr } = useLanguage();
  const [open, setOpen] = useState<LegalKind | null>(null);
  const link = 'underline font-bold cursor-pointer';

  return (
    <>
      <p className={`text-[11px] leading-5 ${className}`}>
        {isAr ? 'بالمتابعة فأنت توافق على ' : 'By continuing you accept the '}
        <button type="button" onClick={() => setOpen('terms')} className={link}>{isAr ? 'شروط الاستخدام' : 'Terms of Use'}</button>
        {isAr ? ' و' : ' and the '}
        <button type="button" onClick={() => setOpen('privacy')} className={link}>{isAr ? 'سياسة الخصوصية' : 'Privacy Policy'}</button>
        {isAr ? '.' : '.'}
      </p>
      {open && <LegalSheet kind={open} onClose={() => setOpen(null)} />}
    </>
  );
};
