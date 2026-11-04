// Grava um passeio curto em cada página (Playwright, 1280x720) e gera MP4 e GIF em docs/midia/ com o ffmpeg.
// Uso: npm run build && node testes/gravar.mjs
import { chromium } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, renameSync } from 'node:fs';
import { join, resolve } from 'node:path';

const RAIZ = resolve(import.meta.dirname, '..');
const BRUTO = join(RAIZ, 'testes', 'saida', 'video');
const MIDIA = join(RAIZ, 'docs', 'midia');
const PORTA = 4174;
mkdirSync(BRUTO, { recursive: true });
mkdirSync(MIDIA, { recursive: true });
const espera = ms => new Promise(r => setTimeout(r, ms));

const srv = spawn(process.execPath, [join(RAIZ, 'node_modules/vite/bin/vite.js'), 'preview', '--port', String(PORTA), '--strictPort'], { cwd: RAIZ, stdio: 'pipe' });
await new Promise((ok, falha) => {
  const t = setTimeout(() => falha(new Error('o vite preview não subiu')), 20000);
  srv.stdout.on('data', d => { if (String(d).includes(String(PORTA))) { clearTimeout(t); ok(); } });
});
const nav = await chromium.launch({ channel: 'msedge', args: ['--ignore-gpu-blocklist', '--use-angle=d3d11', '--force_high_performance_gpu'] });   // a GPU dedicada do notebook

// o passeio: entra pela fachada, clica em marcas e no menu, abre o 360 (casa) e anda livre um pouco
async function passeio(pagina, roteiro) {
  const ctx = await nav.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: BRUTO, size: { width: 1280, height: 720 } } });
  const pg = await ctx.newPage();
  await pg.goto(`http://127.0.0.1:${PORTA}/${pagina}`);
  await pg.waitForFunction(() => window.__site?.pronto, null, { timeout: 60000 });
  await espera(1500);
  await pg.click('#b-comecar');
  await pg.waitForFunction(() => !window.__site.voando && document.querySelector('#carga').classList.contains('fora') && window.__site.parada !== null && window.__site.parada !== 'aerea' && window.__site.parada !== 'maquete', null, { timeout: 30000 });
  await pg.waitForFunction(() => !window.__site.voando, null, { timeout: 30000 });
  await espera(1600);
  for (const passo of roteiro) {
    if (passo.menu) await pg.click(`#menu button[data-id="${passo.menu}"]`);
    if (passo.marca) await pg.click(`.marca.on[aria-label="Ir para ${passo.marca}"]`).catch(() => pg.evaluate(id => window.__site.ir(id), passo.id));
    if (passo.olhar) { await pg.mouse.move(640, 360); await pg.mouse.down(); await pg.mouse.move(640 + passo.olhar, 370, { steps: 30 }); await pg.mouse.up(); }
    if (passo.b360) { await pg.click('#b-360'); await pg.waitForFunction(() => window.__site.modo === '360', null, { timeout: 30000 }); await espera(800); await pg.mouse.move(640, 360); await pg.mouse.down(); await pg.mouse.move(300, 360, { steps: 40 }); await pg.mouse.up(); await espera(600); await pg.click('#b-360'); }
    if (passo.livre) { await pg.click('#b-livre'); await pg.waitForFunction(() => window.__site.modo === 'livre', null, { timeout: 20000 }); await pg.evaluate(() => window.__site.andar(1, 0)); await espera(2200); await pg.evaluate(() => window.__site.andar(0, 0)); }
    await pg.waitForFunction(() => !window.__site.voando, null, { timeout: 30000 });
    await espera(passo.pausa ?? 1400);
  }
  const video = pg.video();
  await ctx.close();
  const bruto = await video.path();
  return bruto;
}

function converter(webm, nome, inicio) {
  const mp4 = join(MIDIA, nome + '.mp4'), gif = join(MIDIA, nome + '.gif');
  // corta a carga do começo; MP4 leve (H.264) e GIF de 640 px a 10 quadros/s com paleta própria
  spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(inicio), '-i', webm, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '28', '-preset', 'slow', '-movflags', '+faststart', mp4], { stdio: 'inherit' });
  spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(inicio), '-i', webm, '-vf', 'fps=10,scale=640:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4', gif], { stdio: 'inherit' });
  return { mp4, gif };
}

try {
  const casa = await passeio('casa.html', [
    { marca: 'Varanda', id: 'varanda' },
    { menu: 'salao' },
    { olhar: -260 },
    { marca: 'Cozinha', id: 'cozinha' },
    { menu: 'suite' },
    { menu: 'piscina' },
    { menu: 'planta', pausa: 1800 },
    { menu: 'salao', b360: true },
  ]);
  const flat = await passeio('flats.html', [
    { menu: 'cozinha' },
    { marca: 'TV e ripado', id: 'tv' },
    { menu: 'quarto' },
    { menu: 'banheiro' },
    { menu: 'planta', pausa: 1600 },
    { menu: 'sala', livre: true },
  ]);
  console.log('casa', converter(casa, 'passeio-casa', 1.2));
  console.log('flat', converter(flat, 'passeio-flat', 1.2));
} finally {
  await nav.close();
  srv.kill();
}
