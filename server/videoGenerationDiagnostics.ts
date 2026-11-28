import type { CreateUgcVideoRequest } from '../shared/ugcContracts';

type AvatarReferenceContext = {
  hasAvatarReference: boolean;
  hasProductReference: boolean;
  hasExplicitStartFrame: boolean;
  elementNames?: string[];
};

/** Keep the semantic role of each upload explicit before it reaches Flow. */
export function buildAvatarReferenceGuidance(input: AvatarReferenceContext): string {
  const names = input.elementNames ?? [];
  const hasNamedAvatar = names.some((name) => /personagem|influenciador|influencer|avatar|pessoa/i.test(name));
  const hasNamedProduct = names.some((name) => /produto|product/i.test(name));
  const lines = [
    input.hasAvatarReference || hasNamedAvatar
      ? 'A referência no slot INFLUENCIADOR define somente a identidade visual da pessoa. Preserve rosto, cabelo e aparência dessa pessoa.'
      : '',
    input.hasProductReference || hasNamedProduct
      ? 'A referência no slot PRODUTO define somente o produto. Preserve embalagem, formato, cores e detalhes visíveis; não a trate como identidade de pessoa nem invente características.'
      : '',
    input.hasExplicitStartFrame
      ? 'Respeite o frame inicial enviado como composição de abertura e continue a cena com movimento natural.'
      : '',
    !input.hasAvatarReference && !hasNamedAvatar
      ? 'Não acrescente rosto, apresentador ou influenciador quando o briefing pedir apenas mãos ou perspectiva POV.'
      : '',
    'Siga o enquadramento e a ação descritos no briefing. Gere uma única cena contínua, sem colagem, tela dividida ou quadro de referências.',
  ].filter(Boolean);
  return lines.join(' ');
}

type VideoEngine = CreateUgcVideoRequest['engine'] | 'veo-3.1-lowerpriority';

/** Convert provider failures into a short, actionable status while retaining its error code. */
export function explainVideoGenerationFailure(raw: string, engine: VideoEngine, accountId?: string | null): string {
  const model = engine === 'omni-flash'
    ? 'Omni Flash 1.2'
    : engine === 'veo-3.1-lowerpriority' ? 'Veo 3.1 Lower Priority' : 'Veo 3.1';
  const codes = [...new Set(raw.match(/PUBLIC_ERROR_[A-Z0-9_]+|IP_PROHIBITED|RESOURCE_EXHAUSTED|UNAUTHENTICATED|PERMISSION_DENIED|NOT_FOUND|DEADLINE_EXCEEDED/g) ?? [])];
  const code = codes.join(' / ');

  if (/MOTOR_CONNECTION_FAILED/i.test(raw)) {
    return `A API não conseguiu se comunicar com o motor Rust de vídeo para ${model}. Verifique a conexão entre a API e o motor; nenhuma falha de sessão do Google Flow foi confirmada.`;
  }
  if (/VIDEO_DOWNLOAD_FAILED/i.test(raw)) {
    return `O provedor concluiu ${model}, mas a API falhou ao baixar o arquivo final. Verifique a conectividade de saída da API antes de recriar o vídeo.`;
  }
  if (/FLOW_CONNECTION_FAILED|\bfetch failed\b|networkerror|connection reset|timed? ?out/i.test(raw)) {
    const account = accountId || raw.match(/FLOW_CONNECTION_FAILED\s*\[([^\]]+)\]/i)?.[1];
    return `O motor Rust recebeu o pedido de ${model}, mas a conexão com o Google Flow falhou${account ? ` na ${account}` : ''}. O health geral da API não valida a sessão dessa conta. Confira bearer e saúde da conta Flow antes de tentar novamente${code ? ` (${code})` : ''}.`;
  }
  if (/IP_PROHIBITED|PUBLIC_ERROR_IP_INPUT_IMAGE/i.test(raw)) {
    return `O Google Flow recusou a imagem de referência por restrição de propriedade intelectual${code ? ` (${code})` : ''}. Nenhum vídeo foi concluído. Use uma imagem própria/autorizada sem marca ou personagem protegido e tente novamente.`;
  }
  if (/RESOURCE_EXHAUSTED|quota|cota|429/i.test(raw)) {
    return `A conta oficial do Flow atingiu a cota para ${model}${code ? ` (${code})` : ''}. Aguarde a renovação ou use outra conta validada.`;
  }
  if (/UNAUTHENTICATED|bearer|401/i.test(raw)) {
    return `A sessão oficial do Flow não está autenticada para ${model}${code ? ` (${code})` : ''}. Revalide o login da conta vinculada.`;
  }
  if (/flow\.google\.com\/404|PROJECT_NOT_FOUND|project.*not found/i.test(raw)) {
    return `O projeto do Google Flow vinculado a ${model} não foi encontrado${code ? ` (${code})` : ''}. Confira a conta e o projeto selecionados.`;
  }
  return `Falha ao gerar com ${model}${code ? ` (${code})` : ''}. ${raw.replace(/^.*?(?:falhou|failed):\s*/is, '').slice(0, 700)}`;
}
