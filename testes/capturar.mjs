// Capturas para o dream-loop: cada vista do site (modo ?limpo, sem interface) no mesmo tamanho do render Cycles
// que é o alvo, e a imagem lado a lado (alvo | ao vivo) feita pelo Python (PIL).
// Uso: npm run build && node testes/capturar.mjs <rodada> [<flats-3d worktrees>]
import { chromium } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const RAIZ = resolve(import.meta.dirname, '..');
const RODADA = process.argv[2] || 'r1';
const FONTE = process.argv[3] || process.env.FLATS3D_WORKTREES;   // pasta com as worktrees flat-04 e casa-chales-web do flats-3d
const PASTA = join(RAIZ, '.dream-loop', 'rounds', RODADA);
const PORTA = 4175;
const EXTRA = process.env.EXTRA ? '&' + process.env.EXTRA : '';
const SO = process.env.SO ? process.env.SO.split(',') : null;
mkdirSync(PASTA, { recursive: true });

// vista do site -> render Cycles do flats-3d (o alvo); o tamanho da janela é o do render
export const VISTAS = [
  { pagina: 'casa.html', parada: 'fachada', alvo: 'casa-chales-web/saida/casa-chales/casa-chales-fachada.png', w: 1600, h: 1000 },
  { pagina: 'casa.html', parada: 'salao', alvo: 'casa-chales-web/saida/casa-chales/casa-chales-sala.png', w: 1600, h: 1000 },
  { pagina: 'casa.html', parada: 'cozinha', alvo: 'casa-chales-web/saida/casa-chales/casa-chales-cozinha.png', w: 1600, h: 1000 },
  { pagina: 'casa.html', parada: 'piscina', alvo: 'casa-chales-web/saida/casa-chales/casa-chales-piscina.png', w: 1600, h: 1000 },
  { pagina: 'casa.html', parada: 'suite', alvo: 'casa-chales-web/saida/casa-chales/casa-chales-quarto.png', w: 1600, h: 1000 },
  { pagina: 'casa.html', parada: 'gourmet', alvo: 'casa-chales-web/saida/casa-chales/casa-chales-gourmet.png', w: 1600, h: 1000 },
  { pagina: 'flats.html', parada: 'sala', alvo: 'flat-04/saida/flat-04/flat-04-cozinha_para_tv.png', w: 1200, h: 900 },
  { pagina: 'flats.html', parada: 'cozinha', alvo: 'flat-04/saida/flat-04/flat-04-cozinha.png', w: 1200, h: 900 },
  { pagina: 'flats.html', parada: 'tv', alvo: 'flat-04/saida/flat-04/flat-04-tv.png', w: 1200, h: 900 },
  { pagina: 'flats.html', parada: 'banheiro', alvo: 'flat-04/saida/flat-04/flat-04-banheiro.png', w: 1200, h: 900 },
];

const srv = spawn(process.execPath, [join(RAIZ, 'node_modules/vite/bin/vite.js'), 'preview', '--port', String(PORTA), '--strictPort'], { cwd: RAIZ, stdio: 'pipe' });
await new Promise((ok, falha) => {
  const t = setTimeout(() => falha(new Error('o vite preview não subiu')), 20000);
  srv.stdout.on('data', d => { if (String(d).includes(String(PORTA))) { clearTimeout(t); ok(); } });
});
const nav = await chromium.launch({ channel: 'msedge', args: ['--ignore-gpu-blocklist', '--use-angle=d3d11'] });
const feitas = [];
try {
  for (const v of VISTAS) {
    if (SO && !SO.includes(`${v.pagina.replace('.html', '')}-${v.parada}`)) continue;
    const ctx = await nav.newContext({ viewport: { width: v.w, height: v.h } });
    const pg = await ctx.newPage();
    await pg.goto(`http://127.0.0.1:${PORTA}/${v.pagina}?limpo${EXTRA}#${v.parada}`);
    await pg.waitForFunction(() => window.__site?.pronto && !window.__site.voando, null, { timeout: 60000 });
    await pg.waitForTimeout(1200);   // forro de volta e texturas na GPU
    await pg.waitForFunction(() => ['pronta', 'sem', 'falhou'].includes(window.__site.vegetacao), null, { timeout: 60000 }); await pg.waitForTimeout(600);
    const nome = `${v.pagina.replace('.html', '')}-${v.parada}`;
    const vivo = join(PASTA, `${nome}-live.png`);
    await pg.screenshot({ path: vivo });
    const fps = await pg.evaluate(() => window.__site.fps(2000));
    await ctx.close();
    const alvo = join(FONTE, v.alvo), sxs = join(PASTA, `${nome}-sxs.jpg`);
    spawnSync('py', ['-3', '-X', 'utf8', '-c', `
from PIL import Image, ImageDraw
a = Image.open(r"${alvo}").convert("RGB"); b = Image.open(r"${vivo}").convert("RGB").resize(a.size)
m = Image.new("RGB", (a.width * 2 + 12, a.height), (20, 20, 20)); m.paste(a, (0, 0)); m.paste(b, (a.width + 12, 0))
d = ImageDraw.Draw(m); d.text((14, 10), "ALVO (Cycles)", fill=(255, 220, 120)); d.text((a.width + 26, 10), "AO VIVO (site)", fill=(255, 220, 120))
m.save(r"${sxs}", quality=86)`], { stdio: 'inherit' });
    feitas.push({ nome, alvo, vivo, sxs, fps });
    console.log(nome, 'fps', fps);
  }
} finally {
  await nav.close();
  srv.kill();
  writeFileSync(join(PASTA, 'capturas.json'), JSON.stringify(feitas, null, 1));
}
