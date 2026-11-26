import { useState } from 'react';
import { Compass, Lock, Plus, X } from 'lucide-react';
import { UGC_TEMPLATES, type UgcTemplate } from '@shared/ugcCatalog';
import { Button } from '@/components/ui/Button';
import { AdsWizardModal } from './AdsWizardModal';

export function AdsCreator() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [pickedTemplate, setPickedTemplate] = useState<UgcTemplate | null>(null);
  const [guideOpen, setGuideOpen] = useState(true);

  return (
    <div className="premium-workspace space-y-6 px-0">
      {guideOpen ? (
        <section className="rounded-2xl border border-accent/25 bg-[linear-gradient(135deg,rgba(25,23,36,.98),rgba(16,15,24,.98))] p-4 shadow-[0_18px_50px_rgba(0,0,0,.18)] sm:p-5" aria-label="Como criar um vídeo no ADS">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-semibold"><Compass className="size-5 text-accent" />Como criar um vídeo no ADS</h2>
            <div className="flex items-center gap-6 text-xs">
              <button onClick={() => setGuideOpen(false)} className="inline-flex items-center gap-2 text-fg-muted"><X className="size-4" />Fechar guia</button>
            </div>
          </div>
          <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {[
              ['Clique em “Novo Projeto”', 'Abre a criação do vídeo, etapa por etapa. Dá para voltar em qualquer etapa antes de gerar.'],
              ['Escolha um modelo (Template)', 'Escolha um dos vídeos-modelo e a proporção (9:16 ou 16:9). Prefere que a IA crie tudo a partir do seu produto? Clique no card roxo IA Criativa.'],
              ['Envie o avatar e o produto (Imagem)', 'Envie a foto do produto, escolha um já cadastrado ou cole o link da loja para puxar as imagens. O avatar é opcional: escolha um, use o seu personagem ou envie a foto da pessoa.'],
              ['Descreva a ação e as cenas', 'Conte o que a pessoa faz com o produto e escolha quantas cenas o vídeo terá. Cada cena tem ~10s e o custo por cena aparece na tela. Alguns modelos já trazem a fala pronta e pulam etapas.'],
              ['Defina o áudio', 'Escreva o que vai ser falado, escolha voz, emoção, idioma e sotaque, e se quer som de fundo.'],
              ['Confira o Resumo e clique em Gerar', 'O botão “Gerar Vídeo” mostra o custo total antes de confirmar. O vídeo fica pronto em alguns minutos e aparece em “Projetos” (menu lateral).'],
            ].map(([title, description], index) => (
              <li key={title} className="flex min-w-0 gap-2.5 rounded-xl border border-white/[0.07] bg-black/15 px-3 py-2.5 transition-colors hover:border-accent/25 hover:bg-accent-soft/20">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-accent/90 text-[10px] font-bold text-white">{index + 1}</span>
                <div className="min-w-0"><h3 className="text-xs font-semibold leading-5">{title}</h3><p className="mt-0.5 text-[11px] leading-[1.45] text-fg-muted">{description}</p></div>
              </li>
            ))}
          </ol>
          <Button variant="brand" className="mt-3" onClick={() => { setPickedTemplate(null); setWizardOpen(true); }}><Plus className="size-4" />Começar: Novo Projeto</Button>
        </section>
      ) : <div className="flex justify-end"><Button variant="ghost" onClick={() => setGuideOpen(true)}>Ver passo a passo</Button></div>}

      {/* Cabeçalho centralizado do estúdio. */}
      <div data-guide-target="ads-start" className="mx-auto flex max-w-xl flex-col items-center space-y-2.5 py-1 text-center">
        <h2 className="text-2xl font-bold uppercase tracking-wide">CRIE VÍDEOS HIPER REALISTAS</h2>
        <p className="text-xs text-fg-muted sm:text-sm">
          Geração avançada de vídeos publicitários com IA que não parecem IA
        </p>
        <div className="inline-flex items-center gap-2 rounded-[8px] border border-amber-500/30 bg-amber-500/[0.06] px-3.5 py-1.5 text-xs text-fg-muted">
          <Lock className="size-3.5 text-amber-400" />
          <span>Escolha um modelo abaixo ou crie roteiro 100% original com a IA.</span>
        </div>
        <Button
          variant="brand"
          size="lg"
          data-testid="ads-new-project"
          onClick={() => {
            setPickedTemplate(null);
            setWizardOpen(true);
          }}
        >
          <Plus className="size-4" /> Novo Projeto
        </Button>
      </div>

      {/* Fileira de modelos verticais 9:16. */}
      <div data-guide-target="ads-templates" className="flex gap-3 overflow-x-auto pt-5 thin-scroll">
        {UGC_TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => {
              setPickedTemplate(tpl);
              setWizardOpen(true);
            }}
            className="group relative aspect-[9/16] w-[145px] shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-surface text-left shadow-[0_12px_28px_rgba(0,0,0,.16)] transition duration-200 hover:-translate-y-1 hover:border-accent/60 hover:shadow-[0_18px_38px_rgba(0,0,0,.26)]"
          >
            <img src={tpl.thumbnail} alt={tpl.title} className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-105" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2.5">
              <span className="rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white/90">
                {tpl.orientation} · {tpl.duration}s
              </span>
              <div className="mt-1 truncate text-xs font-bold text-white">{tpl.title}</div>
            </div>
          </button>
        ))}
      </div>

      <AdsWizardModal open={wizardOpen} initialTemplate={pickedTemplate} onClose={() => setWizardOpen(false)} />
    </div>
  );
}
