// Grava o tour automático cinematográfico (cortes suaves + tomada de cinema em cada parada) para comparar com o
// passeio antigo (docs/midia/passeio-*.mp4). Uso: npm run build && node testes/gravar-cinema.mjs [segundos]
import { chromium } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
const RAIZ = resolve(import.meta.dirname, '..'), BRUTO = join(RAIZ, 'testes', 'saida', 'video'), MIDIA = join(RAIZ, 'docs', 'midia');
const SEG = Number(process.argv[2] || 50), PORTA = 4185;
mkdirSync(BRUTO, { recursive: true }); mkdirSync(MIDIA, { recursive: true });
const srv = spawn(process.execPath, [join(RAIZ, 'node_modules/vite/bin/vite.js'), 'preview', '--port', String(PORTA), '--strictPort'], { cwd: RAIZ, stdio: 'pipe' });
await new Promise(ok => srv.stdout.on('data', d => String(d).includes(String(PORTA)) && ok()));
const nav = await chromium.launch({ channel: 'msedge', args: ['--ignore-gpu-blocklist', '--use-angle=d3d11'] });
try {
  for (const [pagina, nome] of [['casa.html', 'cinema-casa'], ['flats.html', 'cinema-flat']]) {
    const ctx = await nav.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: BRUTO, size: { width: 1280, height: 720 } } });
    const pg = await ctx.newPage();
    await pg.goto(`http://127.0.0.1:${PORTA}/${pagina}`);
    await pg.waitForFunction(() => window.__site?.pronto && !document.querySelector('#b-comecar').hidden, null, { timeout: 60000 });
    await pg.click('#b-comecar');
    await pg.waitForFunction(() => window.__site.emTomada, null, { timeout: 30000 });
    await pg.waitForTimeout(6000);
    await pg.click('#b-auto');
    await pg.waitForTimeout(SEG * 1000);
    const v = pg.video(); await ctx.close();
    const webm = await v.path(), mp4 = join(MIDIA, nome + '.mp4');
    spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '1', '-i', webm, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '28', '-preset', 'slow', '-movflags', '+faststart', mp4], { stdio: 'inherit' });
    spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-t', '30', '-i', mp4, '-vf', 'fps=8,scale=480:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle', join(MIDIA, nome + '.gif')], { stdio: 'inherit' });
    console.log(nome, mp4);
  }
} finally { await nav.close(); srv.kill(); }
