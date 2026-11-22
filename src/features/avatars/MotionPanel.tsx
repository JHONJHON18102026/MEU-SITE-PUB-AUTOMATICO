import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { toast } from 'sonner';
import { CheckCircle2, Film, RotateCcw, Upload, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CoinIcon } from '@/components/ui/Brand';
import { QuickAvatarSelect, type SelectedVisualSource } from './QuickAvatarSelect';
import { SHOWCASE_AVATARS } from './showcaseExamples';
import { useAvatarStudio } from './avatarStore';
import { VIRAL_MOTIONS } from '@shared/ugcCatalog';
import { VIDEO_ENGINES, calculateUgcCost, type VideoEngineId } from '@shared/ugcContracts';
import { useCreateUgcProject } from '@/features/projects/previewProjectsStore';

/**
 * Painel Controle de Movimento (/avatars?panel=motion):
 * une o rosto do influencer com um movimento viral já analisado (ou vídeo enviado).
 */
export function MotionPanel({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const { createProject, busy } = useCreateUgcProject();
  const baseAvatar = useAvatarStudio((s) => s.baseAvatar);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [character, setCharacter] = useState<SelectedVisualSource>({
    label: baseAvatar?.name ?? SHOWCASE_AVATARS[0]!.name,
    previewUrl: baseAvatar?.image_url ?? SHOWCASE_AVATARS[0]!.image_url,
    uploaded: null,
  });
  const [motionMode, setMotionMode] = useState<'preset' | 'upload'>('preset');
  const [presetId, setPresetId] = useState<string>(VIRAL_MOTIONS[0]!.id);
  const [customVideoName, setCustomVideoName] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [engine, setEngine] = useState<VideoEngineId>('omni-flash');
  const [resolution, setResolution] = useState<'720p' | '1080p'>('1080p');
  const [keepClothing, setKeepClothing] = useState(true);

  const preset = VIRAL_MOTIONS.find((m) => m.id === presetId) ?? VIRAL_MOTIONS[0]!;
  const cost = calculateUgcCost({ engine, sceneCount: 1 });
  const motionEngines = [VIDEO_ENGINES.find((e) => e.id === 'omni-flash')!, VIDEO_ENGINES.find((e) => e.id === 'veo-3.1-fast')!];

  function resetFields() {
    setPresetId(VIRAL_MOTIONS[0]!.id);
    setMotionMode('preset');
    setCustomVideoName('');
    setCustomPrompt('');
    setResolution('1080p');
    setKeepClothing(true);
    toast.success('Campos do Motion Control restaurados.');
  }

  async function submit() {
    if (motionMode === 'upload' && !customVideoName && !customPrompt.trim()) {
      toast.error('Envie um vídeo de referência ou descreva o movimento.');
      return;
    }
    const motionDescription =
      motionMode === 'preset' ? preset.promptDescription : customPrompt.trim() || `Copy natural movement from ${customVideoName}`;
    const proj = await createProject({
      mode: 'motion',
      origin: 'avatar',
      mediaType: 'video',
      title: `Motion · ${character.label}`,
      engine,
      aspectRatio: '9:16',
      avatarUrl: character.previewUrl,
      avatarImageData: character.uploaded?.data,
      motionPresetId: motionMode === 'preset' ? preset.id : undefined,
      motionPrompt: motionDescription,
      resolution,
      keepClothing,
      scenes: [
        {
          text: motionMode === 'preset' ? `Movimento: ${preset.title}` : customVideoName || 'Movimento personalizado',
          action: motionDescription,
          durationSeconds: preset.durationSec,
        },
      ],
    });
    if (proj) navigate('/avatars?media=videos');
  }

  return (
    <>
      <div className="max-h-[56vh] space-y-4 overflow-y-auto px-5 py-4 thin-scroll lg:max-h-none lg:flex-1">
        <div className="rounded-2xl border border-accent/40 bg-accent-soft/60 p-3 text-xs">
          <div className="font-bold text-fg flex items-center gap-1.5">
            <Wand2 className="size-3.5 text-accent" /> Motion Control · Movimentos Virais
          </div>
          <p className="mt-1 text-fg-muted">
            Transfira gestos, expressões e movimento de câmera para o seu avatar sem cobrar leitura nos movimentos já analisados.
          </p>
        </div>

        <section data-guide-target="motion-character-box" className="space-y-2">
          <div className="text-xs font-bold text-fg-muted">1. PERSONAGEM (ROSTO FIXO)</div>
          <QuickAvatarSelect value={character} onChange={setCharacter} compact />
        </section>

        <section data-guide-target="motion-preset-box" className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-fg-muted">2. VÍDEO DE MOVIMENTO</span>
            <div className="flex rounded-lg bg-surface-2 p-0.5 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setMotionMode('preset')}
                className={clsx('rounded px-2 py-0.5', motionMode === 'preset' ? 'bg-surface text-fg shadow' : 'text-fg-muted')}
              >
                Biblioteca
              </button>
              <button
                type="button"
                onClick={() => setMotionMode('upload')}
                className={clsx('rounded px-2 py-0.5', motionMode === 'upload' ? 'bg-surface text-fg shadow' : 'text-fg-muted')}
              >
                Enviar vídeo
              </button>
            </div>
          </div>

          {motionMode === 'preset' ? (
            <div className="space-y-1.5">
              {VIRAL_MOTIONS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPresetId(m.id)}
                  className={clsx(
                    'flex w-full items-center gap-2.5 rounded-xl border p-2 text-left transition-all',
                    presetId === m.id ? 'border-accent bg-accent-soft' : 'border-border bg-surface-2 hover:border-fg-subtle',
                  )}
                >
                  <img src={m.thumbnail} alt="" className="size-10 shrink-0 rounded-lg object-cover object-top" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-bold">{m.title}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-fg-muted">
                      <span>{m.category}</span> · <span>{m.durationSec}s</span> ·{' '}
                      <span className="inline-flex items-center gap-0.5 text-success font-semibold">
                        <CheckCircle2 className="size-2.5" /> Já analisado
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface-2 py-4 text-xs font-semibold hover:border-accent/60"
              >
                <Upload className="size-4 text-accent" />
                {customVideoName ? customVideoName : 'Escolher vídeo de movimento (3–60s MP4/MOV)'}
              </button>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setCustomVideoName(f.name);
                }}
              />
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={2}
                placeholder="Descreva o movimento principal (opcional)..."
                className="w-full rounded-xl border border-border bg-surface-2 p-2.5 text-xs outline-none focus:border-accent"
              />
            </div>
          )}
        </section>

        <section className="space-y-2.5">
          <div className="text-xs font-bold text-fg-muted">3. MOTOR, QUALIDADE & ROUPA</div>
          <div className="grid grid-cols-2 gap-1.5">
            {motionEngines.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setEngine(e.id)}
                aria-label={e.label}
                aria-pressed={engine === e.id}
                title={e.description}
                className={clsx(
                  'rounded-xl border p-2 text-left text-[11px]',
                  engine === e.id ? 'border-accent bg-accent-soft font-bold' : 'border-border bg-surface-2 text-fg-muted',
                )}
              >
                <div className="truncate">{e.label}</div>
                <div className="text-[10px] opacity-80">{e.creditsPerScene} créditos</div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setResolution(resolution === '1080p' ? '720p' : '1080p')}
              className="rounded-xl border border-border bg-surface-2 py-2 text-center hover:border-accent/50"
            >
              Qualidade: <strong>{resolution}</strong>
            </button>
            <button
              type="button"
              onClick={() => setKeepClothing((v) => !v)}
              className="rounded-xl border border-border bg-surface-2 py-2 text-center hover:border-accent/50"
            >
              {keepClothing ? 'Roupa da foto' : 'Roupa do movimento'}
            </button>
          </div>
        </section>
      </div>

      <div className="shrink-0 space-y-2 border-t border-border/70 bg-surface/95 px-3 pb-3 pt-2.5 backdrop-blur">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={resetFields}
            title="Resetar campos"
            aria-label="Resetar campos"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-2 text-fg-muted hover:text-fg"
          >
            <RotateCcw className="size-4" />
          </button>
          <Button variant="brand" className="h-11 flex-1 whitespace-nowrap text-[12px]" onClick={() => void submit()} loading={busy} data-testid="motion-create-btn">
            <Film className="size-4 shrink-0" /> Animar influencer
            <span className="inline-flex items-center gap-1 rounded-md bg-black/25 px-1.5 py-0.5 text-[11px]">
              <CoinIcon className="size-3.5" /> {cost}
            </span>
          </Button>
        </div>
        <button type="button" onClick={onBack} className="w-full text-center text-[11px] text-fg-subtle hover:text-fg">
          Voltar para Criar Influencer
        </button>
      </div>
    </>
  );
}
