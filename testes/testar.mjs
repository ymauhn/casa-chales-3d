// Teste da visita com Playwright: desktop e celular, as duas páginas, FPS medido, erros do console,
// capturas de cada parada e um vídeo curto da navegação (vira GIF com o ffmpeg, se ele estiver no PATH).
// Uso: npm run build && node testes/testar.mjs [--so casa|flats] [--sem-video] [--navegador msedge|chrome|chromium]
import { chromium, devices } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readdirSync, renameSync } from 'node:fs';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const opc = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const SO = opc('--so'), SEM_VIDEO = args.includes('--sem-video');
const CANAL = opc('--navegador') || 'msedge';
const GPU_ALTA = opc('--gpu') === 'alta';   // força a GPU dedicada (notebook com duas GPUs)
const RAIZ = resolve(import.meta.dirname, '..');
const SAIDA = join(RAIZ, 'testes', 'saida');
const PORTA = 4183, URL0 = `http://127.0.0.1:${PORTA}/`;
mkdirSync(SAIDA, { recursive: true });

// servidor: vite preview do dist/ (rode npm run build antes)
const srv = spawn(process.execPath, [join(RAIZ, 'node_modules/vite/bin/vite.js'), 'preview', '--port', String(PORTA), '--strictPort'], { cwd: RAIZ, stdio: 'pipe' });
await new Promise((ok, falha) => {
  const t = setTimeout(() => falha(new Error('o vite preview não subiu')), 20000);
  srv.stdout.on('data', d => { if (String(d).includes(String(PORTA))) { clearTimeout(t); ok(); } });
});

const navegador = await chromium.launch({
  channel: CANAL === 'chromium' ? undefined : CANAL,
  args: ['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--use-angle=d3d11', ...(GPU_ALTA ? ['--force_high_performance_gpu'] : [])],
});
const resultado = { quando: new Date().toISOString(), navegador: CANAL, gpu_alta: GPU_ALTA, paginas: [] };
const espera = ms => new Promise(r => setTimeout(r, ms));

async function testar(pagina, perfil) {
  const nome = `${pagina}-${perfil}`;
  const pasta = join(SAIDA, nome);
  mkdirSync(pasta, { recursive: true });
  const ctxOpc = perfil === 'celular' ? { ...devices['iPhone 13'] } : { viewport: { width: 1440, height: 900 } };
  if (!SEM_VIDEO && perfil === 'desktop') ctxOpc.recordVideo = { dir: pasta, size: { width: 960, height: 600 } };
  const ctx = await navegador.newContext(ctxOpc);
  const pg = await ctx.newPage();
  const erros = [], avisos = [];
  let bytes = 0;
  pg.on('console', m => { if (m.type() === 'error') erros.push(m.text()); else if (m.type() === 'warning') avisos.push(m.text()); });
  pg.on('pageerror', e => erros.push('pageerror: ' + e.message));
  const faltando = [];
  pg.on('response', r => { bytes += Number(r.headers()['content-length'] || 0); if (r.status() >= 400) faltando.push(r.status() + ' ' + r.url()); });
  const r = { pagina, perfil, paradas: {}, fps: {} };
  const t0 = Date.now();
  await pg.goto(URL0 + (pagina === 'casa' ? 'casa.html' : 'flats.html'));
  await pg.waitForFunction(() => window.__site?.pronto, null, { timeout: 90000 });
  r.carga_s = +((Date.now() - t0) / 1000).toFixed(1);
  r.gpu = await pg.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'desconhecida';
  });
  await espera(1800);
  await pg.screenshot({ path: join(pasta, '00-abertura.png') });
  r.fps.abertura = await pg.evaluate(() => window.__site.fps(3000));
  // entrar pela fachada (clique no botão de verdade)
  await pg.click('#b-comecar');
  const ultimaEntrada = pagina === 'casa' ? 'entrada' : 'sala';
  await pg.waitForFunction(id => window.__site.parada === id && window.__site.modo === 'tour' && !window.__site.voando, ultimaEntrada, { timeout: 30000 });
  await espera(900);
  await pg.screenshot({ path: join(pasta, '01-entrada.png') });
  r.fps.comodo = await pg.evaluate(() => window.__site.fps(3000));
  await espera(3000);   // a resolução adaptativa já decidiu: mede de novo, estável
  r.fps.comodo_estavel = await pg.evaluate(() => window.__site.fps(3000));
  r.adaptacao = await pg.evaluate(() => ({ sombra: window.__site.sombra, resolucao: window.__site.resolucao }));
  r.desenho = await pg.evaluate(() => window.__site.desenho());
  // cada parada, pelo menu (clique no cartão) no desktop; no celular, pela API (mais rápido)
  const ids = await pg.evaluate(() => window.__site.paradas);
  let i = 2;
  for (const id of ids) {
    const ini = Date.now();
    if (perfil === 'desktop') await pg.click(`#menu button[data-id="${id}"]`);
    else await pg.evaluate(id => window.__site.ir(id), id);
    await pg.waitForFunction(id => window.__site.parada === id && !window.__site.voando, id, { timeout: 20000 });
    await espera(700);   // o forro volta e as marcas aparecem
    r.paradas[id] = { s: +((Date.now() - ini) / 1000).toFixed(1) };
    await pg.screenshot({ path: join(pasta, `${String(i++).padStart(2, '0')}-${id}.png`) });
  }
  // clique numa marca da cena (se houver alguma visível)
  await pg.evaluate(id => window.__site.ir(id), ids.find(x => x === 'salao' || x === 'sala'));
  await pg.waitForFunction(() => !window.__site.voando, null, { timeout: 20000 });
  await espera(700);
  // a marca visível cujo centro não está coberto por outro elemento (o clique de verdade, com o mouse)
  const ponto = await pg.evaluate(() => {
    for (const m of document.querySelectorAll('.marca.on')) {
      const b = m.querySelector('i').getBoundingClientRect(), x = b.x + b.width / 2, y = b.y + b.height / 2;
      if (m.contains(document.elementFromPoint(x, y))) return { x, y, alvo: m.getAttribute('aria-label') };
    }
    return null;
  });
  if (ponto) {
    await pg.mouse.click(ponto.x, ponto.y);
    await pg.waitForFunction(() => !window.__site.voando, null, { timeout: 20000 });
    r.clique_marca = { alvo: ponto.alvo, chegou: await pg.evaluate(() => window.__site.parada) };
  } else r.clique_marca = { alvo: null };
  // andar livre: anda 2,5 s para a frente e confere que saiu do lugar sem atravessar parede
  await pg.evaluate(() => window.__site.livre());
  await pg.waitForFunction(() => window.__site.modo === 'livre', null, { timeout: 20000 });
  const antes = await pg.evaluate(() => window.__site.vista());
  await pg.evaluate(() => window.__site.andar(1, 0));
  r.fps.livre = await pg.evaluate(() => window.__site.fps(2500));
  await pg.evaluate(() => window.__site.andar(0, 0));
  const depois = await pg.evaluate(() => window.__site.vista());
  r.livre = { andou_m: +Math.hypot(depois.x - antes.x, depois.y - antes.y).toFixed(2), onde: await pg.evaluate(() => window.__site.onde()) };
  await pg.screenshot({ path: join(pasta, `${String(i++).padStart(2, '0')}-livre.png`) });
  // 360° (só a casa tem panoramas)
  if (pagina === 'casa') {
    await pg.evaluate(() => window.__site.ir('salao'));
    await pg.waitForFunction(() => !window.__site.voando, null, { timeout: 20000 });
    await pg.click('#b-360');
    await pg.waitForFunction(() => window.__site.modo === '360', null, { timeout: 30000 });
    await espera(800);
    r.fps['360'] = await pg.evaluate(() => window.__site.fps(2500));
    await pg.screenshot({ path: join(pasta, `${String(i++).padStart(2, '0')}-360-salao.png`) });
    await pg.click('#b-360');
  }
  r.erros_console = erros;
  r.http_erros = faltando;
  r.erros_site = await pg.evaluate(() => window.__site.erros);
  r.avisos_console = avisos.slice(0, 10);
  r.baixado_MB = +(bytes / 1e6).toFixed(2);
  await ctx.close();
  // vídeo -> GIF curto
  if (ctxOpc.recordVideo) {
    const webm = readdirSync(pasta).find(f => f.endsWith('.webm'));
    if (webm) {
      renameSync(join(pasta, webm), join(pasta, 'navegacao.webm'));
      r.video = join('testes', 'saida', nome, 'navegacao.webm');
    }
  }
  resultado.paginas.push(r);
  console.log(nome, JSON.stringify({ carga_s: r.carga_s, fps: r.fps, adaptacao: r.adaptacao, erros: erros.length + r.erros_site.length, livre: r.livre, marca: r.clique_marca, gpu: r.gpu }));
}

try {
  for (const pagina of ['casa', 'flats']) {
    if (SO && SO !== pagina) continue;
    for (const perfil of ['desktop', 'celular']) await testar(pagina, perfil);
  }
  // a capa
  const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
  const pg = await ctx.newPage();
  const errosCapa = [];
  pg.on('console', m => { if (m.type() === 'error') errosCapa.push(m.text()); });
  pg.on('pageerror', e => errosCapa.push(e.message));
  await pg.goto(URL0);
  await espera(800);
  await pg.screenshot({ path: join(SAIDA, 'capa.png') });
  resultado.capa = { erros: errosCapa };
  await ctx.close();
} finally {
  await navegador.close();
  srv.kill();
  writeFileSync(join(SAIDA, GPU_ALTA ? 'resultado-gpu-alta.json' : 'resultado.json'), JSON.stringify(resultado, null, 1));
}
const totalErros = resultado.paginas.reduce((n, p) => n + p.erros_console.length + p.erros_site.length, 0) + (resultado.capa?.erros.length || 0);
console.log(`\n${resultado.paginas.length} rodadas, ${totalErros} erro(s) de console. Resultado em testes/saida/resultado.json`);
process.exitCode = totalErros ? 1 : 0;
