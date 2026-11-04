// Anda de verdade (andar livre, com a colisão do site) por cada passagem: segue pontos e confere que chegou.
// Uso: npm run build && node testes/portas.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, resolve } from 'node:path';
const RAIZ = resolve(import.meta.dirname, '..'), PORTA = 4187;
const ROTAS = {
  'casa.html': [
    ['varanda -> cozinha (porta de vidro)', [[9.8, 3.0], [9.8, 4.8]]],
    ['cozinha: entre a mesa e a ilha', [[12.25, 4.7], [12.25, 8.6]]],
    ['cozinha -> terraço (porta de vidro)', [[10.7, 8.5], [10.7, 10.3]]],
    ['terraço -> varanda suspensa (degraus)', [[10.7, 10.3], [9.0, 13.6], [6.4, 13.6]]],
    ['cozinha -> varanda suspensa (caminho todo)', [[11.1, 6.5], [10.7, 8.4], [10.7, 10.3], [9.0, 13.6], [6.4, 13.6]]],
    ['terraço -> suíte master', [[12.6, 11.6], [12.6, 13.6]]],
    ['porta oeste da cozinha', [[8.4, 6.3], [7.1, 6.25]]],
    ['deck ao lado da piscina', [[4.25, 2.6], [4.25, 7.5]]],
    ['hall de baixo -> suíte 01', [[8.6, 13.64, -3], [13.8, 13.64]]],
    ['suíte 01 -> varanda de baixo', [[15.5, 14.8, -3], [16.9, 14.8]]],
  ],
  'flats.html': [
    ['sala -> quarto', [[2.85, 4.8], [2.85, 7.0]]],
    ['sala -> varanda (porta fechada que abre)', [[5.45, 4.8], [5.45, 6.6]]],
    ['quarto -> banheiro', [[3.4, 9.1], [4.9, 9.1]]],
    ['sala -> lavanderia', [[5.8, 0.5], [7.1, 0.5]]],
  ],
};
const srv = spawn(process.execPath, [join(RAIZ, 'node_modules/vite/bin/vite.js'), 'preview', '--port', String(PORTA), '--strictPort'], { cwd: RAIZ, stdio: 'pipe' });
await new Promise(ok => srv.stdout.on('data', d => String(d).includes(String(PORTA)) && ok()));
const nav = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11'] });
let falhas = 0;
try {
  for (const [pagina, rotas] of Object.entries(ROTAS)) {
    const pg = await (await nav.newContext({ viewport: { width: 800, height: 500 } })).newPage();
    await pg.goto(`http://127.0.0.1:${PORTA}/${pagina}?mata=0#livre`);
    await pg.waitForFunction(() => window.__site?.modo === 'livre', null, { timeout: 60000 });
    for (const [nome, pts] of rotas) {
      const [x0, y0, z0] = pts[0];
      await pg.evaluate(([x, y, z, a]) => window.__site.teleporte(x, y, a, z ?? 99), [x0, y0, z0, Math.atan2(pts[1][1] - y0, pts[1][0] - x0) * 180 / Math.PI]);
      let ok = true, onde = null;
      for (const [x, y] of pts.slice(1)) {
        let chegou = false;
        for (let t = 0; t < 120 && !chegou; t++) {   // até 12 s por trecho
          const [px, py] = await pg.evaluate(() => window.__site.pe());
          if (Math.hypot(x - px, y - py) < 0.3) { chegou = true; break; }
          await pg.evaluate(a => { window.__site.virar(a); window.__site.andar(1, 0); }, Math.atan2(y - py, x - px) * 180 / Math.PI);
          await pg.waitForTimeout(100);
        }
        await pg.evaluate(() => window.__site.andar(0, 0));
        onde = await pg.evaluate(() => window.__site.pe().map(v => +v.toFixed(2)));
        if (!chegou) { ok = false; break; }
      }
      if (!ok) falhas++;
      console.log(ok ? 'passa ' : 'TRAVA ', pagina, nome, ok ? '' : 'parou em ' + JSON.stringify(onde));
    }
    await pg.context().close();
  }
} finally { await nav.close(); srv.kill(); }
console.log(falhas ? `${falhas} passagem(ns) travada(s)` : 'todas as passagens passam');
process.exitCode = falhas ? 1 : 0;
