import { describe, expect, it } from 'vitest';
import { ApiError } from '../../server/errors';
import { withRustEngineQueue } from '../../server/rustMotor';

describe('fila compartilhada do motor Hust', () => {
  it('executa imagem e vídeo em ordem, sem sobrepor operações na sessão Flow', async () => {
    let active = 0;
    let maxActive = 0;
    const order: string[] = [];
    const tasks = ['imagem', 'vídeo', 'imagem'].map((label) =>
      withRustEngineQueue(async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        order.push(`início:${label}`);
        await new Promise((resolve) => setTimeout(resolve, 5));
        order.push(`fim:${label}`);
        active -= 1;
        return label;
      }, label),
    );

    await expect(Promise.all(tasks)).resolves.toEqual(['imagem', 'vídeo', 'imagem']);
    expect(maxActive).toBe(1);
    expect(order).toEqual([
      'início:imagem', 'fim:imagem',
      'início:vídeo', 'fim:vídeo',
      'início:imagem', 'fim:imagem',
    ]);
  });

  it('libera a fila mesmo quando uma operação falha', async () => {
    await expect(withRustEngineQueue(async () => { throw new Error('Flow recusou a operação'); }, 'teste'))
      .rejects.toThrow('Flow recusou a operação');
    await expect(withRustEngineQueue(async () => 'executada', 'teste'))
      .resolves.toBe('executada');
  });

  it('aplica limite explícito sem descartar os trabalhos que já entraram', async () => {
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => { releaseFirst = resolve; });
    const started: number[] = [];
    const accepted = Array.from({ length: 24 }, (_, index) =>
      withRustEngineQueue(async () => {
        started.push(index);
        if (index === 0) await firstGate;
      }, 'teste-limite'),
    );

    await expect(withRustEngineQueue(async () => undefined, 'teste-limite'))
      .rejects.toBeInstanceOf(ApiError);
    expect(started).toEqual([0]);
    releaseFirst();
    await Promise.all(accepted);
    expect(started).toEqual(Array.from({ length: 24 }, (_, index) => index));
  });
});
