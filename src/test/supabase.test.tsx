import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../App';
import { isForbiddenSecretKey, validateSupabaseEnv } from '../lib/supabase';

function buildTestJwt(role: string): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ role }));
  return `${header}.${payload}.test_sig`;
}

describe('Validação de segurança das variáveis do Supabase', () => {
  it('avisa quando as variáveis estão vazias sem quebrar a aplicação', () => {
    const result = validateSupabaseEnv('', '');
    expect(result.configured).toBe(false);
    expect(result.error).toContain('VITE_SUPABASE_URL');
  });

  it('bloqueia chaves secretas sb_secret_ no frontend', () => {
    expect(isForbiddenSecretKey('sb_secret_test_only')).toBe(true);
    const result = validateSupabaseEnv(
      'https://localhost.localdomain',
      'sb_secret_test_only',
    );
    expect(result.configured).toBe(false);
    expect(result.error).toContain('Chave secreta detectada');
  });

  it('bloqueia JWT com role service_role no frontend', () => {
    const fakeServiceRole = buildTestJwt('service_role');
    expect(isForbiddenSecretKey(fakeServiceRole)).toBe(true);
  });

  it('aceita chave pública anon ou sb_publishable_ com URL HTTPS válida', () => {
    const publicAnon = buildTestJwt('anon');
    const result = validateSupabaseEnv('https://localhost.localdomain', publicAnon);
    expect(result.configured).toBe(true);
    expect(result.error).toBeNull();
  });
});

describe('Renderização do Template Base', () => {
  it('renderiza a página inicial e o painel de autenticação', () => {
    render(<App />);
    expect(
      screen.getByText(/Estrutura base limpa e conectada ao/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Entrar na Conta/i)).toBeInTheDocument();
  });
});
