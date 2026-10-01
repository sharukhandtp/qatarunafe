import { getLang } from '../i18n'

// Services and ministries carry an optional Arabic name next to the English one. The API
// returns both and leaves the choice to the client, so it follows the UI language here and
// falls back to English wherever no translation was entered.

const arabic = () => getLang() === 'ar'

export const serviceName = (s: { name: string; nameArabic?: string }) =>
  (arabic() && s.nameArabic) || s.name

export const serviceDescription = (s: { description?: string; descriptionArabic?: string }) =>
  (arabic() && s.descriptionArabic) || s.description

export const ministryName = (m: { ministryName: string; ministryNameArabic?: string }) =>
  (arabic() && m.ministryNameArabic) || m.ministryName
