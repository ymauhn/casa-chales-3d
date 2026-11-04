# Referências: navegação 3D por cômodo

Pesquisa de 03/11/2026 para o site-3d (flats e casa dos chalés). O objetivo é saber como os sites bons levam o visitante de um lugar a outro (scroll, clique, hotspot, menu, minimapa, andar livre) e o que dá para copiar, em three.js puro, que é a stack do `package.json` (three 0.187, Vite, @gltf-transform/cli 4.5.1).

**Como ler a coluna "Conferido":** "sim" quer dizer que abri a página ou uma fonte primária (docs, código-fonte, estudo de caso escrito pela equipe). Quando um detalhe veio só de trecho de busca ou de fonte secundária, ele está marcado como "(não conferido)". Nenhum número de desempenho foi medido aqui: FPS e tempo de carga ficam "em medição" no teste do site.

## Tabela

| # | Site | URL | Como navega | O que copiar | Stack | Conferido |
|---|---|---|---|---|---|---|
| 1 | Matterport Showcase SDK | https://matterport.github.io/showcase-sdk/docs/reference/current/modules/mode.html | Dentro do imóvel, o visitante pula de ponto em ponto com `Sweep.moveTo(sweep, {rotation, transition, transitionTime})`, com o tempo em ms. A vista inteira muda com `Mode.moveTo(mode, {position, rotation, transition, zoom})`, que devolve uma Promise; a doc mostra `Mode.Mode.FLOORPLAN` (planta) e o `zoom` só vale nela. A lista completa de modos fica numa página que não abri. Transições: FLY (interpola), FADEOUT (escurece e move), INSTANT. | Separar a vista de planta da vista de dentro, com troca animada entre elas. Dois tipos de transição: voar quando o caminho é livre e escurecer quando a reta atravessaria parede. Tempo de transição como parâmetro. | Proprietário (WebGL); SDK em JS. | sim (docs de Mode e Sweep) |
| 2 | Shapespark | https://shapespark.com/ | Passeio WebGL com andar livre e um menu "Views": o visitante clica no nome e a câmera vai até lá. Há três tipos de vista: primeira pessoa (interiores), de cima (planta) e órbita (exteriores). A primeira vista é a câmera de entrada. Com "Automatic tour" ligado, aparece um botão que percorre todas as vistas. Luz pré-calculada (bake) no editor. | É quase o nosso pedido: menu de cômodos com nome, órbita na fachada, vista de cima como planta, primeira pessoa dentro e botão "tour automático". A luz pré-calculada é o que deixa leve no celular. | Motor próprio (HTML5 + WebGL), editor com bake. | sim (página inicial). O texto das Views veio da central de ajuda pela busca; a página deu 403. |
| 3 | Sketchfab (anotações + Viewer API) | https://sketchfab.com/developers/viewer/functions | Cada anotação guarda a própria posição e o próprio alvo de câmera. J/K ou PageUp/PageDown vão para a anotação anterior ou seguinte, e o "Autopilot" percorre todas. Dois modos de navegação: órbita (padrão) e primeira pessoa (WASD ou setas, arrastar para olhar, roda para a velocidade). Duplo clique define o pivô. API: `gotoAnnotation(index, {preventCameraAnimation, preventCameraMove})`, `setCameraLookAt(position, target, duration)` (padrão de 2 s) e os eventos `annotationSelect`, `camerastart` e `camerastop`. | Hotspot = par (posição, alvo) com título e texto. Atalhos de anterior/seguinte no teclado, modo "piloto automático" e um botão para alternar órbita/primeira pessoa. | Visualizador proprietário (WebGL). | sim (docs da API e 2 artigos da central de ajuda) |
| 4 | Google `<model-viewer>`, exemplo "Camera Views" | https://modelviewer.dev/examples/annotations/ | O hotspot é um `<button slot="hotspot-N" data-position data-normal data-orbit data-target>`. No clique, `modelViewer.cameraTarget = dataset.target` e `modelViewer.cameraOrbit = dataset.orbit`. A suavidade vem de `interpolation-decay="200"`. O hotspot esmaece quando a normal aponta para longe da câmera (`--min-hotspot-opacity`) e há um evento `hotspot-visibility`. | Guardar os dados da câmera no próprio botão do hotspot. Esconder o hotspot que está de costas para a câmera. O exemplo "Show Dimensions" mostra medidas na tela, útil para mostrar a medida do cômodo. | Web component sobre three.js. | sim (página e código-fonte do exemplo) |
| 5 | Photo Sphere Viewer (VirtualTourPlugin + Map/Plan) | https://photo-sphere-viewer.js.org/plugins/virtual-tour.html | Tour de panoramas 360 montado como um grafo de nós (`id`, `panorama`, `links[{nodeId, position}]`), com setas em 3D. `setCurrentNode(id, options)`, `transitionOptions` (padrão `{ showLoader: true, speed: '20rpm', effect: 'fade', rotation: true }`), `preload` para pré-carregar os vizinhos e o evento `node-changed`. Minimapa pelo MapPlugin (imagem com hotspots e evento `select-hotspot`) ou pelo PlanPlugin (Leaflet). | Os panoramas em `saida/` do flats-3d podem virar um "modo leve" para celular fraco, com setas entre cômodos e a planta como minimapa. A ideia de pré-carregar o cômodo vizinho também serve para o 3D. | Biblioteca JS sobre three.js. | sim (docs dos plugins Virtual Tour e Plan) |
| 6 | three.js: `misc_controls_pointerlock` e `games_fps` | https://threejs.org/examples/#misc_controls_pointerlock | Pointerlock: o clique na sobreposição trava o mouse, WASD e setas andam e Esc devolve a sobreposição. O amortecimento é `velocity.x -= velocity.x * 10.0 * delta`, a aceleração `400.0 * delta`, e o movimento sai de `controls.moveRight/moveForward`. games_fps: `worldOctree.fromGraphNode(gltf.scene)`, o jogador é um `Capsule(start, end, 0.35)`, `capsuleIntersect` empurra para fora da parede, o chão é detectado por `normal.y >= 0.15` e há subpassos por quadro (`STEPS_PER_FRAME`). | O "andar livre" de computador: sobreposição "clique para andar", Esc volta ao tour guiado. Colisão de verdade com parede sem motor de física (Octree + Capsule) e `OctreeHelper` para depurar. | three.js e addons (PointerLockControls, Octree, Capsule). | sim (código dos dois exemplos) |
| 7 | camera-controls (yomotsu) | https://github.com/yomotsu/camera-controls | Biblioteca de câmera com transição suave: `setLookAt(px,py,pz, tx,ty,tz, true)` devolve uma Promise que dá para encadear com `await`. Também tem `fitToBox(mesh, true, {paddingTop...})`, `smoothTime` (padrão 0,25 s), `setBoundary(box3)`, `colliderMeshes` (o README avisa que pode pesar), `update(delta)`, que devolve `true` quando precisa redesenhar, e os eventos `rest`, `sleep`, `controlstart` e `controlend`. Exemplos prontos: first-person, pointer-lock, collision, path-animation (gsap + CatmullRomCurve3) e await-transitions. | É a base do clique em hotspot ou menu que leva a câmera ao cômodo: um `setLookAt` por cômodo. `setBoundary` e `colliderMeshes` impedem a órbita de atravessar parede. O exemplo first-person serve de "olhar em volta" no mesmo controle. | three.js; no R3F, pelo drei. | sim (README e código de 3 exemplos) |
| 8 | drei (pmndrs): CameraControls, Html, ScrollControls, PerformanceMonitor | https://drei.docs.pmnd.rs/controls/camera-controls | Envelopes do R3F: `<CameraControls makeDefault>` (eventos onRest, onSleep e onTransitionStart), `<Html occlude>` para hotspot em DOM que some atrás da parede, `<ScrollControls pages damping>` com `useScroll().offset/range()/curve()` para o scroll levar a câmera e `<PerformanceMonitor onIncline onDecline>` para ajustar o dpr. | Se um dia o site virar React: hotspot com `<Html occlude center>`, uma faixa de scroll por cômodo com `range()` e dpr adaptativo no celular. Em three.js puro, copiar as ideias (oclusão e dpr adaptativo). | React + react-three-fiber + three.js. | sim (4 páginas da doc) |
| 9 | Bruno Simon, portfólio 2025 | https://bruno-simon.com/ | Mundo livre dirigido de carro. No teclado, WASD ou setas e **M abre o mapa**; no toque, um dedo move o carro e dois dedos movem ou dão zoom na câmera; também aceita gamepad. As seções são lugares do mundo. Desempenho: instancing, frustum culling, geometria fundida com textura-paleta, KTX2 ETC1S/UASTC, Draco (quantização) e, no celular, um preset de qualidade menor (sem desfoque da água, sem profundidade de campo, mapa de sombra menor). Convenção de nomes no Blender marca o que é colisão, ponto de renascer e limite. | O preset de qualidade para celular. O mapa numa tecla só. Marcar no Blender, por nome, o que é colisão e o que é ponto de câmera, em vez de configurar à mão no código. | three.js com TSL (WebGPU quando há, WebGL), Rapier (física), Howler.js, Blender. | sim (créditos no site e estudo de caso dele na Awwwards) |
| 10 | Igloo Inc (Bureaux), Site do Ano da Awwwards 2024 | https://awwwards.com/igloo-inc-case-study.html | Landing de 3 seções em que o scroll leva a câmera por uma cena 3D (cada projeto é um bloco de gelo). As cenas se trocam com efeito de shader (aberração cromática, deslocamento, geada). A interface é em WebGL. Texturas e compilação de shader são feitas em etapas: parte na carga inicial e parte em segundo plano. | O scroll como trilho do tour guiado, com uma transição de efeito ou um fade entre cômodos. Compilar os shaders antes de mostrar a cena (`renderer.compileAsync`) e carregar o resto em segundo plano. | three.js, three-mesh-bvh, Svelte, GSAP, Vite. | sim (estudo de caso da equipe; o site em si não abri) |
| 11 | Needle Engine (samples) | https://engine.needle.tools/samples/ | Exemplos prontos: "Splines Scroll Example" (câmera numa spline guiada pelo scroll), "Hotspots" (HotspotBehaviour/HotspotManager + OrbitControls), "3D Interior with See-Through Walls" (apaga o que fica entre a câmera e o alvo, para ver o interior de fora), "First Person" com toque, "Multiple Scenes" (carrega só a cena necessária) e "Progressive Mesh and Textures". A lib `@needle-tools/gltf-progressive` (MIT) entra no GLTFLoader por `useNeedleProgressive(loader, renderer)`. | Parede transparente quando a câmera está do lado de fora (efeito casa de boneca). Uma página carrega só o seu modelo. A carga progressiva por LOD existe pronta, mas os LODs saem do Needle Cloud (serviço externo, fora deste projeto). | Needle Engine (sobre three.js), integrações com Unity e Blender. | sim (lista de samples, 2 páginas de sample e README do gltf-progressive) |
| 12 | PlayCanvas CameraControls (órbita + voo) | https://developer.playcanvas.com/user-manual/graphics/cameras/camera-controls/ | Um script só com dois modos: órbita (arrastar gira em volta do `focusPoint`, botão direito desloca, roda dá zoom) e voo (WASD + mouse para olhar). Toque multitoque e gamepad vêm prontos. Amortecimento por `rotateDamping`, `moveDamping`, `zoomDamping` e `focusDamping` (0,98), com limites em `pitchRange` e `zoomRange`. Pela busca, o código-fonte emite `joystick:left` e `joystick:right` no modo voo no celular (não conferido). | Um controle com dois modos e um botão para trocar: "olhar o cômodo" (órbita) e "andar" (voo). Os amortecimentos como botões de calibragem. | Motor PlayCanvas (WebGL2/WebGPU). | sim (manual) |
| 13 | ERA (Moscou), site de incorporadora | https://era.estate/ | Site de um condomínio residencial com mapa 3D interativo do bairro (WebGL), seleção visual de apartamentos (`/visual-search`), seleção por critérios (`/flats`), tour virtual (`/3d-tour`) e panorama. A abertura mostra silhuetas 3D dos prédios. Ganhou Site do Dia na Awwwards (com Developer Award), na CSSDA e na FWA. | Duas portas lado a lado: a visual (3D) e a por lista. Sempre oferecer a lista ou o menu de cômodos como alternativa ao 3D. O prédio ou a fachada como entrada que leva à unidade. | WebGL (a biblioteca não é dita). | sim (site e estudo de caso da agência Vide Infra) |
| 14 | Three.js Journey (lições) | https://threejs-journey.com/lessons | Não existe lição "virtual tour" (conferi a lista de 66 lições). As mais próximas são a 48 "Mixing HTML and WebGL" (pontos de interesse em HTML presos a uma posição 3D; o rótulo vai de `scale(0)` a `scale(1)` com a classe `visible`, e o texto aparece no hover com `transition: opacity 0.3s`), a 47 "Intro and loading progress", a 19 "Scroll based animation" e as 49 a 52 (cena no Blender, bake, exportar e otimizar). | O hotspot em HTML que só aparece depois da carga e quando está visível. A tela de carga com progresso. O roteiro Blender > bake > GLB otimizado. | three.js (curso pago; só a parte grátis foi lida). | sim (lista de lições e parte grátis da lição 48) |

### Também olhados (sem linha própria)

- **Lusion** (https://lusion.co/): abri a página. Ela pede "scroll to explore" e tem uma lista de projetos, mas não achei fonte primária sobre como a câmera anda. Fora da tabela por isso.
- **Spline**, Scroll Event (https://docs.spline.design/interaction-states-events-and-actions/events/scroll-event): estados mais uma ação de transição. O tipo "Steps" passa de um estado a outro conforme a quantidade de scroll; o tipo "Scroll" segue o scroll da página e só funciona no export Viewer. "Start At" e "End After" são em px. A ideia (um estado de câmera por cômodo) já está coberta pelas linhas 7, 8 e 10. A página de "Game Controls" não abri.
- **3D Estate** (https://3destate.pl/en/about-us): vende "3D Twins" e tours de apartamento para incorporadoras. A página não descreve a navegação.

## Padrões técnicos concretos (three.js puro, como no package.json)

### 1. Câmera de cômodo em cômodo (clique no hotspot ou no menu)

Dependência sugerida: `camera-controls` (MIT). Ela já traz transição suave, Promise, limites e colisão de órbita. O GSAP é opcional: um tween próprio de poucas linhas resolve a rota.

```js
import * as THREE from 'three';
import CameraControls from 'camera-controls';
CameraControls.install({ THREE });

const controls = new CameraControls(camera, renderer.domElement);
// smoothTime padrão do README = 0.25 s; calibrar no teste (maior = mais cinematográfico)

const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
async function irPara(c) {            // c = { pos: [x,y,z], alvo: [x,y,z] }, vindo do Blender
  await controls.setLookAt(...c.pos, ...c.alvo, !reduz); // sem transição se o visitante pediu menos movimento
}

// loop: só redesenha quando a câmera mexe (economiza bateria no celular)
const dt = clock.getDelta();
if (controls.update(dt) || precisaRedesenhar) renderer.render(scene, camera);
```

- `fitToBox(meshDoComodo, true, { paddingTop, paddingBottom, ... })` enquadra o cômodo inteiro sem calcular a posição à mão.
- `setBoundary(box3DoComodo)` prende o alvo dentro do cômodo enquanto o visitante orbita.
- `colliderMeshes = [paredes]` impede a câmera de atravessar a parede na órbita. O README avisa que pode pesar: use só as paredes, não a casa inteira.

### 2. Rota pela porta, sem atravessar parede

A interpolação reta entre dois cômodos atravessa a parede. Há duas saídas: passar pela porta ou escurecer a tela (como o FADEOUT do Matterport).

```js
const rota = new THREE.CatmullRomCurve3([pFachada, pPorta, pHall, pSala]); // 'centripetal' por padrão
const p = new THREE.Vector3(); const prog = { t: 0 };
controls.enabled = false;
gsap.fromTo(prog, { t: 0 }, { t: 1, duration: 3,
  onUpdate() { rota.getPointAt(prog.t, p);   // getPointAt = velocidade uniforme ao longo da curva
               controls.setLookAt(p.x, p.y, p.z, alvo.x, alvo.y, alvo.z, false); }, // false: quem manda é o tween
  onComplete() { controls.enabled = true; } });
```

Esse é o padrão do exemplo `path-animation` do camera-controls, que usa `curve.getPoint(value)` e `setLookAt(..., false)` dentro do `onUpdate`. A duração de 3 s é a do exemplo; calibrar no teste.

### 3. Entrada pela fachada e vista de casa de boneca

- Comece em órbita do lado de fora (como a vista de órbita do Shapespark, feita para exteriores). O botão "Entrar" roda a rota do item 2 até a porta.
- Para ver o interior de fora, esconda o telhado e o forro (`telhado.visible = false`) ou use um plano de corte: `renderer.localClippingEnabled = true` e `material.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, -1, 0), alturaDoCorte)]`. A alternativa pronta é o see-through da Needle.

### 4. Hotspots clicáveis

```js
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
const rotulos = new CSS2DRenderer();
rotulos.setSize(innerWidth, innerHeight);
rotulos.domElement.style.position = 'absolute';
rotulos.domElement.style.top = '0px';
rotulos.domElement.style.pointerEvents = 'none';   // a camada não rouba o arrasto da câmera
document.body.appendChild(rotulos.domElement);

const b = Object.assign(document.createElement('button'), { textContent: 'Cozinha' });
b.style.pointerEvents = 'auto';
b.onclick = () => irPara(comodos.cozinha);
const hs = new CSS2DObject(b); hs.position.copy(pontoNaPorta); scene.add(hs);
// no loop: rotulos.render(scene, camera);
```

- O hotspot é um `<button>` de verdade, então funciona com Tab e Enter e o leitor de tela o anuncia.
- Para esconder o que está atrás da parede, faça um raio da câmera até o hotspot: se a primeira batida vier antes dele, `hs.visible = false`. É o que o `<Html occlude>` do drei faz. Como no model-viewer, também dá para esconder pela normal (o hotspot de costas para a câmera esmaece).
- Os dados de cada parada (posição, alvo, nome) ficam num só registro, como o `data-orbit`/`data-target` do model-viewer ou a anotação do Sketchfab.

### 5. Menu de cômodos e minimapa no mesmo registro

- Um array `paradas = [{ id, nome, pos, alvo, poligonoNaPlanta }]` alimenta o menu, os hotspots, o minimapa e os botões anterior/seguinte. A skill `3d-virtual-tour` do MengTo dá a mesma regra: lista, planta e trilho de capítulos dividem um só registro de paradas.
- O minimapa é uma planta em SVG ou PNG (render de cima, com câmera ortográfica no Blender). O ponto do visitante vem de uma transformação linear do (x, z) do mundo para o (u, v) da planta. Clicar num cômodo chama o mesmo `irPara`. O Bruno Simon abre o mapa com a tecla M.
- Ofereça teclado para anterior/seguinte (o Sketchfab usa J/K e PageUp/PageDown) e um "tour automático" que percorre as paradas (o Shapespark tem "Automatic tour" e o Sketchfab tem "Autopilot").

### 6. Scroll que leva a câmera (opcional)

- GSAP ScrollTrigger: uma timeline com um label por cômodo e `scrollTrigger: { scrub: 1, snap: { snapTo: 'labels' } }`. Com `scrub` numérico, a câmera leva esse tanto de segundos para "alcançar" o scroll, e `snapTo: 'labels'` para no cômodo mais próximo. `ScrollTrigger.normalizeScroll(true)` segura a barra de endereço do celular.
- No R3F, o equivalente é `useScroll().range(inicio, tamanho)` dentro do `<ScrollControls pages damping>`.

### 7. Andar livre no computador

- Use `PointerLockControls(camera, document.body)`. `controls.lock()` precisa sair de um clique do visitante, e o evento `unlock` (Esc) devolve o tour guiado. Os valores do exemplo oficial são um bom ponto de partida: amortecimento `velocity -= velocity * 10.0 * delta`, aceleração `400.0 * delta` e `moveRight`/`moveForward(-velocity * delta)`.
- Outra saída é o camera-controls em modo primeira pessoa (exemplo `first-person`): `minDistance = maxDistance = 1`, `azimuthRotateSpeed = polarRotateSpeed = -0.3` e `camera.position.set(0, 0, EPS)`. Assim o tour e o andar livre usam o mesmo controle.
- A altura do olho é uma constante a calibrar contra a escala do modelo.

### 8. Andar livre no celular

- Pointer Lock não serve para toque. Coloque um joystick fixo com o nipplejs (MIT): `nipplejs.create({ zone, mode: 'static', position: { left: '60px', bottom: '60px' } })`. No evento `move`, use `data.vector.x/y` (vetor unitário) e `data.force`; no `end`, pare. Arrastar o outro lado da tela gira a câmera. O contêiner precisa ter `position` definido.
- Mais simples e mais seguro: "tocar para ir". Faça um raio só contra os pisos (`raycaster.intersectObjects(pisos)`) e chame `setLookAt` com o ponto tocado na altura do olho. Como o raio só acerta piso, a colisão sai de graça.
- Ponha `touch-action: none` no canvas para o gesto não rolar a página (o exemplo do model-viewer usa `touch-action="none"`).

### 9. Colisão, do mais simples ao completo

1. **Caixas:** um `Box3` por cômodo e por porta (a área andável). A cada passo, só aceite a nova posição se ela cair dentro de alguma caixa. São poucas linhas e servem bem para um flat.
2. **Órbita:** `colliderMeshes` do camera-controls, só com as paredes.
3. **Completa:** `Octree.fromGraphNode(malhaDeColisao)` + `Capsule` + `capsuleIntersect`, como no `games_fps`. Para malha pesada, use o three-mesh-bvh (`computeBoundsTree`, `Mesh.prototype.raycast = acceleratedRaycast`, `raycaster.firstHitOnly = true`; exemplo "Player movement" em https://gkjohnson.github.io/three-mesh-bvh/characterMovement.html).

### 10. Exportar e otimizar sem remodelar

- **Blender** (`bpy.ops.export_scene.gltf`, doc atual; confira na versão instalada): `export_format='GLB'`, `export_apply=True` (aplica modificadores), `export_image_format='WEBP'` com `export_image_quality` (padrão 75), `export_draco_mesh_compression_enable` (padrão False, nível de 0 a 10, padrão 6), `export_meshopt_compression_enable` (padrão False), `export_cameras`, `export_lights` (KHR_lights_punctual), `export_extras` (propriedades personalizadas) e `use_visible`/`use_selection`.
- **Cuidado com o `gltf-transform optimize` (4.5.1, conferido no `--help` local):** os padrões são `--simplify true` (altera a malha), `--flatten true`, `--join true` e `--join-named true` (fundem malhas, inclusive as que têm nome), `--palette true` (funde materiais) e `--prune true`. O `prune` do optimize passa `keepLeaves: false` fixo no código, então **os Empties sem filhos somem**, e os marcadores de câmera do Blender iriam junto. Para o nosso caso:

```
gltf-transform optimize entrada.glb saida.glb --compress meshopt --texture-compress webp --texture-size 2048 --simplify false --flatten false --join false --palette false
```

  Os pontos de câmera saem do Blender num JSON à parte (posição e alvo de cada Empty `cam_*`) ou como câmeras do Blender (`export_cameras=True`: um nó com câmera não é folha vazia e sobrevive ao prune). Se precisar manter os Empties no GLB, acrescente `--prune false`.
- **Compressão:** prefira **meshopt** a Draco. O `MeshoptDecoder` vem como módulo JS no three (`three/addons/libs/meshopt_decoder.module.js`), sem pasta de decoder para servir. KTX2 (`--texture-compress ktx2`, `etc1s`, `uastc`) depende do KTX-Software, que **não está instalado** nesta máquina (conferido); por ora, use WebP.
- **Loader:**

```js
const loader = new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder);
// só se usar KTX2: loader.setKTX2Loader(new KTX2Loader().detectSupport(renderer));
// só se usar Draco: loader.setDRACOLoader(new DRACOLoader().setDecoderPath('/draco/')); // copiar three/examples/jsm/libs/draco/gltf/ para public/draco/
```

### 11. Carga progressiva

- Gere duas versões de cada modelo: `*-leve.glb` (por exemplo, `--texture-size 512`) e `*-alta.glb`. Mostre a leve com a fachada logo de cara e troque pela alta quando ela terminar de baixar, em segundo plano.
- Cada página carrega só o próprio modelo (flats numa, casa dos chalés na outra), como o "Multiple Scenes" da Needle.
- Mostre o progresso com `new THREE.LoadingManager(onLoad, (url, carregados, total) => ...)` numa tela de carga (lição 47 do Three.js Journey).
- Antes de revelar a cena, `await renderer.compileAsync(scene, camera)` compila os shaders com as luzes e o ambiente já montados. Isso evita o engasgo do primeiro quadro (padrão do Igloo: compilar e carregar texturas em etapas).
- Pré-carregue o cômodo vizinho, como o `preload` do Photo Sphere Viewer.
- `THREE.LOD` com `addLevel(objeto, distancia)` só vale para objetos vistos de longe, como a casa na vista da fachada. No interior, a troca leve > alta resolve.

### 12. Celular e desempenho

- `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`. É o mesmo teto do R3F, cujo `dpr` padrão é `[1, 2]`.
- DPR adaptativo, como o PerformanceMonitor do drei: tire a média do FPS em janelas de 250 ms, 10 vezes. Se ficar abaixo do limite, baixe para 1; se sobrar folga, suba de novo. O exemplo da doc começa em 1,5 e oscila entre 1 e 2.
- Um preset "celular", como o do Bruno Simon: sem sombra dinâmica (ou com mapa de sombra menor), sem pós-processamento e com texturas da versão leve.
- Renderize sob demanda: só quando `controls.update(dt)` devolver `true` ou quando algo mudar.
- Luz pré-calculada no Blender (bake em textura) é o que deixa Shapespark e Bruno Simon leves, mas exige UV extra e tempo de render. Fica como melhoria futura, não para hoje.

### 13. Acessibilidade e plano B

- `matchMedia('(prefers-reduced-motion: reduce)')`: troque o voo por um corte seco ou um fade curto (`setLookAt(..., false)`). No GSAP, `gsap.matchMedia()` aceita essa condição.
- O menu de cômodos é HTML com `<button>`, então funciona sem o 3D. Ofereça também a lista ou os panoramas como a "porta por critérios" do ERA, para quem não tem WebGL ou tem um celular fraco.
- Esc sai do andar livre e do tour automático, e um botão "Voltar ao tour" fica sempre visível.

## Skills achadas no caminho (não instaladas)

- **MengTo/Skills `3d-virtual-tour`** (https://tessl.io/registry/skills/github/MengTo/Skills/3d-virtual-tour): guia para tours de arquitetura e imóvel. Tour guiado por spline (Hermite ou spline), ir ao cômodo por rota segura ou fade (nunca interpolar através da parede), planta, lista e trilho de capítulos num só registro de paradas, modo de inspeção com Esc para voltar, carga progressiva e movimento reduzido. Bate com os itens 2, 5 e 13. Ler o SKILL.md antes de usar.
- **tsogjavklann/awwwards-3d** (https://github.com/tsogjavklann/awwwards-3d): pela busca, tem um arquétipo de "room walkthrough" com câmera numa CatmullRomCurve3 (não conferido; não abri).

## Fontes abertas

- Código dos exemplos do three.js: `webgl_loader_gltf`, `webgl_loader_gltf_compressed`, `misc_controls_pointerlock`, `games_fps`, `css2d_label` e `KTX2Loader.js` (raw.githubusercontent.com/mrdoob/three.js/dev/...)
- camera-controls: README e exemplos `path-animation`, `first-person` e `await-transitions`
- drei: camera-controls, html, scroll-controls e performance-monitor; R3F: api/canvas
- model-viewer: examples/annotations (página e código-fonte)
- Sketchfab: developers/viewer/functions e os artigos 16152696 e 16152328 da central de ajuda
- Matterport Showcase SDK: modules/mode e modules/sweep
- Photo Sphere Viewer: plugins/virtual-tour e plugins/plan
- Shapespark: página inicial (a central de ajuda deu 403; o texto das Views veio da busca)
- Bruno Simon: bruno-simon.com e o estudo de caso na Awwwards
- Igloo Inc: estudo de caso na Awwwards
- Needle: samples, sample de interior, sample de hotspots e README do gltf-progressive
- PlayCanvas: user-manual/graphics/cameras/camera-controls
- ERA: era.estate e videinfra.com/work/era
- Three.js Journey: lista de lições e a lição 48 (parte grátis)
- Lusion, doc de scroll do Spline e 3D Estate (seção "Também olhados")
- glTF Transform: cli.ts e prune.ts (GitHub) e `optimize --help` da 4.5.1 instalada; Blender: bpy.ops.export_scene (doc atual)
- GSAP ScrollTrigger (doc), nipplejs (README) e three-mesh-bvh (README)
