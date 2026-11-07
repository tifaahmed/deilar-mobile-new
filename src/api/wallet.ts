import { apiGetAuth } from './http';

/** One line of the member's wallet, as `GET /wallet` draws it: `amount` is in pounds, positive = money in. */
export interface WalletEntry {
  id: number;
  source: string;
  amount: number;
  points: number | null;
  note: string | null;
  at: string | null;
}

/** The wallet's balance and its latest lines (newest first). null = could not be read (offline, signed out). */
export async function fetchWallet(token: string): Promise<{ balance: number; entries: WalletEntry[] } | null> {
  try {
    const { data } = await apiGetAuth<{ data: { balance: number; entries: WalletEntry[] } }>('/wallet', token);
    return { balance: data.balance, entries: data.entries ?? [] };
  } catch {
    return null;
  }
}

/** What a wallet line was, in the member's words. `note` is shown separately (an admin's reason, for example). */
export function walletSourceLabel(source: string, amount: number, isAr = true): string {
  if (!isAr) {
    switch (source) {
      case 'points': return 'Converted from points';
      case 'topup': return 'Wallet top-up';
      case 'order': return amount < 0 ? 'Paid part of an order' : 'Order amount';
      case 'membership': return 'Card subscription payment';
      case 'refund': return 'Refund to the wallet';
      case 'referral': return 'Invitation reward';
      case 'withdrawal': return 'Cash out to Vodafone Cash';
      case 'transfer': return amount < 0 ? 'Sent to a member' : 'Received from a member';
      case 'admin': return amount < 0 ? 'Deducted by admin' : 'Added by admin';
      default: return 'Wallet movement';
    }
  }
  switch (source) {
    case 'points': return 'تحويل من النقاط';
    case 'topup': return 'شحن المحفظة';
    case 'order': return amount < 0 ? 'دفع جزء من طلب' : 'مبلغ طلب';
    case 'membership': return 'دفع اشتراك الكارت';
    case 'refund': return 'استرداد إلى المحفظة';
    case 'referral': return 'مكافأة دعوة صديق';
    case 'withdrawal': return 'سحب إلى فودافون كاش';
    case 'transfer': return amount < 0 ? 'تحويل إلى عضو' : 'تحويل من عضو';
    case 'admin': return amount < 0 ? 'خصم من الإدارة' : 'إضافة من الإدارة';
    default: return 'حركة على المحفظة';
  }
}
