import { getAdmin } from '../server/supabaseAdmin';
import { avatarThumbnailPath, optimizeAvatarImage } from '../server/avatarImageOptimization';

const APPLY = process.argv.includes('--apply');
const PAGE_SIZE = 250;
const BUCKET = 'avatars';

async function main() {
  const admin = getAdmin();
  const avatars: { user_id: string; storage_path: string }[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await admin.from('avatars')
      .select('user_id, storage_path')
      .order('created_at', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Não consegui listar avatares: ${error.message}`);
    avatars.push(...(data ?? []));
    if ((data ?? []).length < PAGE_SIZE) break;
  }

  const filesByOwner = new Map<string, Set<string>>();
  for (const ownerId of new Set(avatars.map((avatar) => avatar.user_id))) {
    const { data, error } = await admin.storage.from(BUCKET).list(ownerId, { limit: 1000 });
    if (error) throw new Error(`Não consegui listar objetos de avatar: ${error.message}`);
    filesByOwner.set(ownerId, new Set((data ?? []).map((file) => file.name)));
  }

  const pending = avatars.filter((avatar) => {
    const thumbnailPath = avatarThumbnailPath(avatar.storage_path);
    const filename = thumbnailPath.slice(avatar.user_id.length + 1);
    return !filesByOwner.get(avatar.user_id)?.has(filename);
  });
  console.log(`Avatares encontrados: ${avatars.length}. Miniaturas faltando: ${pending.length}.`);
  if (!APPLY) {
    console.log('Simulação concluída sem baixar, enviar ou remover arquivos. Use --apply para criar as miniaturas.');
    return;
  }

  let bytesRead = 0;
  let bytesWritten = 0;
  let completed = 0;
  for (const avatar of pending) {
    const { data: source, error: downloadError } = await admin.storage.from(BUCKET).download(avatar.storage_path);
    if (downloadError || !source) throw new Error(`Download de uma imagem falhou: ${downloadError?.message ?? 'arquivo ausente'}`);
    const input = Buffer.from(await source.arrayBuffer());
    bytesRead += input.byteLength;
    const optimized = await optimizeAvatarImage(input);
    const thumbnailPath = avatarThumbnailPath(avatar.storage_path);
    const { error: uploadError } = await admin.storage.from(BUCKET).upload(thumbnailPath, optimized.thumbnail, {
      contentType: 'image/webp',
      cacheControl: '31536000',
      upsert: false,
    });
    if (uploadError) throw new Error(`Upload de uma miniatura falhou: ${uploadError.message}`);
    bytesWritten += optimized.thumbnail.byteLength;
    completed += 1;
    console.log(`Miniaturas criadas: ${completed}/${pending.length}.`);
  }
  const savedPercent = bytesRead ? Math.max(0, (1 - bytesWritten / bytesRead) * 100) : 0;
  console.log(`Concluído. Originais lidos uma vez: ${(bytesRead / 1024 / 1024).toFixed(1)} MB; miniaturas gravadas: ${(bytesWritten / 1024 / 1024).toFixed(1)} MB; redução estimada por leitura de grade: ${savedPercent.toFixed(1)}%.`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
