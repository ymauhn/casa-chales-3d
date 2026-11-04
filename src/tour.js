// Visita 3D: a câmera voa de parada em parada (cômodos), com marcas clicáveis na cena, menu de cômodos,
// tour automático, andar livre (a colisão do flats-3d) e o panorama 360° renderizado no Cycles.
// Coordenadas da visita em metros do Blender (x, y no plano, z para cima); o glTF chega em (x, z, -y).
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { IMOVEIS } from './imoveis.js';
import { gsap } from 'gsap';

THREE.ShaderChunk.tonemapping_pars_fragment = THREE.ShaderChunk.tonemapping_pars_fragment.replace(
  'color = agxDefaultContrastApprox( color );',
  'color = clamp( ( color - 0.6061 ) * 1.2 + 0.6061, 0.0, 1.0 ); color = agxDefaultContrastApprox( color );');
const NOME = document.body.dataset.imovel;
const cfg = IMOVEIS[NOME];
const $ = s => document.querySelector(s);
const REDUZIDO = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TOQUE = matchMedia('(pointer: coarse)').matches;
const OLHO = 1.6, RAIO = 0.24, CORPO = [0.35, 1.45], VEL = 1.6, VEL_CORRIDA = 3.2, SUBIDA = 0.45;
const paradas = new Map(cfg.paradas.map(p => [p.id, p]));
if (new URLSearchParams(location.search).has('limpo')) document.body.classList.add('limpo');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const erros = [];
addEventListener('error', e => erros.push(String(e.message)));
addEventListener('unhandledrejection', e => erros.push(String(e.reason)));

// ---------- cena
const canvas = $('#cena');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (e) {
  $('#status').textContent = 'Este navegador não abriu o 3D (WebGL desligado). Tente o Chrome, o Edge ou o Safari atualizados.';
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, TOQUE ? 1.5 : 2));
renderer.toneMapping = THREE.AgXToneMapping;
// ---------- luz: o sol na direção e na cor das vistas Cycles (luz.sol do imoveis/<nome>.json), céu frio de preenchimento
// e as luzes quentes dos cômodos perto do visitante; sombra do sol no desktop (?sombra=0 desliga)
const L = cfg.luz;
const SOMBRA = !TOQUE && new URLSearchParams(location.search).get('sombra') !== '0';
renderer.toneMappingExposure = L.exposicao;
const cena = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
const estudio = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
cena.environment = estudio;
cena.environmentIntensity = L.ambiente;
// o centro do panorama é o +y do Blender (-z no three); o equirretangular do three põe o centro em +x
cena.environmentRotation.set(0, -Math.PI / 2, 0);
// panorama Cycles mais perto da vista (mesmo pavimento) vira o ambiente: reflexos e preenchimento com a cor do cômodo
let ambienteDe = null, ambienteRT = null, pedidoAmbiente = 0;
const texturasAmbiente = new Map();
async function ambientePerto(p) {
  const comPano = cfg.paradas.filter(q => q.pano && Math.abs(q.cam[2] - p.cam[2]) < 1.6);
  const q = p.pano ? p : comPano.sort((a, b) => Math.hypot(a.cam[0] - p.cam[0], a.cam[1] - p.cam[1]) - Math.hypot(b.cam[0] - p.cam[0], b.cam[1] - p.cam[1]))[0];
  if (!q || q.pano === ambienteDe) return;
  const meu = ++pedidoAmbiente;
  let tex = texturasAmbiente.get(q.pano);
  if (!tex) {
    tex = await new THREE.TextureLoader().loadAsync(`pano/env/${q.pano}.webp`).catch(() => null);
    if (!tex) return;
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    texturasAmbiente.set(q.pano, tex);
  }
  if (meu !== pedidoAmbiente) return;   // outro pedido chegou depois
  const rt = pmrem.fromEquirectangular(tex);
  ambienteRT?.dispose();
  ambienteRT = rt; ambienteDe = q.pano;
  cena.environment = rt.texture;
  cena.environmentIntensity = L.ambientePano ?? 1;
}
const hemisferio = new THREE.HemisphereLight(L.ceu[0], L.ceu[1], L.ceu[2]);
cena.add(hemisferio);
// o SUN do Blender aponta para -Z local, girado por rotation_euler (XYZ); o sentido PARA o sol, em metros do Blender:
const [rx, rz] = L.sol.rotacao.map(g => g * Math.PI / 180);
const paraSol = [Math.sin(rz) * Math.sin(rx), -Math.cos(rz) * Math.sin(rx), Math.cos(rx)];
const sol = new THREE.DirectionalLight(0xffffff, L.sol.forca);
sol.color.setRGB(...L.sol.cor, THREE.LinearSRGBColorSpace);
sol.target.position.set(L.sol.centro[0], 0, -L.sol.centro[1]);
sol.position.set(L.sol.centro[0] + paraSol[0] * 40, paraSol[2] * 40, -L.sol.centro[1] - paraSol[1] * 40);
cena.add(sol, sol.target);
// sem sombra (celular, ou o desktop lento), o sol entraria em todo cômodo como se não houvesse telhado:
// fica mais fraco e o céu preenche mais
function semSombra() {
  sol.castShadow = false;
  sol.intensity = L.sol.forca * 0.4;
  hemisferio.intensity = L.ceu[2] * 1.7;   // (o acenderPerto ajusta dentro e fora de casa a partir daqui)
}
if (!SOMBRA) semSombra();
else {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  Object.assign(sol.shadow.camera, { left: -L.sol.raio, right: L.sol.raio, top: L.sol.raio, bottom: -L.sol.raio, near: 1, far: 100 });
  sol.shadow.camera.updateProjectionMatrix();
  sol.shadow.bias = -0.0005;
  sol.shadow.intensity = 0.75;   // a sombra do Cycles vem cheia de rebote: não é preta
  sol.shadow.radius = 3;
  sol.shadow.normalBias = 0.04;
}
// luzes dos cômodos: um número fixo de luzes pontuais (o shader não recompila), postas no centro dos cômodos mais
// perto do olho, no mesmo pavimento, logo abaixo do teto; acendem devagar
const lampadas = Array.from({ length: TOQUE ? 2 : 4 }, () => {
  const l = new THREE.PointLight(L.lampada.cor, 0, L.lampada.alcance, 2);
  l.userData.alvo = 0;
  cena.add(l);
  return l;
});
if (cfg.neblina) cena.fog = new THREE.Fog(cfg.neblina[0], cfg.neblina[1], cfg.neblina[2]);
const camera = new THREE.PerspectiveCamera(70, 1, 0.15, 500);
const cenaPano = new THREE.Scene();
const cameraPano = new THREE.PerspectiveCamera(70, 1, 0.1, 200);

// fov horizontal (graus) -> vertical da câmera three, entre 20° e 100° (no celular em pé o horizontal fecha um pouco)
const fovVertical = (h, aspecto) => clamp(2 * Math.atan(Math.tan(h * Math.PI / 360) / aspecto) * 180 / Math.PI, 20, 100);
function ajustarFov(c, h) {
  const f = fovVertical(h, c.aspect);
  if (Math.abs(f - c.fov) > 0.01) { c.fov = f; c.updateProjectionMatrix(); }
}
function redimensionar() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  for (const c of [camera, cameraPano]) { c.aspect = w / h; c.fov = 0; ajustarFov(c, c === camera ? vista.fov : FOV); }
}

// ---------- vista: onde está o olho (metros do Blender) e para onde olha
const FOV = 90;   // horizontal padrão; a parada com lente (mm) usa o da vista Cycles
const fovDaLente = mm => 2 * Math.atan(18 / mm) * 180 / Math.PI;
const vista = { x: 0, y: 0, z: 10, yaw: 0, pitch: -0.5, fov: FOV, ev: 0 };
function vistaDe(p) {
  const [x, y, z] = p.cam, [ax, ay, az] = p.alvo;
  return { x, y, z, yaw: Math.atan2(ay - y, ax - x), pitch: clamp(Math.atan2(az - z, Math.hypot(ax - x, ay - y)), -1.55, 1.55), fov: p.lente ? fovDaLente(p.lente) : p.fov ?? FOV, ev: p.ev ?? 0 };
}
const DIR = new THREE.Vector3();
function orientar(cam, comPosicao) {
  if (comPosicao) cam.position.set(vista.x, vista.z, -vista.y);
  const cp = Math.cos(vista.pitch);
  DIR.set(cp * Math.cos(vista.yaw), Math.sin(vista.pitch), -cp * Math.sin(vista.yaw)).add(cam.position);
  cam.lookAt(DIR);
}
addEventListener('resize', redimensionar);
redimensionar();
function olhar(dyaw, dpitch) {
  vista.yaw += dyaw;
  vista.pitch = clamp(vista.pitch + dpitch, -1.5, 1.5);
}

// ---------- colisão (colisao.json do flats-3d: caixas [x0,y0,z0,x1,y1,z1], pisos [x0,y0,x1,y1,z], terreno em grade)
const col = { caixas: [], pisos: [], terreno: null, comodos: {}, nascimento: null };
function terreno(x, y) {
  const t = col.terreno;
  if (!t) return null;
  const fx = (x - t.x0) / t.passo, fy = (y - t.y0) / t.passo;
  const i = Math.floor(fx), j = Math.floor(fy);
  if (i < 0 || j < 0 || i >= t.nx - 1 || j >= t.ny - 1) return null;
  const u = fx - i, v = fy - j, z = (a, b) => t.z[b * t.nx + a];
  return (z(i, j) * (1 - u) + z(i + 1, j) * u) * (1 - v) + (z(i, j + 1) * (1 - u) + z(i + 1, j + 1) * u) * v;
}
// o chão sob (x, y) para quem está em pz: o mais alto entre pisos e terreno que não passa de pz + SUBIDA (flat: sempre 0)
function chao(x, y, pz) {
  if (!col.pisos.length && !col.terreno) return 0;
  const z = chaoExato(x, y, pz);
  if (z !== null && pz - z <= 1) return z;
  let melhor = z;   // soleira das portas (sem piso, ou só o pavimento de baixo): o piso vizinho mais alto, até 0,25 m
  for (const [dx, dy] of [[0.25, 0], [-0.25, 0], [0, 0.25], [0, -0.25]]) {
    const v = chaoExato(x + dx, y + dy, pz);
    if (v !== null && (melhor === null || v > melhor)) melhor = v;
  }
  return melhor;
}
function chaoExato(x, y, pz) {
  let melhor = null;
  for (const p of col.pisos)
    if (x >= p[0] && x <= p[2] && y >= p[1] && y <= p[3] && p[4] <= pz + SUBIDA && (melhor === null || p[4] > melhor)) melhor = p[4];
  const t = terreno(x, y);
  if (t !== null && t <= pz + SUBIDA && (melhor === null || t > melhor)) melhor = t;
  return melhor;
}
function colide(px, py, pz) {
  for (const b of col.caixas) {
    if (b[2] >= pz + CORPO[1] || b[5] <= pz + CORPO[0]) continue;
    if (px + RAIO > b[0] && px - RAIO < b[3] && py + RAIO > b[1] && py - RAIO < b[4]) return true;
  }
  return false;
}
// o segmento a-b atravessa a caixa c? (teste de lajes)
function cruza(a, b, c) {
  let t0 = 0, t1 = 1;
  for (let k = 0; k < 3; k++) {
    const d = b[k] - a[k], lo = c[k], hi = c[k + 3];
    if (Math.abs(d) < 1e-9) { if (a[k] < lo || a[k] > hi) return false; continue; }
    let ta = (lo - a[k]) / d, tb = (hi - a[k]) / d;
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
    if (t0 > t1) return false;
  }
  return true;
}
const desobstruido = (a, b) => !col.caixas.some(c => cruza(a, b, c));

// ---------- portas fechadas: no andar livre, abrem sozinhas quando o visitante chega perto (giram na dobradiça,
// como o E do Unreal) e a caixa da folha deixa de barrar. O nó da folha no glb tem a origem na dobradiça.
const portasFechadas = [];
function prepararPortas(raiz) {
  for (const pt of col.portas || []) {
    if (pt.aberta) continue;
    const ob = raiz.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(pt.nome));
    if (!ob) continue;
    const [hx, hy, hz] = pt.dobradica, [dx, dy] = pt.direcao_fechada;
    const cx = hx + dx * pt.largura / 2, cy = hy + dy * pt.largura / 2;
    const caixas = col.caixas.filter(b => b[5] - b[2] > 1.8 && Math.min(b[3] - b[0], b[4] - b[1]) < 0.08
      && cx > b[0] - 0.1 && cx < b[3] + 0.1 && cy > b[1] - 0.1 && cy < b[4] + 0.1);
    portasFechadas.push({ ob, cx, cy, z: hz, alvo: pt.aberta_graus * Math.PI / 180, caixas, aberta: false });
  }
}
function abrirPortasPerto() {
  for (const pt of portasFechadas) {
    if (pt.aberta || Math.abs(andar.pz - pt.z) > 1 || Math.hypot(andar.px - pt.cx, andar.py - pt.cy) > 1.3) continue;
    pt.aberta = true;
    col.caixas = col.caixas.filter(b => !pt.caixas.includes(b));
    pt.ob.matrixAutoUpdate = true;
    gsap.to(pt.ob.rotation, { y: pt.ob.rotation.y + pt.alvo, duration: 0.9, ease: 'power2.out',
      onComplete: () => { renderer.shadowMap.needsUpdate = true; } });
  }
}

// ---------- andar livre
const andar = { px: 0, py: 0, pz: 0, f: 0, l: 0 };
const teclas = new Set();
function passo(nx, ny) {   // anda para (nx, ny) se houver chão e nada no caminho; o pé acompanha o chão
  const z = chao(nx, ny, andar.pz);
  if (z === null || andar.pz - z > 1 || colide(nx, ny, z)) return false;
  andar.px = nx; andar.py = ny; andar.pz = z;
  return true;
}
function mover(dt) {
  const correr = teclas.has('ShiftLeft') || teclas.has('ShiftRight');
  const v = (correr ? VEL_CORRIDA : VEL) * dt;
  let f = andar.f, l = andar.l;
  if (teclas.has('KeyW') || teclas.has('ArrowUp')) f += 1;
  if (teclas.has('KeyS') || teclas.has('ArrowDown')) f -= 1;
  if (teclas.has('KeyA')) l += 1;
  if (teclas.has('KeyD')) l -= 1;
  vista.yaw += ((teclas.has('ArrowLeft') ? 1 : 0) - (teclas.has('ArrowRight') ? 1 : 0)) * 1.8 * dt;
  if (!f && !l) return;
  const n = Math.max(1, Math.hypot(f, l));   // o toque é analógico: menos de 1 anda devagar
  f /= n; l /= n;
  const cy = Math.cos(vista.yaw), sy = Math.sin(vista.yaw);
  passo(andar.px + (f * cy - l * sy) * v, andar.py);   // desliza na parede
  passo(andar.px, andar.py + (f * sy + l * cy) * v);
}
function ondeEstou() {
  for (const [nome, c] of Object.entries(col.comodos || {})) {
    if (Math.abs((c.z || 0) - andar.pz) > 1.5) continue;   // cômodo de outro pavimento
    if (andar.px >= c.x[0] && andar.px <= c.x[1] && andar.py >= c.y[0] && andar.py <= c.y[1])
      return nome.replace(/_/g, ' ').replace(/^./, s => s.toUpperCase());
  }
  return 'Área externa';
}

// ---------- voo entre paradas
// Direto quando um enxerga o outro (mesmo andar e nenhuma caixa no caminho); senão sobe acima do telhado
// (forro e telhado somem, como numa maquete), atravessa por cima e desce no cômodo.
let voo = null;
const angulo = d => Math.atan2(Math.sin(d), Math.cos(d));
const suave = t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const interno = p => p && !p.externo && !p.visao;
function voar(B, origem, destino) {
  pararTomada();
  const A = { ...vista };
  const dist = Math.hypot(B.x - A.x, B.y - A.y, B.z - A.z);
  const alto = A.z > cfg.alturaTelhado && B.z > cfg.alturaTelhado;
  const direto = dist < 0.05 || alto || (Math.abs(B.z - A.z) < 1.2 && desobstruido([A.x, A.y, A.z], [B.x, B.y, B.z]));
  const mix = k => ({ x: A.x + (B.x - A.x) * k, y: A.y + (B.y - A.y) * k, z: A.z + (B.z - A.z) * k });
  const h = Math.max(cfg.alturaVoo, A.z, B.z);
  const P1 = direto ? mix(1 / 3) : { x: A.x, y: A.y, z: h };
  const P2 = direto ? mix(2 / 3) : { x: B.x, y: B.y, z: h };
  if (REDUZIDO) { voo?.fim(); voo = null; Object.assign(vista, B); pouso = performance.now(); return Promise.resolve(); }
  const T = clamp(0.9 + dist * 0.09 + (direto ? 0 : 1.2), 1.1, 4.5);
  const escondeTeto = !!destino?.semTeto || (!direto && (interno(origem) || interno(destino)));
  return new Promise(fim => {
    voo?.fim();
    voo = { A, B, P1, P2, t0: performance.now(), T: T * 1000, direto, escondeTeto, baixo: !direto && Math.min(A.z, B.z) < -0.5, fim };
  });
}
let veu = 0, pouso = 0;
function atualizarVoo(agora) {
  const v = voo;
  const t = Math.min(1, (agora - v.t0) / v.T), e = suave(t), u = 1 - e;
  for (const k of ['x', 'y', 'z']) vista[k] = u * u * u * v.A[k] + 3 * u * u * e * v.P1[k] + 3 * u * e * e * v.P2[k] + e * e * e * v.B[k];
  vista.yaw = v.A.yaw + angulo(v.B.yaw - v.A.yaw) * e;
  vista.fov = v.A.fov + ((v.B.fov ?? FOV) - v.A.fov) * e;
  vista.ev = v.A.ev + ((v.B.ev ?? 0) - v.A.ev) * e;
  vista.pitch = clamp(v.A.pitch + (v.B.pitch - v.A.pitch) * e - (v.direto ? 0 : 0.75 * Math.sin(Math.PI * e)), -1.55, 1.55);
  veu = v.baixo ? clamp(1 - Math.abs(vista.z + 0.1) / 0.9, 0, 0.96) : 0;   // atravessa a laje do térreo de olhos fechados
  if (t >= 1) { voo = null; veu = 0; pouso = agora; v.fim(); }
}

let lampadasDe = '';
function acenderPerto(dt) {
  const piso = vista.z - OLHO, pe = col.pe_direito || 2.7;
  const fora = modo === 'tour' && atual && (atual.externo || atual.visao);
  hemisferio.userData.alvo = (fora || modo === 'indo' ? 1 : L.ceuDentro ?? 0.45) * (sol.castShadow ? L.ceu[2] : L.ceu[2] * 1.7);
  hemisferio.intensity += (hemisferio.userData.alvo - hemisferio.intensity) * Math.min(1, dt * 3);
  const perto = Object.entries(col.comodos || {})
    .map(([n, c]) => ({ n, c, cx: (c.x[0] + c.x[1]) / 2, cy: (c.y[0] + c.y[1]) / 2, z: c.z || 0 }))
    .filter(r => Math.abs(r.z - piso) < 1.6)
    .sort((a, b) => Math.hypot(a.cx - vista.x, a.cy - vista.y) - Math.hypot(b.cx - vista.x, b.cy - vista.y))
    .slice(0, lampadas.length);
  const chave = perto.map(r => r.n).join();
  if (chave !== lampadasDe) {
    const antes = new Map(lampadas.map(l => [l.userData.comodo, l]));
    const livres = lampadas.filter(l => !perto.some(r => r.n === l.userData.comodo));
    for (const r of perto) {
      let l = antes.get(r.n);
      if (!l) { l = livres.shift(); l.intensity = 0; l.userData.comodo = r.n; }
      l.position.set(r.cx, r.z + pe - 0.4, -r.cy);
      l.userData.alvo = clamp((r.c.x[1] - r.c.x[0]) * (r.c.y[1] - r.c.y[0]) * L.lampada.porM2, L.lampada.min, L.lampada.max);
    }
    for (const l of livres) { l.userData.alvo = 0; l.userData.comodo = null; }
    lampadasDe = chave;
  }
  for (const l of lampadas) l.intensity += ((fora ? 0 : l.userData.alvo) - l.intensity) * Math.min(1, dt * 3);
}

// ---------- forro e telhado (somem no voo e na maquete)
const tetos = [];
let tetoOp = 1;
function aplicarTetos(op) {
  if (tetos.length && tetos[0].visible !== op > 0.02) renderer.shadowMap.needsUpdate = true;
  for (const m of tetos) {
    m.visible = op > 0.02;
    for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
      mat.opacity = op; mat.transparent = op < 0.99; mat.depthWrite = op >= 0.99;
    }
  }
}

// ---------- objetos que a parada esconde (ocultar: nomes de nós do glb) e que voltam ao sair dela
let modelo = null, escondidos = [];
function esconderDaParada(p) {
  for (const o of escondidos) o.visible = true;
  escondidos = (p?.ocultar || []).map(n => modelo?.getObjectByName(n)).filter(Boolean);
  for (const o of escondidos) o.visible = false;
  renderer.shadowMap.needsUpdate = true;
}

// ---------- desenho: as malhas paradas que usam o mesmo material viram uma só (o modelo não muda; só o número de
// chamadas de desenho cai, e era ele que pesava: ~1.270 na casa). Ficam de fora o forro e o telhado (somem no voo),
// o que alguma parada esconde e as instâncias. ?juntar=0 desliga.
function paraFloat(geo) {   // o meshopt quantiza (int16 normalizado): para juntar em coordenadas do mundo, volta a float
  const g = new THREE.BufferGeometry();
  for (const [nome, a] of Object.entries(geo.attributes)) {
    const arr = new Float32Array(a.count * a.itemSize);
    for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) arr[i * a.itemSize + k] = a.getComponent(i, k);
    g.setAttribute(nome, new THREE.BufferAttribute(arr, a.itemSize));
  }
  if (geo.index) g.setIndex(new THREE.BufferAttribute(Uint32Array.from(geo.index.array), 1));
  return g;
}
function juntarMalhas(raiz, manter) {
  raiz.updateMatrixWorld(true);
  const grupos = new Map();
  raiz.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material) || manter(o)) return;
    const geo = o.geometry;
    const chave = [o.material.uuid, o.castShadow, o.receiveShadow, !!geo.index,
      Object.keys(geo.attributes).sort().map(n => n + geo.attributes[n].itemSize).join()].join('|');
    if (!grupos.has(chave)) grupos.set(chave, { material: o.material, cast: o.castShadow, rec: o.receiveShadow, malhas: [] });
    grupos.get(chave).malhas.push(o);
  });
  let antes = 0, depois = 0;
  for (const gr of grupos.values()) {
    antes += gr.malhas.length;
    if (gr.malhas.length < 2) { depois += gr.malhas.length; continue; }
    const geo = mergeGeometries(gr.malhas.map(o => paraFloat(o.geometry).applyMatrix4(o.matrixWorld)), false);
    if (!geo) { depois += gr.malhas.length; continue; }
    const m = new THREE.Mesh(geo, gr.material);
    m.castShadow = gr.cast; m.receiveShadow = gr.rec; m.name = 'juntado';
    cena.add(m);   // a geometria já está em coordenadas do mundo
    for (const o of gr.malhas) o.removeFromParent();
    depois++;
  }
  return { antes, depois };
}

// ---------- estado da visita
let atual = null, modo = 'carregando', pronto = false;
async function ir(id, { instantaneo = false, cinema = false } = {}) {
  const p = paradas.get(id);
  if (!p) return;
  pararTomada();
  if (modo === '360') fechar360();
  if (modo === 'livre') sairLivre();
  const origem = atual;
  atual = p; modo = 'tour';
  if (!instantaneo) $('#carga').classList.add('fora');   // navegar já é começar a visita
  marcarMenu(); mostrarLegenda(p.nome, p.texto); atualizarBotoes();
  history.replaceState(null, '', '#' + id);
  const B = vistaDe(p);
  esconderDaParada(p);
  if (p.pano || cfg.paradas.some(q => q.pano)) ambientePerto(p);
  if (instantaneo) { voo?.fim(); voo = null; Object.assign(vista, B); tetoOp = p.semTeto ? 0 : 1; aplicarTetos(tetoOp); tomada(p); return; }
  if (cinema) await cortar(B);
  else await voar(B, origem, p);
  if (atual === p && modo === 'tour' && !voo) tomada(p);
}
// ---------- tomada de cinema: ao pousar, a câmera não fica parada. Dentro de casa: dolly de entrada, giro panorâmico
// lento e movimento lateral com parallax; fora: grua e lateral; vistas gerais: órbita em volta do alvo. Cada
// deslocamento é encurtado até não cruzar as caixas de colisão. Qualquer gesto do visitante para a tomada.
let tomadaTl = null;
const corte = { v: 0 };   // véu do corte suave (somado ao véu da laje)
function pararTomada() { tomadaTl?.kill(); tomadaTl = null; }
function livreAte(base, dx, dy, dz) {   // a maior fração do deslocamento que não cruza parede (com 0,3 m de folga)
  const n = Math.hypot(dx, dy, dz) || 1;
  for (const k of [1, 0.7, 0.45, 0.25, 0]) {
    const f = k + 0.3 / n;
    if (k === 0 || desobstruido([base.x, base.y, base.z], [base.x + dx * f, base.y + dy * f, base.z + dz * f])) return k;
  }
  return 0;
}
function tomada(p) {
  pararTomada();
  if (REDUZIDO || document.body.classList.contains('limpo') || modo !== 'tour') return;
  const b = { ...vista };
  const fx = Math.cos(b.yaw), fy = Math.sin(b.yaw), rx = Math.sin(b.yaw), ry = -Math.cos(b.yaw);
  const tl = gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: 'sine.inOut' } });
  if (p.visao && !p.semTeto) {   // órbita lenta em volta do ponto que a vista olha
    const [ax, ay] = p.alvo, r = Math.hypot(b.x - ax, b.y - ay), a0 = Math.atan2(b.y - ay, b.x - ax);
    const o = { a: 0 };
    tl.to(o, { a: 0.35, duration: 14, onUpdate: () => {
      vista.x = ax + r * Math.cos(a0 + o.a); vista.y = ay + r * Math.sin(a0 + o.a);
      vista.yaw = Math.atan2(ay - vista.y, ax - vista.x);
    } });
  } else if (p.semTeto) {   // planta e maquete: giro lento da maquete
    tl.to(vista, { yaw: b.yaw + 0.5, duration: 16 });
  } else if (p.externo) {   // grua (sobe e baixa o olhar) e lateral
    const k = livreAte(b, rx * 1.2, ry * 1.2, 0);
    tl.to(vista, { z: b.z + 0.7, pitch: b.pitch - 0.08, duration: 6 })
      .to(vista, { x: b.x + rx * 1.2 * k, y: b.y + ry * 1.2 * k, yaw: b.yaw + 0.25, duration: 7 })
      .to(vista, { yaw: b.yaw - 0.35, duration: 7 });
  } else {   // dentro: dolly de entrada, panorâmica para os dois lados e lateral com parallax
    const kd = livreAte(b, fx * 0.6, fy * 0.6, 0), kl = livreAte(b, rx * 0.45, ry * 0.45, 0), kl2 = livreAte(b, -rx * 0.45, -ry * 0.45, 0);
    const d = { x: b.x + fx * 0.6 * kd, y: b.y + fy * 0.6 * kd };
    tl.to(vista, { x: d.x, y: d.y, pitch: b.pitch + 0.04, duration: 4 })
      .to(vista, { yaw: b.yaw + 0.75, duration: 6 })
      .to(vista, { yaw: b.yaw - 0.75, duration: 10 })
      .to(vista, { x: d.x + rx * 0.45 * kl - rx * 0.45 * kl2 * 0, y: d.y + ry * 0.45 * kl, yaw: b.yaw - 0.2, duration: 6 })
      .to(vista, { x: b.x - rx * 0.45 * kl2, y: b.y - ry * 0.45 * kl2, yaw: b.yaw + 0.2, duration: 7 });
  }
  tomadaTl = tl;
}
// corte suave: o véu fecha, a câmera vai para o novo plano (um passo atrás, para o dolly de entrada) e o véu abre
async function cortar(B) {
  await gsap.to(corte, { v: 1, duration: 0.45, ease: 'power1.in' });
  voo?.fim(); voo = null;
  const k = livreAte(B, -Math.cos(B.yaw) * 0.8, -Math.sin(B.yaw) * 0.8, 0);
  Object.assign(vista, B, { x: B.x - Math.cos(B.yaw) * 0.8 * k, y: B.y - Math.sin(B.yaw) * 0.8 * k });
  tetoOp = atual?.semTeto ? 0 : 1; aplicarTetos(tetoOp);
  gsap.to(vista, { x: B.x, y: B.y, duration: 2.6, ease: 'power2.out' });
  await gsap.to(corte, { v: 0, duration: 0.7, ease: 'power1.out' });
  pouso = performance.now();
}

function vizinha(passoLista) {
  const lista = cfg.paradas, i = lista.indexOf(atual);
  const j = i < 0 ? (passoLista > 0 ? 0 : lista.length - 1) : (i + passoLista + lista.length) % lista.length;
  ir(lista[j].id);
}

// tour automático: passa por todas as paradas em corte suave, com 10 s de tomada em cada; qualquer toque pausa
let auto = null;
async function tourAutomatico() {
  const meu = auto = {};
  atualizarBotoes();
  const lista = cfg.paradas;
  let i = lista.indexOf(atual);
  while (auto === meu) {
    i = (i + 1) % lista.length;
    await ir(lista[i].id, { cinema: !REDUZIDO });
    if (auto !== meu) break;
    await new Promise(r => setTimeout(r, 10000));
  }
}
function pararAuto() {
  if (!auto) return;
  auto = null;
  atualizarBotoes();
}

// abertura: o pôster (render Cycles) cobre a cena até o visitante entrar; "Entrar" leva pela fachada até a entrada
async function comecar() {
  $('#carga').classList.add('fora');
  inerte(false);
  $('#menu button.atual, #menu button')?.focus({ preventScroll: true });
  for (const id of cfg.entrada) {
    await ir(id);
    if (atual?.id !== id) return;   // o visitante foi para outro lugar no meio
    await new Promise(r => setTimeout(r, 700));
    if (atual?.id !== id || voo) return;
  }
  ajuda();
}

// ---------- andar livre
async function entrarLivre() {
  pararAuto(); pararTomada();
  if (modo === '360') fechar360();
  // começa onde está, se a vista estiver à altura de uma pessoa; senão, no ponto de nascimento do imóvel
  let x = vista.x, y = vista.y, z = chao(x, y, vista.z - 1.0), yaw = vista.yaw;
  if (z === null || vista.z - z > 2.2 || vista.z - z < 0.8 || colide(x, y, z)) {
    const n = col.nascimento || { posicao: [vista.x, vista.y], olhando_graus: 90 };
    x = n.posicao[0]; y = n.posicao[1]; z = chao(x, y, 99) ?? 0; yaw = n.olhando_graus * Math.PI / 180;
    modo = 'indo';
    atual = null; marcarMenu(); atualizarBotoes();
    await voar({ x, y, z: z + OLHO, yaw, pitch: 0, fov: FOV, ev: 0 }, null, {});
    if (modo !== 'indo') return;   // o visitante escolheu outro destino no meio do voo
  }
  if (voo) { voo.fim(); voo = null; veu = 0; }
  andar.px = x; andar.py = y; andar.pz = z; andar.f = andar.l = 0;
  esconderDaParada(null);
  vista.pitch = clamp(vista.pitch, -0.6, 0.6);
  modo = 'livre'; atual = null;
  document.body.classList.add('livre');
  marcarMenu(); atualizarBotoes();
  history.replaceState(null, '', '#livre');
  ajuda(TOQUE ? 'Dedo à esquerda anda (arraste para onde quer ir); dedo à direita olha.'
    : 'Clique na cena para travar o mouse. W A S D andam, ← → giram, Shift corre, Esc solta o mouse.');
}
function sairLivre() {
  if (document.pointerLockElement) document.exitPointerLock();
  document.body.classList.remove('livre');
  andar.f = andar.l = 0; teclas.clear();
  modo = 'tour';
  atualizarBotoes();
}

// ---------- panorama 360° (render Cycles do flats-3d), só nas paradas que têm um
let pano = null;
// a foto-realista de uma parada: o panorama dela ou o do ponto 360 mais perto no mesmo pavimento (até 9 m)
function panoDe(p) {
  if (!p) return null;
  if (p.pano) return p.pano;
  const q = cfg.paradas.filter(q => q.pano && Math.abs(q.cam[2] - p.cam[2]) < 1.6)
    .map(q => [q, Math.hypot(q.cam[0] - p.cam[0], q.cam[1] - p.cam[1])]).sort((a, b) => a[1] - b[1])[0];
  return q && q[1] < 9 ? q[0].pano : null;
}
async function abrir360() {
  const p = atual, idPano = panoDe(p);
  if (!idPano || modo !== 'tour') return;
  pararAuto(); pararTomada();
  $('#b-360').setAttribute('aria-busy', 'true');
  mostrarLegenda(p.nome, 'Carregando o panorama 360°…');
  let tex;
  try { tex = await new THREE.TextureLoader().loadAsync(`pano/${idPano}.webp`); }
  catch { tex = null; }
  $('#b-360').removeAttribute('aria-busy');
  if (!tex) { if (atual === p) mostrarLegenda(p.nome, 'Não deu para carregar o panorama 360°.'); return; }
  if (atual !== p || modo !== 'tour') { tex.dispose(); return; }
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const geo = new THREE.SphereGeometry(50, 64, 32);
  geo.scale(-1, 1, 1);   // por dentro, sem espelhar
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  mesh.rotation.y = -Math.PI / 2;   // o centro da imagem é o +y do Blender (a câmera do panorama.py olha para +y)
  await gsap.to(corte, { v: 1, duration: 0.35 });
  cenaPano.add(mesh);
  pano = { mesh, tex };
  modo = '360';
  gsap.to(corte, { v: 0, duration: 0.6 });
  // carga progressiva: o 4K abre na hora; no desktop com GPU que aguenta, o 8K do Cycles entra quando chega
  if (cfg.pano8k && !TOQUE && renderer.capabilities.maxTextureSize >= 8192) {
    new THREE.TextureLoader().loadAsync(`pano/8k/${idPano}.webp`).then(t8 => {
      if (pano?.mesh !== mesh) { t8.dispose(); return; }
      t8.colorSpace = THREE.SRGBColorSpace; t8.anisotropy = tex.anisotropy;
      mesh.material.map = t8; mesh.material.needsUpdate = true;
      tex.dispose(); pano.tex = t8; pano.oito = true;
    }).catch(() => {});
  }
  document.body.classList.add('em-360');
  mostrarLegenda(p.nome, `Foto-realista 360° (render Cycles${idPano !== p.pano ? ', do ponto mais perto' : ''}) · arraste para olhar`);
  atualizarBotoes();
}
async function sair360() {   // com fade; o fechar360 (sem fade) serve à navegação
  if (!pano) return;
  await gsap.to(corte, { v: 1, duration: 0.3 });
  fechar360();
  gsap.to(corte, { v: 0, duration: 0.5 });
}
function fechar360() {
  if (!pano) return;
  cenaPano.remove(pano.mesh);
  pano.mesh.geometry.dispose(); pano.mesh.material.dispose(); pano.tex.dispose();
  pano = null; modo = 'tour';
  document.body.classList.remove('em-360');
  if (atual) mostrarLegenda(atual.nome, atual.texto);
  atualizarBotoes();
}

// ---------- interface
function montarMenu() {
  const ul = $('#menu ul');
  for (const p of cfg.paradas) {
    const li = document.createElement('li');
    li.innerHTML = `<button type="button" data-id="${p.id}"><img src="img/${NOME}/${p.img}.webp" alt="" loading="lazy" width="160" height="100"><span>${p.nome}</span></button>`;
    li.querySelector('button').addEventListener('click', e => { if (e.detail) e.currentTarget.blur(); pararAuto(); ir(p.id); });
    ul.append(li);
  }
}
function marcarMenu() {
  for (const b of document.querySelectorAll('#menu button')) {
    const sel = b.dataset.id === atual?.id;
    b.classList.toggle('atual', sel);
    b.setAttribute('aria-current', sel ? 'true' : 'false');
    if (sel) b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: REDUZIDO ? 'auto' : 'smooth' });
  }
}
function mostrarLegenda(nome, texto) {
  $('#legenda b').textContent = nome;
  $('#legenda span').textContent = texto || '';
  $('#legenda').classList.add('on');
}
const CURTO = matchMedia('(max-width: 720px)');   // celular: rótulos curtos, a barra cabe numa linha
CURTO.addEventListener?.('change', () => atualizarBotoes());
function atualizarBotoes() {
  const c = CURTO.matches;
  $('#b-auto').textContent = auto ? '❚❚ Pausar' : c ? '▶ Tour' : '▶ Tour automático';
  $('#b-auto').setAttribute('aria-pressed', auto ? 'true' : 'false');
  $('#b-livre').textContent = modo === 'livre' ? (c ? '← Tour' : '← Voltar ao tour') : c ? 'Andar' : 'Andar livre';
  $('#b-livre').setAttribute('aria-pressed', modo === 'livre' ? 'true' : 'false');
  const b360 = $('#b-360');
  b360.hidden = !(panoDe(atual) && (modo === 'tour' || modo === '360'));
  b360.textContent = modo === '360' ? (c ? '× Foto' : '← Voltar ao 3D') : c ? 'Foto 360°' : 'Ver foto-realista';
}
let ajudaTimer;
function ajuda(texto = TOQUE ? 'Toque nas marcas ou no menu para ir de cômodo em cômodo; arraste para olhar.'
  : 'Clique nas marcas ou no menu para ir de cômodo em cômodo; arraste para olhar; ← → trocam de cômodo.') {
  const el = $('#ajuda');
  el.textContent = texto;
  el.classList.add('on');
  clearTimeout(ajudaTimer);
  ajudaTimer = setTimeout(() => el.classList.remove('on'), 7000);
}

// marcas na cena: uma por parada, no chão; aparecem se o olho as enxerga (as caixas de colisão fazem de parede)
const marcas = [];
function criarMarcas() {
  for (const p of cfg.paradas) {
    if (p.visao) continue;
    const z = chao(p.cam[0], p.cam[1], p.cam[2] - 1.0) ?? p.cam[2] - 1.5;
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'marca';
    el.innerHTML = `<i></i><span>${p.nome}</span>`;
    el.setAttribute('aria-label', 'Ir para ' + p.nome);
    el.addEventListener('click', e => { e.stopPropagation(); pararAuto(); ir(p.id); });
    $('#marcas').append(el);
    marcas.push({ p, el, pos: [p.cam[0], p.cam[1], z + 0.9], v: new THREE.Vector3(), ver: false });
  }
}
let contaQuadro = 0;
function atualizarMarcas() {
  const w = innerWidth, h = innerHeight;
  const alto = vista.z > cfg.alturaTelhado, semTeto = tetoOp < 0.5;
  const checar = contaQuadro++ % 4 === 0;
  for (const m of marcas) {
    if (checar) {
      let ver = modo === 'tour' && !voo && m.p !== atual;
      if (ver) ver = alto ? (semTeto || m.p.externo)
        : Math.hypot(m.pos[0] - vista.x, m.pos[1] - vista.y) < 18 && desobstruido([vista.x, vista.y, vista.z], [m.pos[0], m.pos[1], m.pos[2] + 0.35]);
      m.ver = ver;
    }
    let mostra = m.ver;
    m.mostra = false;
    if (mostra) {
      m.v.set(m.pos[0], m.pos[2], -m.pos[1]).project(camera);
      mostra = m.v.z < 1 && Math.abs(m.v.x) < 1.05 && Math.abs(m.v.y) < 1.05;
    }
    m.d = Math.hypot(m.pos[0] - vista.x, m.pos[1] - vista.y, m.pos[2] - vista.z);
    m.sx = (m.v.x + 1) / 2 * w; m.sy = (1 - m.v.y) / 2 * h;
    m.mostra = mostra && m.d > 1.0;   // em cima do pé, a marca só atrapalha
  }
  // duas marcas quase no mesmo lugar da tela: fica a mais próxima (o flat tem paradas a 1 m uma da outra)
  const vis = marcas.filter(m => m.mostra).sort((a, b) => a.d - b.d);
  for (let i = 0; i < vis.length; i++)
    for (let j = 0; j < i; j++)
      if (vis[j].mostra && Math.abs(vis[i].sx - vis[j].sx) < 90 && Math.abs(vis[i].sy - vis[j].sy) < 44) { vis[i].mostra = false; break; }
  for (const m of marcas) {
    m.el.classList.toggle('on', !!m.mostra);
    if (m.mostra) m.el.style.transform = `translate3d(${m.sx.toFixed(1)}px, ${m.sy.toFixed(1)}px, 0) translate(-50%, -50%) scale(${clamp(6 / m.d, 0.7, 1.1).toFixed(2)})`;
  }
}

// ---------- entrada do visitante: arrastar olha; no andar livre, o dedo da esquerda é um joystick
const dedos = new Map();
const joy = $('#joystick');
canvas.addEventListener('pointerdown', e => {
  pararAuto(); pararTomada();
  if (modo === 'livre' && e.pointerType === 'mouse' && document.pointerLockElement !== canvas) { canvas.requestPointerLock?.(); return; }
  canvas.setPointerCapture?.(e.pointerId);
  const anda = modo === 'livre' && e.pointerType !== 'mouse' && e.clientX < innerWidth / 2;
  dedos.set(e.pointerId, { anda, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY });
  if (anda) { joy.style.left = e.clientX + 'px'; joy.style.top = e.clientY + 'px'; joy.classList.add('on'); }
});
canvas.addEventListener('pointermove', e => {
  if (document.pointerLockElement === canvas) { olhar(-e.movementX * 0.0022, -e.movementY * 0.0022); return; }
  const d = dedos.get(e.pointerId);
  if (!d) return;
  if (d.anda) {
    const r = 60;   // px de arrasto para a velocidade toda
    andar.f = clamp((d.y0 - e.clientY) / r, -1, 1);
    andar.l = clamp((d.x0 - e.clientX) / r, -1, 1);
    joy.style.setProperty('--dx', clamp(e.clientX - d.x0, -r, r) + 'px');
    joy.style.setProperty('--dy', clamp(e.clientY - d.y0, -r, r) + 'px');
  } else if (!voo) {
    const k = e.pointerType === 'mouse' ? 0.004 : 0.006;   // arrastar "pega" a cena, como no Street View
    olhar((e.clientX - d.x) * k, (e.clientY - d.y) * k);
  }
  d.x = e.clientX; d.y = e.clientY;
});
const soltar = e => {
  const d = dedos.get(e.pointerId);
  if (d?.anda) { andar.f = andar.l = 0; joy.classList.remove('on'); joy.style.setProperty('--dx', '0px'); joy.style.setProperty('--dy', '0px'); }
  dedos.delete(e.pointerId);
};
canvas.addEventListener('pointerup', soltar);
canvas.addEventListener('pointercancel', soltar);
addEventListener('keydown', e => {
  if (!pronto || e.altKey || e.ctrlKey || e.metaKey) return;
  if (modo === 'livre') {
    teclas.add(e.code);
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    if (e.code === 'Escape' && !document.pointerLockElement) ir(maisPerto());
    return;
  }
  if (e.target.closest?.('#menu') && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) return;
  if (e.code === 'ArrowRight') { pararAuto(); vizinha(1); }
  else if (e.code === 'ArrowLeft') { pararAuto(); vizinha(-1); }
  else if (e.code === 'Escape' && modo === '360') fechar360();
});
addEventListener('keyup', e => teclas.delete(e.code));
addEventListener('wheel', e => {
  if (!pronto || modo !== 'tour' || voo || performance.now() - pouso < 700 || Math.abs(e.deltaY) < 20) return;
  if (e.target.closest?.('#menu, #carga')) return;   // a roda no menu rola os cartões
  pararAuto();
  vizinha(e.deltaY > 0 ? 1 : -1);
}, { passive: true });
addEventListener('blur', () => teclas.clear());

$('#b-auto').addEventListener('click', () => (auto ? pararAuto() : tourAutomatico()));
// sair do andar livre volta para a parada mais perto de onde o visitante parou
const maisPerto = () => cfg.paradas.filter(p => !p.visao)
  .reduce((a, p) => (Math.hypot(p.cam[0] - vista.x, p.cam[1] - vista.y, p.cam[2] - vista.z) < Math.hypot(a.cam[0] - vista.x, a.cam[1] - vista.y, a.cam[2] - vista.z) ? p : a)).id;
$('#b-livre').addEventListener('click', () => (modo === 'livre' ? ir(maisPerto()) : entrarLivre()));
$('#b-360').addEventListener('click', () => (modo === '360' ? sair360() : abrir360()));
$('#b-planta').addEventListener('click', () => { pararAuto(); ir('planta'); });
$('#b-ant').addEventListener('click', () => { pararAuto(); vizinha(-1); });
$('#b-prox').addEventListener('click', () => { pararAuto(); vizinha(1); });
$('#b-comecar').addEventListener('click', comecar);

// ---------- laço de quadros
let quadros = 0, ultimo = performance.now(), lento = 0, prontoEm = Infinity, comodoLivre = '';
const capa = $('#carga');
const PR_MIN = TOQUE ? 0.75 : 0.75;
function quadro() {
  requestAnimationFrame(quadro);
  const agora = performance.now(), dt = Math.min((agora - ultimo) / 1000, 0.1);
  ultimo = agora;
  quadros++;
  // só mede com a cena parada: a carga (shaders, texturas) e o voo têm quadros lentos que não contam
  if (pronto && !voo && agora - pouso > 1500 && agora - prontoEm > 5000) lento = dt > 0.04 ? lento + dt : Math.max(0, lento - dt * 0.5);
  // quadro lento (mais de 40 ms) por 2 s: primeiro baixa a resolução, depois desliga a sombra do sol
  if (lento > 2 && renderer.getPixelRatio() > PR_MIN) {
    renderer.setPixelRatio(Math.max(PR_MIN, renderer.getPixelRatio() - 0.25));
    redimensionar();
    lento = 0;
  } else if (lento > 2 && sol.castShadow) { semSombra(); lento = 0; }
  else if (lento > 2 && mataRaiz?.visible) { mataRaiz.visible = false; vegetacao = 'desligada (GPU fraca)'; lento = 0; }   // 3º degrau: sem a mata
  if (voo) atualizarVoo(agora);
  else if (modo === 'livre') {
    abrirPortasPerto();
    for (let r = dt; r > 1e-6; r -= 0.05) mover(Math.min(r, 0.05));   // subpassos: não atravessa parede
    vista.x = andar.px; vista.y = andar.py;
    vista.z += (andar.pz + OLHO - vista.z) * Math.min(1, dt * 10);
    if (quadros % 15 === 0) { const c = ondeEstou(); if (c !== comodoLivre) { comodoLivre = c; mostrarLegenda(c, 'Andar livre'); } }
  }
  const alvoTeto = (voo ? voo.escondeTeto : modo === 'tour' && atual?.semTeto) ? 0 : 1;
  if (Math.abs(alvoTeto - tetoOp) > 0.003) {
    tetoOp += (alvoTeto - tetoOp) * Math.min(1, dt * 5);
    if (Math.abs(alvoTeto - tetoOp) < 0.01) tetoOp = alvoTeto;
    aplicarTetos(tetoOp);
  }
  if (quadros % 6 === 0) acenderPerto(dt * 6);
  $('#veu').style.opacity = Math.max(veu, corte.v).toFixed(3);
  if (!pronto || !capa.classList.contains('fora')) { /* a capa cobre a cena: não desenha */ }
  else if (modo === '360') {
    if (!dedos.size && !REDUZIDO) vista.yaw += dt * 0.035;   // a foto 360 gira devagar sozinha até o visitante arrastar
    orientar(cameraPano, false); renderer.render(cenaPano, cameraPano);
  }
  else {
    ajustarFov(camera, vista.fov);
    renderer.toneMappingExposure = L.exposicao * 2 ** vista.ev;
    orientar(camera, true);
    renderer.render(cena, camera);
  }
  atualizarMarcas();
}

// interface para o teste automatizado (Playwright) e para depurar no console
window.__site = {
  get pronto() { return pronto; }, get modo() { return modo; }, get parada() { return atual?.id ?? null; }, get voando() { return !!voo; },
  get assados() { return assados; }, get pano8k() { return !!pano?.oito; }, get emTomada() { return !!tomadaTl; }, get vegetacao() { return vegetacao; },
  get carregando360() { return $('#b-360').hasAttribute('aria-busy'); }, get resolucao() { return renderer.getPixelRatio(); }, get sombra() { return sol.castShadow; },
  paradas: cfg.paradas.map(p => p.id), erros,
  ir: id => ir(id), comecar, livre: entrarLivre, abrir360, fechar360, tourAutomatico, pararAuto,
  andar: (f, l) => { andar.f = f; andar.l = l; }, onde: ondeEstou,
  // teste do andar livre: põe o visitante num ponto (chão mais alto até z) e vira para um rumo (graus, 0 = +x)
  teleporte: (x, y, graus, z = 99) => { andar.px = x; andar.py = y; andar.pz = chao(x, y, z) ?? 0; vista.yaw = graus * Math.PI / 180; vista.x = x; vista.y = y; vista.z = andar.pz + OLHO; },
  virar: graus => { vista.yaw = graus * Math.PI / 180; }, pe: () => [andar.px, andar.py, andar.pz],
  vista: () => { const { x, y, z, yaw, pitch, fov, ev } = vista; return { x, y, z, yaw, pitch, fov, ev }; }, desenho: () => ({ ...renderer.info.render }),
  fps: (ms = 3000) => new Promise(r => { const n0 = quadros, t0 = performance.now(); setTimeout(() => r(+((quadros - n0) * 1000 / (performance.now() - t0)).toFixed(1)), ms); }),
};

// ---------- carga: pôster na hora, colisão (leve) e o modelo com a barra de progresso
montarMenu();
const POR_TRAS = ['.cabeca', '#ferramentas', '.seta', '#menu', '#marcas'];
const inerte = sim => POR_TRAS.forEach(q => document.querySelectorAll(q).forEach(el => (el.inert = sim)));
inerte(true);
new MutationObserver(() => { if ($('#carga').classList.contains('fora')) inerte(false); })
  .observe($('#carga'), { attributes: true, attributeFilter: ['class'] });
Object.assign(vista, vistaDe(paradas.get(cfg.inicio)));
quadro();
const barra = $('#barra i'), status = $('#status');
const mb = n => (n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
try {
  Object.assign(col, await (await fetch(cfg.colisao)).json());
  col.pisos ||= []; col.terreno ||= null;
  col.caixas = col.caixas.filter(b => !(b[5] - b[2] < 0.1 && b[5] < 0.6));
} catch { status.textContent = 'Sem o arquivo de colisão: o andar livre fica desligado.'; $('#b-livre').hidden = true; }
// luz assada no Cycles (assar_luz.py do flats-3d): com o luz.json, carrega o glb com a segunda UV ("luz") e troca o
// material dos objetos assados por um sem luz dinâmica: cor = albedo x lightmap. ?luz=0 desliga e volta à luz em tempo real.
const luzAssada = cfg.luzAssada && new URLSearchParams(location.search).get('luz') !== '0'
  ? await fetch(cfg.luzAssada.pasta + 'luz.json').then(r => (r.ok ? r.json() : null)).catch(() => null) : null;
let assados = 0, vegetacao = 'sem', mataRaiz = null;
// carga progressiva: a vegetação (coleção Paisagismo, glb à parte) chega depois da casa, sem segurar a entrada
function carregarVegetacao() {
  // celular: a mata (milhões de triângulos) fica de fora; ?mata=0 desliga, ?mata=1 força
  const pedido = new URLSearchParams(location.search).get('mata');
  if (!cfg.vegetacao || pedido === '0' || (TOQUE && pedido !== '1')) return;
  vegetacao = 'carregando';
  new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(cfg.vegetacao, v => {
    v.scene.traverse(o => {
      if (!o.isMesh) return;
      // as árvores projetam sombra, recortada pelo alfa das folhas (customDepthMaterial)
      o.castShadow = !!SOMBRA;
      o.receiveShadow = !!SOMBRA;
      const mf = [].concat(o.material)[0];
      if (SOMBRA && mf.map && mf.alphaTest > 0) o.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: mf.map, alphaTest: mf.alphaTest });
      for (const m of [].concat(o.material)) {
        if (m.map) {
          m.map.anisotropy = 4;
          if (m.transparent && /leaves|folha/.test(m.name)) { m.transparent = false; m.alphaTest = 0.5; m.depthWrite = true; }
          if (/leaves|folha|calathea|grass/.test(m.name) && !m.userData.escura) { m.color.multiplyScalar(0.6); m.envMapIntensity = 0.3; m.userData.escura = true; }   // copas densas e escuras como no Cycles
        }
        // folhas procedurais achatadas para cor lisa: no Cycles brilham pela translucidez; aqui ganham cor e as duas faces
        else if (/folha|capim|grama/.test(m.name) && !m.userData.clareada) { m.color.multiplyScalar(1.15); m.side = THREE.DoubleSide; m.envMapIntensity = 0.3; m.userData.clareada = true; }
      }
    });
    cena.add(v.scene);
    mataRaiz = v.scene;
    lento = 0; prontoEm = performance.now();   // mede de novo, já com a mata
    v.scene.updateMatrixWorld(true);
    v.scene.traverse(o => { o.matrixAutoUpdate = false; });
    renderer.shadowMap.needsUpdate = true;
    vegetacao = 'pronta';
  }, undefined, () => { vegetacao = 'falhou'; });
}
function aplicarLuzAssada(raiz) {
  const trocados = new Map();
  for (const [nome, gr] of Object.entries(luzAssada.grupos)) {
    if (cfg.luzAssada.grupos && !cfg.luzAssada.grupos.includes(nome)) continue;   // grupos com bake ruim ficam dinâmicos
    const t = new THREE.TextureLoader().load(cfg.luzAssada.pasta + gr.imagem.replace(/\.png$/, '.webp'));
    t.channel = 1; t.colorSpace = THREE.SRGBColorSpace; t.flipY = false;
    t.userData.url = cfg.luzAssada.pasta + gr.imagem.replace('.png', '.webp');
    // imóvel sem textura (o flat): a UV de luz é a única UV do glb, então o lightmap lê o canal 0
    let t0 = null;
    const canal0 = () => (t0 ??= Object.assign(new THREE.TextureLoader().load(t.userData.url), { channel: 0, colorSpace: THREE.SRGBColorSpace, flipY: false }));
    for (const ob of gr.objetos) {
      raiz.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(ob))?.traverse(m => {
        if (!m.isMesh || Array.isArray(m.material) || luzAssada.dinamicos.includes(m.material.name)) return;
        // metal e espelho: o bake difuso sai preto; ficam com a luz dinâmica e os reflexos do ambiente
        if ((m.material.metalness ?? 0) > 0.5 || (m.material.roughness ?? 1) < 0.12) return;
        const uv1 = !!m.geometry.attributes.uv1, uv0 = !!m.geometry.attributes.uv && !m.material.map;
        if (!uv1 && !uv0) return;
        const lm = uv1 ? t : canal0();
        const chave = m.material.uuid + nome + (uv1 ? 1 : 0);   // um material por (material, atlas, canal)
        if (!trocados.has(chave)) trocados.set(chave, new THREE.MeshBasicMaterial({
          name: m.material.name, color: m.material.color, map: m.material.map, side: m.material.side,
          transparent: m.material.transparent, opacity: m.material.opacity,
          lightMap: lm, lightMapIntensity: Math.PI * gr.escala * (cfg.luzAssada.ganho ?? 1) }));
        m.material = trocados.get(chave);
        assados++;
      });
    }
  }
}
new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(luzAssada ? cfg.luzAssada.glb : cfg.glb, g => {
  modelo = g.scene;
  if (luzAssada) {
    aplicarLuzAssada(g.scene);
    sol.castShadow = false;   // o sol e as sombras já estão no lightmap
  }
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy()), vistos = new Set();
  g.scene.traverse(o => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (!m.transparent && m.opacity < 1) m.transparent = true;
      if (vistos.has(m)) continue;
      vistos.add(m);
      // texturas vistas de lado (piso, forro, ladrilho) não borram
      for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap']) if (m[k]) m[k].anisotropy = aniso;
      // o KHR_materials_sheen do glb vem com a cor branca e esbranquiça os tecidos: o brilho fica da cor do pano
      if (m.sheen > 0 && m.sheenColor) m.sheenColor.copy(m.color).multiplyScalar(0.6);
      // a água com transmissão obrigava o three a desenhar a cena opaca de novo (8 das 15 paradas): vira transparência comum
      if (m.transmission > 0) { m.transmission = 0; m.transparent = true; m.opacity = Math.min(m.opacity, 0.72); m.depthWrite = false; }
      // vidro transparente de dupla face: uma passada só
      if (m.transparent && m.side === THREE.DoubleSide) m.forceSinglePass = true;
      // fitas de LED, spots e balizadores: sem bloom, o emissivo mais forte é o que faz a luz parecer acesa
      if (m.emissive && m.emissive.r + m.emissive.g + m.emissive.b > 0.05) m.emissiveIntensity *= 2.5;
    }
    if (cfg.tetos.test(o.name) || cfg.tetos.test(o.parent?.name || '')) {
      o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone();
      tetos.push(o);
    }
  });
  for (const [nome, rgb] of Object.entries(cfg.tingir || {})) {
    const copias = new Map();   // uma cópia por material, para as malhas continuarem juntáveis
    g.scene.traverse(o => {
      if (!o.isMesh || !(o.name.startsWith(nome) || o.parent?.name?.startsWith(nome))) return;
      if (!copias.has(o.material)) { const c = o.material.clone(); c.color.multiply(new THREE.Color().setRGB(...rgb, THREE.LinearSRGBColorSpace)); copias.set(o.material, c); }
      o.material = copias.get(o.material);
    });
  }
  // o ripado: o fundo escuro fica 0,1 mm atrás das ripas e ganhava no depth buffer
  const fundoRipado = new Map();
  g.scene.traverse(o => {
    if (o.isMesh && /^ripado/.test(o.parent?.name || o.name) && o.material?.name === 'madeira_escura') {
      if (!fundoRipado.has(o.material)) fundoRipado.set(o.material, Object.assign(o.material.clone(), { polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 8 }));
      o.material = fundoRipado.get(o.material);
    }
  });
  // painéis de luz que viram parede branca sem o bloom (o cobogó da suíte): material próprio, mais fraco
  for (const [nome, k] of Object.entries(cfg.atenuar || {})) {
    const o = g.scene.getObjectByName(nome);
    if (o?.material) { o.material = o.material.clone(); o.material.emissiveIntensity *= k; }
  }
  cena.add(g.scene);
  cena.updateMatrixWorld(true);
  // sombra: todo mundo recebe; só o que é grande projeta (paredes, lajes, telhado, móveis grandes), para poupar a GPU
  if (SOMBRA && !luzAssada) g.scene.traverse(o => {
    if (!o.isMesh) return;
    o.receiveShadow = true;
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    const vidro = [].concat(o.material).some(m => m.transparent || m.transmission > 0);
    o.castShadow = !vidro && !/^terreno/.test(o.name) && o.geometry.boundingSphere.radius * o.matrixWorld.getMaxScaleOnAxis() > 0.35;
  });
  if (new URLSearchParams(location.search).get('juntar') !== '0') {
    const nomesOcultos = new Set(cfg.paradas.flatMap(p => p.ocultar || []));
    const folhas = new Set((col.portas || []).map(pt => THREE.PropertyBinding.sanitizeNodeName(pt.nome)));
    const manter = o => tetos.includes(o) || nomesOcultos.has(o.name) || nomesOcultos.has(o.parent?.name)
      || folhas.has(o.name) || folhas.has(o.parent?.name);
    window.__juntou = juntarMalhas(g.scene, manter);
  }
  g.scene.traverse(o => { o.matrixAutoUpdate = false; });   // o imóvel não se mexe: poupa CPU a cada quadro
  prepararPortas(g.scene);
  renderer.shadowMap.needsUpdate = true;
  criarMarcas();
  pronto = true;
  prontoEm = performance.now();
  setTimeout(carregarVegetacao, 400);
  barra.style.width = '100%';
  let hash = '';
  try { hash = decodeURIComponent(location.hash.slice(1)); } catch { /* link estragado: abre pelo pôster */ }
  if (paradas.has(hash)) {
    $('#carga').classList.add('fora');
    ir(hash, { instantaneo: true });
    ajuda();
  } else if (hash === 'livre') {
    $('#carga').classList.add('fora');
    ir(cfg.inicio, { instantaneo: true }).then(entrarLivre);
  } else {
    ir(cfg.inicio, { instantaneo: true });
    status.textContent = 'Preparando a cena…';
    // compila os shaders antes de liberar a entrada: o primeiro voo não engasga
    renderer.compileAsync(cena, camera).catch(() => {}).finally(() => {
      status.textContent = 'Pronto.';
      $('#b-comecar').hidden = false;
      $('#b-comecar').focus({ preventScroll: true });
    });
  }
}, x => {
  if (x.total) { barra.style.width = (100 * x.loaded / x.total).toFixed(0) + '%'; status.textContent = `Carregando o modelo 3D · ${mb(x.loaded)} de ${mb(x.total)} MB`; }
  else status.textContent = `Carregando o modelo 3D · ${mb(x.loaded)} MB`;
}, err => { status.textContent = 'Não deu para carregar o modelo 3D: ' + (err?.message || err); erros.push(String(err?.message || err)); });
