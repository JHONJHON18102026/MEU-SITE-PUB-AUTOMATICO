/**
 * Importa as miniaturas das opções (uso pessoal / protótipo).
 *
 * Entrada: um JSON { "grupo-opcao": ["url1", "url2", ...] }
 * Para cada chave, baixa a 1ª URL que funcionar, recorta em quadrado
 * (centralizado no topo, onde costuma estar o rosto), salva em
 * public/characters/<chave>.webp e regenera shared/attributeImages.ts.
 *
 * Uso: node scripts/import-thumbnails.mjs caminho/para/urls.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const input = process.argv[2];
if (!input) {
  console.error('Uso: node scripts/import-thumbnails.mjs urls.json');
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'characters');
fs.mkdirSync(outDir, { recursive: true });
const map = JSON.parse(fs.readFileSync(input, 'utf8'));

async function tryDownload(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.pinterest.com/' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 2000) throw new Error('arquivo muito pequeno');
  return buf;
}

const results = { ok: [], failed: [] };
const queue = Object.entries(map);
const CONCURRENCY = 6;

const CENTER_KEYS = new Set([
  'accessories-relogio',
  'characterType-orgao-animado',
  'characterType-mao-desenhando',
]);

async function worker() {
  while (queue.length) {
    const [key, urls] = queue.shift();
    let done = false;
    const position = CENTER_KEYS.has(key) ? sharp.strategy.attention : 'north';
    for (const url of urls ?? []) {
      try {
        const buf = await tryDownload(url);
        await sharp(buf)
          .resize(320, 400, { fit: 'cover', position })
          .webp({ quality: 84 })
          .toFile(path.join(outDir, `${key}.webp`));
        results.ok.push(key);
        done = true;
        break;
      } catch {
        /* tenta a próxima URL */
      }
    }
    if (!done) results.failed.push(key);
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));

// Regenera o mapa usado pelo catálogo (inclui arquivos que já existiam).
const files = fs.readdirSync(outDir).filter((f) => f.endsWith('.webp')).sort();
const lines = files.map((f) => `  '${f.replace(/\.webp$/, '')}': '/characters/${f}',`);
fs.writeFileSync(
  path.join(root, 'shared', 'attributeImages.ts'),
  `/**\n * Miniaturas das opções (gerado por scripts/import-thumbnails.mjs).\n * Chave: "<grupo>-<opção>". Para trocar uma imagem, substitua o arquivo em\n * public/characters e rode o script de novo (ou edite esta lista).\n */\nexport const ATTRIBUTE_IMAGES: Record<string, string> = {\n${lines.join('\n')}\n};\n`,
);

console.log(`\n✅ ${results.ok.length} miniaturas salvas`);
if (results.failed.length) console.log(`⚠️  ${results.failed.length} sem imagem: ${results.failed.join(', ')}`);
console.log(`📄 shared/attributeImages.ts atualizado com ${files.length} itens\n`);
