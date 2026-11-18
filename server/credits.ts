/**
 * Helper compartilhado de débito atômico e estorno proporcional (usado por Avatares e AI UGC).
 */
import { ApiError } from './errors';
import { getAdmin } from './supabaseAdmin';

export async function debitUserCredits(opts: {
  userId: string;
  amount: number;
  reason: string;
  refId: string;
  insufficientMessage: string;
}): Promise<number> {
  const admin = getAdmin();
  const debit = await admin.rpc('debit_credits', {
    p_user: opts.userId,
    p_amount: opts.amount,
    p_reason: opts.reason,
    p_ref: opts.refId,
  });
  if (debit.error) {
    if (/INSUFFICIENT_CREDITS/.test(debit.error.message)) {
      throw new ApiError('INSUFFICIENT_CREDITS', opts.insufficientMessage);
    }
    throw new ApiError('INTERNAL', `Falha ao debitar créditos: ${debit.error.message}`);
  }
  return Number(debit.data);
}

export async function refundUserCredits(opts: {
  userId: string;
  amount: number;
  reason?: string;
  refId: string;
}): Promise<number | null> {
  if (opts.amount <= 0) return null;
  const admin = getAdmin();
  const credit = await admin.rpc('credit_credits', {
    p_user: opts.userId,
    p_amount: opts.amount,
    p_reason: opts.reason ?? 'refund',
    p_ref: opts.refId,
  });
  return credit.error ? null : Number(credit.data);
}
