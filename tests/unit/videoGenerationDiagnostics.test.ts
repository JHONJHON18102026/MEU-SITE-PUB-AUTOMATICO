import { describe, expect, it } from 'vitest';
import { buildAvatarReferenceGuidance, explainVideoGenerationFailure } from '../../server/videoGenerationDiagnostics';

describe('papéis das referências no vídeo Avatar', () => {
  it('não transforma uma referência de produto em identidade de pessoa', () => {
    const prompt = buildAvatarReferenceGuidance({
      hasAvatarReference: false,
      hasProductReference: true,
      hasExplicitStartFrame: false,
      elementNames: ['Produto · serum.png'],
    });
    expect(prompt).toContain('slot PRODUTO');
    expect(prompt).not.toContain('slot INFLUENCIADOR define');
    expect(prompt).toContain('Não acrescente rosto');
  });

  it('mantém separados os papéis de pessoa, produto e frame inicial', () => {
    const prompt = buildAvatarReferenceGuidance({
      hasAvatarReference: true,
      hasProductReference: true,
      hasExplicitStartFrame: true,
      elementNames: ['Produto · serum.png'],
    });
    expect(prompt).toContain('slot INFLUENCIADOR');
    expect(prompt).toContain('slot PRODUTO');
    expect(prompt).toContain('frame inicial');
  });
});

describe('diagnóstico das falhas do provedor de vídeo', () => {
  it('explica a recusa de imagem sem rotular Omni como Veo', () => {
    const message = explainVideoGenerationFailure(
      'geracao Veo 3.1 falhou: {"mediaStatus":{"error":{"message":"PUBLIC_ERROR_IP_INPUT_IMAGE"},"failureReasons":["IP_PROHIBITED"]}}',
      'omni-flash',
    );
    expect(message).toContain('Google Flow recusou a imagem');
    expect(message).toContain('IP_PROHIBITED');
    expect(message).not.toContain('Veo 3.1 falhou');
  });

  it('identifica cota e autenticação da conta Flow', () => {
    expect(explainVideoGenerationFailure('RESOURCE_EXHAUSTED: quota exceeded', 'omni-flash')).toContain('atingiu a cota');
    expect(explainVideoGenerationFailure('UNAUTHENTICATED: missing bearer', 'veo-3.1-fast')).toContain('não está autenticada');
  });

  it('distingue indisponibilidade da API→motor de falha do motor→Flow', () => {
    expect(explainVideoGenerationFailure('MOTOR_CONNECTION_FAILED: fetch failed', 'veo-3.1-lowerpriority'))
      .toContain('nenhuma falha de sessão do Google Flow foi confirmada');
    expect(explainVideoGenerationFailure('FLOW_CONNECTION_FAILED [conta_2]: fetch failed', 'veo-3.1-lowerpriority', 'conta_2'))
      .toContain('na conta_2');
    expect(explainVideoGenerationFailure('VIDEO_DOWNLOAD_FAILED: fetch failed', 'omni-flash'))
      .toContain('concluiu Omni Flash 1.2');
  });

  it('exibe o modelo efetivo lower priority em vez do modelo selecionado na interface', () => {
    expect(explainVideoGenerationFailure('FLOW_CONNECTION_FAILED [conta_2]: fetch failed', 'veo-3.1-lowerpriority'))
      .toContain('Veo 3.1 Lower Priority');
  });
});
