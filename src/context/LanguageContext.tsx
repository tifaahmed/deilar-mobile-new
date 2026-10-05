import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppLanguage = 'ar' | 'en';

interface TranslationsDictionary {
  [key: string]: {
    ar: string;
    en: string;
  };
}

export const TRANSLATIONS: TranslationsDictionary = {
  // Brand
  brandName: {
    ar: 'ديلر',
    en: 'deilar',
  },
  brandPlatform: {
    ar: 'منصة ديلر الطبية',
    en: 'deilar Medical Platform',
  },
  tagline: {
    ar: 'كرت الخصومات الطبية',
    en: 'Medical Discount Card',
  },
  certifiedCard: {
    ar: 'كرت الخصومات المعتمد',
    en: 'Certified Discount Card',
  },

  // Navigation
  navHome: {
    ar: 'الرئيسية',
    en: 'Home',
  },
  navStore: {
    ar: 'المتجر',
    en: 'Store',
  },
  navMap: {
    ar: 'الخريطة',
    en: 'Map',
  },
  navProfile: {
    ar: 'حسابي',
    en: 'Profile',
  },

  // Header & Controls
  myLocationDefault: {
    ar: 'موقعي (القاهرة)',
    en: 'My Location (Cairo)',
  },
  selectLocationPrompt: {
    ar: 'اختر موقعك لتحديد أقرب الفروع:',
    en: 'Select location for nearest branches:',
  },
  autoGps: {
    ar: 'تحديد موقعي التلقائي (GPS)',
    en: 'Auto-detect GPS location',
  },
  gpsLoading: {
    ar: 'جاري تحديد موقعك...',
    en: 'Detecting GPS location...',
  },
  phoneFrame: {
    ar: 'إطار الهاتف',
    en: 'Phone Frame',
  },
  expandedView: {
    ar: 'عرض موسع',
    en: 'Expanded View',
  },
  searchPlaceholder: {
    ar: 'ابحث عن مستشفى، معمل، صيدلية...',
    en: 'Search hospital, lab, pharmacy...',
  },
  cart: {
    ar: 'السلة',
    en: 'Cart',
  },

  // Profile Sub-tabs
  tabCard: {
    ar: 'الكرت الطبي',
    en: 'Medical Card',
  },
  tabMembers: {
    ar: 'أفراد الأسرة',
    en: 'Family Members',
  },
  tabSupport: {
    ar: 'الدعم الفني',
    en: 'Support',
  },
  tabPersonal: {
    ar: 'بياناتي',
    en: 'Personal Info',
  },
  tabTheme: {
    ar: 'المظهر',
    en: 'Appearance',
  },

  // Card Tab
  userCardTitle: {
    ar: 'كرت ديلر الطبي الخاص بحسابك',
    en: 'Your deilar Medical Card',
  },
  officialCertified: {
    ar: 'رسمي ومعتمد',
    en: 'Official & Certified',
  },
  downloadFront: {
    ar: 'تحميل وجه الكارت (PNG)',
    en: 'Download Front (PNG)',
  },
  downloadBack: {
    ar: 'تحميل ظهر الكارت (PNG)',
    en: 'Download Back (PNG)',
  },
  downloadCardShort: {
    ar: 'تحميل الكرت',
    en: 'Download Card',
  },
  frontSide: {
    ar: 'الوجه الأمامي',
    en: 'Front Side',
  },
  backSide: {
    ar: 'ظهر الكرت',
    en: 'Back Side',
  },
  copyId: {
    ar: 'نسخ الرقم',
    en: 'Copy ID',
  },
  copied: {
    ar: 'تم النسخ!',
    en: 'Copied!',
  },
  shareWhatsapp: {
    ar: 'مشاركة واتساب',
    en: 'Share WhatsApp',
  },
  tapToFlip: {
    ar: 'اضغط على الكرت لقلب الوجهين (الأمامي / الخلفي)',
    en: 'Tap card to flip between front & back',
  },
  cardDownloadSuccess: {
    ar: 'تم حفظ كرت ديلر الطبي عالي الدقة على جهازك بنجاح!',
    en: 'High-res deilar card saved to your device successfully!',
  },
  activeMember: {
    ar: 'عضو نشط',
    en: 'Active Member',
  },
  membershipId: {
    ar: 'رقم العضوية',
    en: 'Membership ID',
  },

  // Family Members Tab
  familyMembersCount: {
    ar: 'أفراد الأسرة المسجلين بالكرت',
    en: 'Family Members on Card',
  },
  addNewMember: {
    ar: 'إضافة فرد جديد',
    en: 'Add New Member',
  },
  familyMembersDesc: {
    ar: 'جميع الأفراد أدناه مشمولين بنسب الخصم الطبية، اضغط على أي فرد لعرض بطاقته الشخصية.',
    en: 'All members below are covered by medical discounts. Tap any member to view their card.',
  },
  activeStatus: {
    ar: 'مفعل ✓',
    en: 'Active ✓',
  },
  viewCardAction: {
    ar: 'عرض الكرت',
    en: 'View Card',
  },
  primaryAccount: {
    ar: 'حساب رئيسي',
    en: 'Primary Account',
  },
  addMemberTitle: {
    ar: 'إضافة فرد جديد إلى الكرت الطبي',
    en: 'Add New Family Member to Card',
  },
  memberNamePrompt: {
    ar: 'الاسم الكامل للفرد:',
    en: 'Member Full Name:',
  },
  relationPrompt: {
    ar: 'صلة القرابة:',
    en: 'Relationship:',
  },
  nationalIdOptional: {
    ar: 'الرقم القومي (اختياري):',
    en: 'National ID (Optional):',
  },
  confirmAddMember: {
    ar: 'تأكيد إضافة الفرد',
    en: 'Confirm Add Member',
  },
  memberAddedSuccess: {
    ar: 'تمت إضافة الفرد بنجاح! ✓',
    en: 'Member added successfully! ✓',
  },
  relWife: { ar: 'زوجة', en: 'Wife' },
  relSon: { ar: 'ابن', en: 'Son' },
  relDaughter: { ar: 'ابنة', en: 'Daughter' },
  relFather: { ar: 'والد', en: 'Father' },
  relMother: { ar: 'والدة', en: 'Mother' },
  relSibling: { ar: 'أخ / أخت', en: 'Sibling' },

  // Support Tab
  supportTitle: {
    ar: 'فريق الدعم الفني وخدمة العملاء',
    en: 'Customer Care & Technical Support',
  },
  supportAvailable247: {
    ar: 'متاح 24/7',
    en: 'Available 24/7',
  },
  supportDesc: {
    ar: 'فريق رعاية عملاء كرت ديلر متواجد على مدار الساعة للرد على استفساراتكم وحجز المستشفيات.',
    en: 'deilar customer care team is available 24/7 to assist with your medical inquiries and hospital bookings.',
  },
  directWhatsapp: {
    ar: 'محادثة واتساب مباشرة',
    en: 'WhatsApp Support',
  },
  hotlineCall: {
    ar: 'اتصال هاتفي بالخط الساخن',
    en: 'Hotline Direct Call',
  },
  officialWebsite: {
    ar: 'الموقع الرسمي لـ ديلر',
    en: 'Official deilar Website',
  },
  facebookPage: {
    ar: 'صفحتنا على فيسبوك',
    en: 'Our Facebook Page',
  },
  ticketSectionTitle: {
    ar: 'إرسال استفسار أو بلاغ لمشرف الخدمة:',
    en: 'Submit Ticket / Inquiry to Support:',
  },
  ticketTopicGeneral: {
    ar: 'استفسار عام عن نسب الخصم',
    en: 'General inquiry about discount rates',
  },
  ticketTopicComplaint: {
    ar: 'إبلاغ عن عدم تطبيق الخصم بفرع معين',
    en: 'Report discount issue at a branch',
  },
  ticketTopicBooking: {
    ar: 'مساعدة في حجز عملية جراحية أو كشف استشاري',
    en: 'Assistance booking surgery or consultation',
  },
  ticketTopicSuggest: {
    ar: 'اقتراح إضافة مستشفى أو معمل جديد للشبكة',
    en: 'Suggest adding new hospital or lab',
  },
  ticketPlaceholder: {
    ar: 'اكتب تفاصيل استفسارك أو طلبك هنا...',
    en: 'Write your inquiry details here...',
  },
  sendTicketBtn: {
    ar: 'إرسال الرسالة إلى خدمة العملاء',
    en: 'Send Message to Customer Care',
  },
  ticketSuccess: {
    ar: 'تم استلام استفسارك بنجاح! سيتواصل معك ممثل خدمة العملاء عبر الهاتف أو الواتساب فوراً.',
    en: 'Inquiry received successfully! A representative will contact you shortly.',
  },

  // Personal Info Tab
  personalInfoTitle: {
    ar: 'تعديل البيانات الشخصية للحساب',
    en: 'Edit Account Personal Information',
  },
  instantUpdate: {
    ar: 'تحديث فوري',
    en: 'Instant Update',
  },
  fullNamePrompt: {
    ar: 'الاسم بالكامل (كما يظهر على الكرت الطبي):',
    en: 'Full Name (as shown on medical card):',
  },
  phonePrompt: {
    ar: 'رقم الهاتف الأساسي:',
    en: 'Primary Phone Number:',
  },
  emailPrompt: {
    ar: 'البريد الإلكتروني:',
    en: 'Email Address:',
  },
  governoratePrompt: {
    ar: 'المحافظة والمنطقة:',
    en: 'Governorate & City:',
  },
  nationalIdPrompt: {
    ar: 'الرقم القومي (14 رقم):',
    en: 'National ID (14 digits):',
  },
  saveChangesBtn: {
    ar: 'حفظ التعديلات على الحساب',
    en: 'Save Account Changes',
  },
  saveChangesSuccess: {
    ar: 'تم حفظ وتحديث بياناتك الشخصية بنجاح!',
    en: 'Personal information saved and updated successfully!',
  },

  // Appearance & Language Tab
  appearanceSectionTitle: {
    ar: 'الشكل العام ومظهر التطبيق (Theme & Language)',
    en: 'Appearance & App Settings (Theme & Language)',
  },
  languageChoiceTitle: {
    ar: 'لغة التطبيق / App Language',
    en: 'App Language / لغة التطبيق',
  },
  languageChoiceDesc: {
    ar: 'اختر لغة واجهة التطبيق المفضلة:',
    en: 'Select your preferred application language:',
  },
  arabicOption: {
    ar: 'العربية (ديلر)',
    en: 'Arabic (ديلر)',
  },
  englishOption: {
    ar: 'English (deilar)',
    en: 'English (deilar)',
  },
  themeChoiceTitle: {
    ar: 'وضع المظهر (Theme)',
    en: 'Theme Mode (Color Scheme)',
  },
  themeChoiceDesc: {
    ar: 'اختر المظهر المفضل لتجربة استخدام مريحة لعينك في كافة شاشات التطبيق:',
    en: 'Choose your preferred visual theme for a comfortable experience across all screens:',
  },
  lightMode: {
    ar: 'الوضع الفاتح (Light)',
    en: 'Light Mode',
  },
  lightModeDesc: {
    ar: 'ألوان نهارية ناصعة وواضحة',
    en: 'Bright & clean daytime colors',
  },
  darkMode: {
    ar: 'الوضع الداكن (Dark)',
    en: 'Dark Mode',
  },
  darkModeDesc: {
    ar: 'خلفية #0A0E17 وكروت #181B26',
    en: 'Background #0A0E17 & Cards #181B26',
  },
  activeThemeLabel: {
    ar: 'المظهر النشط حالياً:',
    en: 'Currently Active Theme:',
  },
  activeLangLabel: {
    ar: 'اللغة النشطة حالياً:',
    en: 'Currently Active Language:',
  },

  // Free Card Modal
  freeCardModalTitle: {
    ar: 'اطلب الكارت مجاناً',
    en: 'Get Your Free Card',
  },
  freeCardPhonePlaceholder: {
    ar: 'رقم الهاتف (010xxxxxxxx)',
    en: 'Phone Number (010xxxxxxxx)',
  },
  freeCardSubmit: {
    ar: 'تفعيل الكارت مجاناً',
    en: 'Activate Free Card',
  },
  freeCardSubmitting: {
    ar: 'جاري التفعيل...',
    en: 'Activating...',
  },
  freeCardSuccessTitle: {
    ar: 'تم تفعيل كارتك بنجاح!',
    en: 'Card Activated Successfully!',
  },
  enterAppAction: {
    ar: 'الدخول للتطبيق',
    en: 'Enter App',
  },

  // Home Screen
  heroHeadline: {
    ar: 'وفر حتى 50% من تكاليف علاجك مع كرت ديلر',
    en: 'Save up to 50% on medical expenses with deilar card',
  },
  heroSubtitle: {
    ar: 'شبكة طبية معتمدة تضم كبرى المستشفيات والمعامل والصيدليات في مصر',
    en: 'Accredited medical network covering top hospitals, labs and pharmacies across Egypt',
  },
  quickBtnStore: {
    ar: 'المتجر',
    en: 'Store',
  },
  quickBtnProducts: {
    ar: 'منتجاتنا',
    en: 'Products',
  },
  quickBtnCard: {
    ar: 'كرتي الطبي',
    en: 'My Card',
  },
  facilitiesTitle: {
    ar: 'المنشآت والخدمات الطبية المعتمدة',
    en: 'Certified Medical Facilities & Services',
  },
  catHospitals: {
    ar: 'المستشفيات',
    en: 'Hospitals',
  },
  catLabs: {
    ar: 'معامل التحاليل',
    en: 'Clinical Labs',
  },
  catPharmacies: {
    ar: 'الصيدليات',
    en: 'Pharmacies',
  },
  catClinics: {
    ar: 'عيادات الأطباء',
    en: 'Clinics',
  },
  catRadiology: {
    ar: 'مراكز الأشعة',
    en: 'Radiology',
  },
  catDentalEye: {
    ar: 'الأسنان والعيون',
    en: 'Dental & Eye',
  },
  calculatorTitle: {
    ar: 'حاسبة توفير ديلر الذكية',
    en: 'deilar Smart Savings Calculator',
  },
  calcBillAmount: {
    ar: 'قيمة الفاتورة المتوقعة:',
    en: 'Expected Bill Amount:',
  },
  calcDiscountAmount: {
    ar: 'قيمة الخصم التقريبي:',
    en: 'Estimated Discount Amount:',
  },
  calcFinalAmount: {
    ar: 'المبلغ المطلوب بعد خصم ديلر:',
    en: 'Amount Required After deilar Discount:',
  },
  calcEgp: {
    ar: 'جنيه',
    en: 'EGP',
  },
  nearestTitle: {
    ar: 'أقرب الفروع الطبية لموقعك',
    en: 'Nearest Medical Branches to You',
  },
  viewAllMap: {
    ar: 'مشاهدة الكل على الخريطة',
    en: 'View All on Map',
  },
  kmAway: {
    ar: 'كم من موقعك',
    en: 'km from your location',
  },
  discountBadge: {
    ar: 'خصم',
    en: 'OFF',
  },
};

interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: (key: keyof typeof TRANSLATIONS) => string;
  isAr: boolean;
  isEn: boolean;
  brandName: string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    try {
      const stored = localStorage.getItem('deilar_language');
      return (stored === 'en' || stored === 'ar') ? stored : 'ar';
    } catch {
      return 'ar';
    }
  });

  const setLanguage = (lang: AppLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('deilar_language', lang);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.title = language === 'ar'
      ? 'ديلر - كرت الخصومات الطبية'
      : 'deilar - Medical Discount Card';
  }, [language]);

  const t = (key: keyof typeof TRANSLATIONS): string => {
    const item = TRANSLATIONS[key];
    if (!item) return String(key);
    return item[language] || item['ar'] || String(key);
  };

  const brandName = language === 'ar' ? 'ديلر' : 'deilar';

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        isAr: language === 'ar',
        isEn: language === 'en',
        brandName,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
