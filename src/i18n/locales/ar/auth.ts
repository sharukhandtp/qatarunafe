import type { Translation } from '../../types'
import type { auth as source } from '../en/auth'

export const auth: Translation<typeof source> = {
  'auth.signIn': 'تسجيل الدخول',
  'auth.fullName': 'الاسم الكامل',
  'auth.mobileNumber': 'رقم الجوال',
  'auth.showPassword': 'إظهار كلمة المرور',
  'auth.hidePassword': 'إخفاء كلمة المرور',

  'auth.login.newHere': 'مستخدم جديد في قطرنا؟',
  'auth.login.createAccount': 'أنشئ حساب مواطن',
  'auth.login.registeredTitle': 'تم إنشاء الحساب',
  'auth.login.registeredBody': 'سجّل الدخول باستخدام كلمة المرور التي اخترتها للتو.',
  'auth.login.invalidTitle': 'بيانات الدخول غير صحيحة',
  'auth.login.invalidBody':
    'تحقّق من البريد الإلكتروني وكلمة المرور. تكرار المحاولات الفاشلة يؤدي إلى قفل الحساب لمدة 15 دقيقة.',

  'auth.demo.title': 'حسابات تجريبية',
  'auth.demo.before': 'يملأ البريد الإلكتروني تلقائيًا. كلمة المرور هي قيمة',
  'auth.demo.after': 'المحفوظة في أسرار المستخدم على الخادم.',
  'auth.demo.water': 'المياه',
  'auth.demo.electricity': 'الكهرباء',

  'auth.register.title': 'إنشاء حساب مواطن',
  'auth.register.alreadyRegistered': 'لديك حساب بالفعل؟',
  'auth.register.nationalIdHint': 'كما هو مدوّن في بطاقة الهوية.',
  'auth.register.residency': 'حالة الإقامة',
  'auth.register.nativeDescription': 'يحق لك الاستفادة من جميع الخدمات، بما فيها الدعم والمنح.',
  'auth.register.residentDescription': 'يحق لك الاستفادة من الخدمات العامة.',
  'auth.register.confirmPassword': 'تأكيد كلمة المرور',
  'auth.register.passwordMismatch': 'كلمتا المرور غير متطابقتين.',
  'auth.register.submit': 'إنشاء الحساب',
}
