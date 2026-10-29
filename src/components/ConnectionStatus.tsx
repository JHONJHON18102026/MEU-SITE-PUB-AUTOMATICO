import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase, supabaseStatus } from '../lib/supabase';

type PingState = 'idle' | 'checking' | 'online' | 'error';

export function ConnectionStatus() {
  const [pingState, setPingState] = useState<PingState>(
    supabaseStatus.configured ? 'checking' : 'idle',
  );
  const [detail, setDetail] = useState<string>(supabaseStatus.error ?? '');

  const checkConnection = async () => {
    if (!supabase) {
      setPingState('idle');
      setDetail(supabaseStatus.error ?? '');
      return;
    }

    setPingState('checking');
    try {
      const { error } = await supabase.auth.getSession();
      if (error) {
        setPingState('error');
        setDetail(error.message);
        return;
      }
      setPingState('online');
      setDetail('Cliente Supabase inicializado e respondendo com sucesso.');
    } catch (err) {
      setPingState('error');
      setDetail(
        err instanceof Error
          ? err.message
          : 'Não foi possível alcançar o projeto Supabase.',
      );
    }
  };

  useEffect(() => {
    void checkConnection();
  }, []);

  if (!supabaseStatus.configured) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div>
            <p className="font-semibold text-amber-100">
              Supabase aguardando configuração
            </p>
            <p className="mt-1 text-amber-200/90">{detail}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border p-4 text-sm ${
        pingState === 'online'
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
          : pingState === 'error'
            ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
            : 'border-slate-700 bg-slate-900/70 text-slate-300'
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {pingState === 'online' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
          ) : pingState === 'error' ? (
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400" />
          ) : (
            <RefreshCw className="h-5 w-5 shrink-0 animate-spin text-slate-400" />
          )}
          <div>
            <p className="font-semibold">
              {pingState === 'online'
                ? 'Supabase conectado'
                : pingState === 'error'
                  ? 'Falha ao validar conexão com o Supabase'
                  : 'Verificando conexão com o Supabase...'}
            </p>
            {detail && <p className="mt-0.5 opacity-90">{detail}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void checkConnection()}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium hover:bg-white/10 transition"
        >
          Testar novamente
        </button>
      </div>
    </div>
  );
}
