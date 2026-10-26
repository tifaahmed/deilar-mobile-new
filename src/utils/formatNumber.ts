/** A number in the app's language: Arabic-Indic digits (٦٠٠) in Arabic, Latin (600) in English. */
export const formatNumber = (value: number, isAr: boolean): string =>
  new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-US', { maximumFractionDigits: 2, useGrouping: false }).format(value);
