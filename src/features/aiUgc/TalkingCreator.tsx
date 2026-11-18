import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { toast } from 'sonner';
import { ImagePlus, Mic, Sparkles, Upload, Video, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CoinIcon } from '@/components/ui/Brand';
import { StepGuideBanner } from '@/components/ui/StepGuideBanner';
import { ImagePicker } from '@/features/avatars/ImagePicker';
import { SHOWCASE_AVATARS } from '@/features/avatars/showcaseExamples';
import { useMyAvatars } from '@/features/avatars/useAvatarData';
import { TALKING_EMOTIONS } from '@shared/ugcCatalog';
import {
  MAX_SCRIPT_CHARS,
  VIDEO_ENGINES,
  VOICE_OPTIONS,
  calculateUgcCost,
  splitSpeechIntoScenes,
  type VideoEngineId,
  type VoiceOptionId,
} from '@shared/ugcContracts';
import { useCreateUgcProject } from '@/features/projects/previewProjectsStore';
import { buildLocalScripts } from './ugcCartridges';
import { api } from '@/lib/api';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { PreparedImage } from '@/lib/image';

export function TalkingCreator() {
  const navigate = useNavigate();
  const myAvatars = useMyAvatars();
  const { createProject, busy } = useCreateUgcProject();

  const [language, setLanguage] = useState('Português (Brasil)');
  const [avatarSource, setAvatarSource] = useState<'realista' | 'mine' | 'upload'>('realista');
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string>(SHOWCASE_AVATARS[0]!.image_url);
  const [selectedAvatarName, setSelectedAvatarName] = useState<string>(SHOWCASE_AVATARS[0]!.name);
  const [uploadedAvatar, setUploadedAvatar] = useState<PreparedImage | null>(null);
  const [emotion, setEmotion] = useState<string>(TALKING_EMOTIONS[0].id);
  const [sceneCustomPrompt, setSceneCustomPrompt] = useState('');
  const [keepExactFraming, setKeepExactFraming] = useState(false);

  const [script, setScript] = useState('');
  const [generatingScript, setGeneratingScript] = useState(false);
  const [voiceType, setVoiceType] = useState<VoiceOptionId>('default');
  const [brollFiles, setBrollFiles] = useState<string[]>([]);
  const [engine, setEngine] = useState<VideoEngineId>('veo-3.1-fast');
  const [captions, setCaptions] = useState(true);

  const scenes = splitSpeechIntoScenes(script, 8);
  const sceneCount = Math.max(1, scenes.length);
  const videosCount = Math.max(1, brollFiles.length);
  const costPerVideo = calculateUgcCost({ engine, sceneCount, voiceType });
  const totalCost = videosCount * costPerVideo;

  const activePreview = uploadedAvatar?.previewUrl || selectedAvatarUrl;
  const missing: string[] = [];
  if (!activePreview) missing.push('escolha o avatar');
  if (!script.trim()) missing.push('escreva o roteiro');

  async function handleAutoScript() {
    setGeneratingScript(true);
    try {
      const generated = isSupabaseConfigured
        ? (
            await api.generateUgcScripts({
              mode: 'talking',
              productName: sceneCustomPrompt.trim() || 'produto em destaque',
              language,
              sceneCount: 2,
            })
          ).options[0]?.script
        : buildLocalScripts(sceneCustomPrompt.trim() || 'esse produto', 'natural e direto', 2)[0]?.script;
      if (generated) {
        setScript(generated);
        toast.success('Roteiro dividido automaticamente em cenas de ~8 segundos.');
      }
    } catch {
      const fallback = buildLocalScripts('esse produto', 'natural', 2)[0]!.script;
      setScript(fallback);
    } finally {
      setGeneratingScript(false);
    }
  }

  async function submit() {
    if (missing.length) {
      toast.error(`Falta: ${missing.join(' · ')}`);
      return;
    }
    const proj = await createProject({
      mode: 'talking',
      title: `Personagem Falante · ${selectedAvatarName}`,
      engine,
      aspectRatio: '9:16',
      language,
      emotion,
      voiceType,
      captions,
      brollCount: brollFiles.length,
      avatarUrl: activePreview,
      avatarImageData: uploadedAvatar?.data,
      scenes: scenes.map((s) => ({
        text: s.text,
        action: sceneCustomPrompt || `Expressão ${emotion}, falando olhando para a câmera.`,
        durationSeconds: s.estimatedSeconds,
      })),
    });
    if (proj) navigate('/projects');
  }

  const avatarList = avatarSource === 'mine' ? myAvatars.data : SHOWCASE_AVATARS;
  const activeEmotionLabel = TALKING_EMOTIONS.find((e) => e.id === emotion)?.label ?? emotion;

  return (
    <div className="premium-workspace space-y-4">
      <StepGuideBanner guideKey="talking" />

      <div className="mx-auto min-h-[104px] max-w-3xl text-center">
        <div className="inline-flex items-center gap-2">
          <Sparkles className="size-8 text-accent" />
          <h2 className="text-xl font-bold uppercase tracking-wide sm:text-2xl">CRIE ANÚNCIO DE PERSONAGEM FALANTE</h2>
          <span className="rounded-md bg-brand px-2 py-0.5 text-[10px] font-bold uppercase text-white">Novo</span>
        </div>
        <p className="mt-1 text-xs text-fg-muted sm:text-sm">
          Seu personagem fala o roteiro no idioma escolhido, cena por cena — com ou sem B-roll atrás dele.
        </p>
      </div>

      <div className="grid gap-8 sm:grid-cols-[minmax(0,1fr)_450px]">
        {/* Coluna esquerda: blocos de criação */}
        <div className="space-y-4">
          {/* 1. Idioma */}
          <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
            <div className="flex items-center gap-2.5 text-sm font-semibold">
              <span className="grid size-6 place-items-center rounded-full bg-brand text-xs font-bold text-white">1</span>
              Idioma
            </div>
            <p className="mt-1 text-xs text-fg-muted">O personagem fala neste idioma. Escreva o roteiro já nele.</p>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              aria-label="Idioma da fala"
              className="mt-3 w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm font-medium outline-none"
            >
              <option>Português (Brasil)</option>
              <option>English (US)</option>
              <option>Español</option>
            </select>
          </section>

          {/* 2. Escolher Avatar + 14 Emoções */}
          <section data-guide-target="talking-avatar" className="space-y-4 rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2 text-sm font-black">
              <span className="grid size-6 place-items-center rounded-full bg-brand text-xs text-white">2</span>
              ESCOLHER AVATAR
            </div>

            <div className="grid grid-cols-3 rounded-xl bg-surface-2 p-1 text-xs font-semibold" role="tablist">
              {([['realista', 'Realista'], ['mine', 'Meus avatares'], ['upload', 'Upload']] as const).map(([k, lbl]) => (
                <button
                  key={k}
                  role="tab"
                  aria-selected={avatarSource === k}
                  onClick={() => setAvatarSource(k)}
                  className={clsx('rounded-lg py-2', avatarSource === k ? 'bg-surface shadow text-fg' : 'text-fg-muted')}
                >
                  {lbl}
                </button>
              ))}
            </div>

            {avatarSource === 'upload' ? (
              <ImagePicker
                label="Enviar foto do personagem"
                onPicked={(img) => {
                  setUploadedAvatar(img);
                  setSelectedAvatarName(img.name);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface-2 p-6 text-sm font-semibold hover:border-accent"
              >
                <Upload className="size-5 text-accent" />
                {uploadedAvatar ? `Foto carregada: ${uploadedAvatar.name}` : 'Envie uma foto nítida, de frente, do peito para cima'}
              </ImagePicker>
            ) : avatarList.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border py-6 text-center text-xs text-fg-muted">
                Você ainda não criou nenhum avatar. Use a aba "Realista" ou gere em Influencer IA.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
                {avatarList.slice(0, 5).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      setUploadedAvatar(null);
                      setSelectedAvatarUrl(a.image_url);
                      setSelectedAvatarName(a.name);
                    }}
                    className={clsx(
                      'overflow-hidden rounded-xl border text-left transition',
                      !uploadedAvatar && selectedAvatarUrl === a.image_url ? 'border-accent ring-brand' : 'border-border hover:border-accent/50',
                    )}
                  >
                    <img src={a.image_url} alt={a.name} className="aspect-[3/4] w-full object-cover object-top" />
                    <div className="truncate bg-surface-2 px-2 py-1 text-[11px] font-semibold">{a.name.split('·')[0]}</div>
                  </button>
                ))}
              </div>
            )}

            {/* 14 Emoções */}
            <div>
              <div className="mb-2 flex items-center justify-between text-xs font-bold">
                <span>Escolha a emoção</span>
                <span className="text-fg-subtle">14 opções</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 thin-scroll">
                {TALKING_EMOTIONS.map((em) => (
                  <button
                    key={em.id}
                    type="button"
                    onClick={() => setEmotion(em.id)}
                    className={clsx(
                      'w-20 shrink-0 overflow-hidden rounded-xl border text-center transition',
                      emotion === em.id ? 'border-accent ring-brand' : 'border-border bg-surface-2',
                    )}
                  >
                    <img src={em.preview} alt={em.label} className="aspect-[3/4] w-full object-cover object-top" />
                    <div className="truncate py-1 text-[10px] font-semibold">{em.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 border-t border-border pt-3">
              <label className="block text-xs font-bold">
                Mudar o cenário ou gerar um personagem novo (opcional)
                <input
                  value={sceneCustomPrompt}
                  onChange={(e) => setSceneCustomPrompt(e.target.value)}
                  placeholder="Ex.: mulher de jaleco branco numa farmácia, luz natural, segurando frasco âmbar"
                  className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs font-normal outline-none focus:border-accent"
                />
              </label>
              <label className="flex items-center justify-between rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs">
                <span>Usar esta foto exatamente como está (enquadramento pronto do peito para cima)</span>
                <input type="checkbox" checked={keepExactFraming} onChange={(e) => setKeepExactFraming(e.target.checked)} className="size-4 accent-[var(--accent)]" />
              </label>
            </div>
          </section>

          <section data-guide-target="talking-broll" className="rounded-2xl border border-border bg-surface p-5">
            <div>
              <div className="text-sm font-black">3. ADICIONAR B-ROLL (opcional)</div>
              <p className="mt-1 text-xs text-fg-muted">Cada vídeo de fundo enviado gera um vídeo final separado com o personagem na frente.</p>
              <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border bg-surface-2 px-3 py-2 text-xs font-semibold hover:border-accent">
                <ImagePlus className="size-4 text-accent" /> Adicionar B-roll ({brollFiles.length})
                <input
                  type="file"
                  accept="video/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const names = [...(e.target.files ?? [])].map((f) => f.name);
                    if (names.length) setBrollFiles((curr) => [...curr, ...names].slice(0, 4));
                  }}
                />
              </label>
            </div>
          </section>

          {/* 4. O que ele vai falar? */}
          <section data-guide-target="talking-script" className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-black">
                <span className="grid size-6 place-items-center rounded-full bg-brand text-xs text-white">4</span>
                O QUE ELE VAI FALAR?
              </div>
              <Button variant="secondary" size="sm" loading={generatingScript} onClick={() => void handleAutoScript()} data-testid="talking-generate-script">
                <Wand2 className="size-3.5 text-accent" /> Gerar roteiro
              </Button>
            </div>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              maxLength={MAX_SCRIPT_CHARS}
              rows={4}
              aria-label="Roteiro da fala"
              placeholder="Gente, eu precisava mostrar esse produto pra vocês. Uso há duas semanas e mudou minha rotina."
              className="mt-3 w-full rounded-xl border border-border bg-surface-2 p-3 text-sm outline-none focus:border-accent"
            />
            <div className="mt-1.5 flex items-center justify-between text-xs text-fg-subtle">
              <span data-testid="talking-scenes-counter">
                {scenes.length ? `${scenes.length} cena(s) · ~${scenes.reduce((s, x) => s + x.estimatedSeconds, 0)}s de vídeo` : 'Cada ~8s de fala vira uma cena, cortada em fim de frase.'}
              </span>
              <span>{script.length}/{MAX_SCRIPT_CHARS}</span>
            </div>
          </section>

          {/* 4. Escolher Voz */}
          <section className="space-y-2 rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2 text-sm font-black">
              <Mic className="size-5 text-accent" />
              ESCOLHER VOZ
            </div>
            {VOICE_OPTIONS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVoiceType(v.id)}
                className={clsx(
                  'flex w-full items-start justify-between gap-3 rounded-xl border p-3 text-left transition',
                  voiceType === v.id ? 'border-accent bg-accent-soft' : 'border-border bg-surface-2 hover:border-accent/40',
                )}
              >
                <span className="flex items-start gap-2.5">
                  <Mic className="mt-0.5 size-4 shrink-0 text-accent" />
                  <span>
                    <strong className="block text-xs">{v.label}</strong>
                    <span className="text-[11px] text-fg-muted">{v.desc}</span>
                  </span>
                </span>
                <span className="shrink-0 text-xs font-bold text-accent">
                  {v.extraPerScene ? `+${v.extraPerScene}/cena` : 'Grátis'}
                </span>
              </button>
            ))}
          </section>

          {/* 5 & 6. B-roll e Motor + Legenda */}
          <section className="rounded-2xl border border-border bg-surface p-5">
            <div className="space-y-3">
              <div className="text-sm font-black">5. Motor e legenda</div>
              <select
                value={engine}
                onChange={(e) => setEngine(e.target.value as VideoEngineId)}
                aria-label="Motor de vídeo"
                className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs font-semibold"
              >
                {VIDEO_ENGINES.map((e) => <option key={e.id} value={e.id}>{e.label} · {e.creditsPerScene}/cena</option>)}
              </select>
              <label className="flex items-center justify-between rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs font-semibold">
                Incluir legenda na fala
                <input type="checkbox" checked={captions} onChange={(e) => setCaptions(e.target.checked)} className="size-4 accent-[var(--accent)]" />
              </label>
            </div>
          </section>
        </div>

        {/* Painel direito 50%: Preview confortável e espaçado como no Influai */}
        <aside data-guide-target="talking-submit" className="h-fit space-y-4 rounded-2xl border border-white/10 bg-surface p-6 shadow-[0_16px_40px_rgba(0,0,0,.16)] lg:sticky lg:top-20">
          <div className="text-sm font-semibold text-fg-muted">Prévia</div>
          <div className="relative mx-auto max-w-[300px] overflow-hidden rounded-2xl border border-border bg-surface-2">
            {activePreview ? (
              <img src={activePreview} alt={selectedAvatarName} className="aspect-[9/14] w-full object-cover object-top" />
            ) : (
              <div className="grid aspect-[9/14] place-items-center text-xs text-fg-subtle">Escolha o avatar ao lado</div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-3">
              <div className="text-xs font-bold text-white">{selectedAvatarName}</div>
              <div className="text-[11px] text-white/80">Emoção: {activeEmotionLabel} · {language}</div>
            </div>
          </div>

          <div className="space-y-1.5 rounded-xl bg-surface-2 p-3 text-xs">
            <div className="flex justify-between"><span className="text-fg-muted">Vídeos</span><strong>{videosCount}</strong></div>
            <div className="flex justify-between"><span className="text-fg-muted">Cenas por vídeo</span><strong>{sceneCount}</strong></div>
            <div className="flex justify-between border-t border-border pt-1.5">
              <span className="font-bold">Custo agora</span>
              <span className="inline-flex items-center gap-1 font-black text-accent"><CoinIcon className="size-3.5" /> {totalCost}</span>
            </div>
          </div>

          <Button
            variant="brand"
            className="w-full"
            size="lg"
            loading={busy}
            disabled={missing.length > 0}
            onClick={() => void submit()}
            data-testid="talking-create-btn"
          >
            <Video className="size-4" /> Criar vídeo
          </Button>
          {missing.length > 0 && (
            <p className="text-center text-[11px] text-fg-subtle">
              Falta: {missing.join(' · ')}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
