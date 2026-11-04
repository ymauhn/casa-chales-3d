# Vídeo: "I Built This 3D Site in Claude Code Without Writing Three.js"

- **Link:** https://youtu.be/I96tdKCCI3g
- **Canal:** DesignCode (@DesignCodeTeam). Apresentador: Meng (nome no quadro de 00:25).
- **Publicado:** 03/11/2026. **Duração:** 13:17.
- **Patrocínio:** Mobbin (parceria paga, declarada na descrição).
- **Site construído no vídeo:** Tracewood, um estúdio fictício. https://tracewood.aura.build/

Levantado em 03/11/2026 a partir dos metadados (yt-dlp), da legenda automática em inglês, de 48 quadros por troca de cena mais 90 quadros escolhidos nos trechos de tela, do documento de prompts do autor (link na descrição), do HTML do site do autor (baixado só para leitura, não executado e fora deste repositório) e do repositório da skill (`gh`). Nada foi instalado.

A legenda automática erra nomes. Onde ela diz "ashimala", "Mobin", "Marvin", "3GS", "Fred judge" e "dream loot", o certo é "achimala", "Mobbin", "Mobbin", "Three.js", "fresh judge" e "dream loop".

## Resposta curta: o "dram loop" é a skill **dream-loop**

- **Nome exato:** `dream-loop`, uma skill de agente criada por Anshu Chimala (@anshuc no X).
- **Repositório:** https://github.com/achimala/dream-loop. Licença MIT, público, criado em 07/09/2026, com 1.782 estrelas quando foi consultado em 03/11/2026.
- **Instalação** (do README e da descrição do vídeo; escolha uma):
  - `npx skills add achimala/dream-loop`, pela CLI `skills` da Vercel Labs (https://github.com/vercel-labs/skills, npm `skills` 1.7.6, MIT)
  - `git clone https://github.com/achimala/dream-loop ~/.claude/skills/dream-loop`
  - colar o link no agente e pedir que ele instale
- **Uso:** dizer "dream loop" no prompt ou digitar `/dream-loop`. A skill grava tudo em `.dream-loop/` (`target.png` e `rounds/r1/{live.png, sxs.png, verdict.md}`, depois `r2/` e assim por diante).
- **Provas:**
  - a fala em 08:15: "It's on GitHub at ashimala/dream-loop" (a legenda erra o nome);
  - a descrição: "Dream loop: npx skills add achimala/dream-loop" e "Dream loop skill, by Anshu Chimala";
  - o quadro de 08:27 mostra o README "dream-loop, By @anshuc";
  - o quadro de 08:51 mostra `ls ~/.claude/skills/dream-loop`, com `assets LICENSE README.md references scripts SKILL.md`, a mesma árvore do repositório.

### O que a skill faz (lido no repositório)

O loop: (1) gerar por IA uma imagem-alvo "sonhada"; (2) construir mirando nela; (3) um crítico separado compara o screenshot ao vivo com o alvo; (4) voltar ao passo 2 até o crítico aprovar; (5) opcionalmente, sonhar um alvo melhor.

- O `SKILL.md` manda escolher entre dois fluxos, **Plus** e **Pro**, pelo plano de assinatura do usuário (foi escrito pensando em ChatGPT Plus e Pro). Quando o usuário nomeia o fluxo, vale o que ele disse. No nosso caso, peça o **Pro** explicitamente.
- **Fluxo Pro:** o juiz é um subagente novo a cada rodada, sem memória das rodadas anteriores. Ele recebe o screenshot, o alvo e o veredito anterior, e dá nota por rubrica: composição 0–3, luz 0–3, materiais 0–3, detalhes 0–1. Para com nota ≥ 8 e FPS aceitável. Se a melhor nota não sobe um ponto inteiro em 2 rodadas, ou se o juiz aponta a mesma falha 2 vezes seguidas, ele repensa a cena inteira. Se ainda assim não sobe, para e pergunta ao usuário.
- **Fluxo Plus:** o orquestrador só delega a subagentes, roda 3 voltas e pede revisão ao usuário. O guia de assets do Plus diz "DO NOT use Blender for modeling".
- **Alvo:** "If the user supplies this, use that directly." Quando já existe um produto, o alvo parte de um screenshot dele, para melhorar sem divergir. O prompt de imagem deve pedir "um screenshot real", nunca "concept art".
- **Assets 3D (guia Pro):** a ordem é baixar (só com permissão), depois image-to-3D na **fal.ai** (paga: o repositório estima cerca de US$ 0,30 por asset no `tripo3d/h3.1` e US$ 0,02 no `fal-ai/trellis`), depois Blender por script e, por último, procedural.
- **Scripts no repositório** (lidos, não executados): `scripts/fal-batch.mjs`, o cliente da fila da fal.ai, que pede `FAL_KEY`; e `scripts/preview-server.py`, um servidor local que recebe `POST /__capture` e grava PNG em `.dream-loop/captures/`.

## O método do vídeo, passo a passo

1. **01:15, a regra de ouro.** Prompt preguiçoso de uma linha dá site genérico ("AI slop"). As referências fazem a maior parte do trabalho.
2. **02:06, Mobbin dentro do Claude.** No app desktop: Claude Code → Customize → Connectors → Mobbin, e login com a conta Mobbin. A dica é pedir screenshots, senão voltam só links. O prompt foi "Give me the top five 3D websites from Mobbin, with screenshots.", e a resposta trouxe Squarespace, Berd, Spline, Aino Agency e Unseen Studio (quadro de 02:44). Usou Opus 5.5 com esforço alto (quadro de 02:50: "Opus 5.5 · Effort · High").
3. **02:54, referências.** Buscou "3D website" na biblioteca de sites do Mobbin (ele diz que voltaram mais de 1.200 seções, muitas em vídeo curto) e guardou as melhores numa coleção. Entre elas aparecem KODE Immersive e Basement Studio (quadros de 03:09 e 03:10).
4. **03:27, duas referências e uma ideia.** Do Basement Studio veio o escritório em desenho de linhas e uma sala por onde se anda. Do Poly vieram a luz do sol, os materiais quentes e as fotos na mesa. A junção virou o Tracewood: "every room starts as a line".
5. **04:15, o prompt.** "Build an immersive 3D-world landing page in the basement.studio / Poly style, where the whole page is one scene." Ele não cita framework nem shader, só a sensação.
6. **04:41, o plano do agente.** Cinco capítulos (Studio, Process, Work, Services, Contact), cada um uma parada de câmera na mesma sala. A página rola como qualquer outra, mas o scroll só move a câmera. Um único valor de progresso suavizado comanda câmera, varredura, luz e texto. Veja os quadros de 04:58 e 05:03.
7. **05:07, interatividade.** Clicar numa folha presa no quadro a solta do alfinete e abre um painel com detalhes e links. Embaixo fica um menu fixo com os 5 capítulos (quadro de 05:26).
8. **05:44, o meio certo para cada objeto.** Sala e móveis são modelados, porque a câmera anda em volta e a luz cai neles. O desenho de linhas sai das arestas de cada objeto, e uma borda suave varre a cena com o scroll e revela as superfícies. Os impressos são pintados em código, para o texto ficar nítido. As plantas são recortes tirados da imagem-alvo. Onde a luz em tempo real não alcançava o visual, a luz foi pintada na textura.
9. **06:31, rodada 1 com nota 4,6.** Funcionou, mas a luz ficou chapada, as janelas viraram névoa verde e a sala ficou vazia. Por isso ele usou o dream loop: tirar screenshot e pedir a um modelo de imagem a versão pronta da mesma sala, com a mesma câmera. Esse é o alvo. A cada rodada: mudar, capturar da mesma câmera, comparar lado a lado e dar a nota com um juiz novo, que também lista o que falta. Pelo documento de prompts, um script ainda compara o brilho de cada região com o alvo, "because judging light by eye overshoots".
10. **07:28, de onde veio a nota.** Veio da luz, não da geometria. Texturas geradas, light probe, AO, bloom e color grade levaram a nota a pouco mais de 6, e ela travou. Pintar a luz (gravar na textura a diferença contra o alvo) levou a perto de 7. As plantas recortadas do próprio alvo deram 7,85 na rodada 10, e a rodada 11 chegou a 8,05. A sequência inteira da vista principal está no quadro de 07:46.
11. **08:13, instalar a skill.** São três caminhos (veja acima). O agente precisa de três coisas: visão, subagentes para o juiz e geração de imagem. "Claude doesn't make images on its own", então ele ligou o **Aura** para gerar as imagens-alvo. Blender é opcional. A dica: dê um limite de tempo ou uma nota de parada, senão o loop gasta muito token.
12. **09:35, do vazio ao mobiliado.** O prompt foi em palavras simples: "The room looks plain and empty. Please add more decoration and furniture. I want a high-end and modern room." O agente rodou o dream loop de novo nessa vista, com um novo alvo da sala mobiliada, e montou peça por peça. O sofá saiu "uma salsicha chata" e foi refeito; a luminária de arco foi curvada para atravessar a vista. No entardecer há só 3 luzes reais, porque "every light costs time on every pixel". O lounge foi de 4,9 a 6,25 e a mesa de trabalho de 6,4 a 7,6.
13. **11:05, os erros que mais custaram tempo:**
    - O light probe é capturado uma vez, no carregamento. Os móveis novos escureceram a vista de abertura. A correção foi esconder o lounge durante a captura.
    - As persianas bloqueavam o sol até as lâminas serem inclinadas a favor da luz.
    - Um comentário `//` no meio de uma linha engoliu o `solids.add(g)` e sumiu com todos os objetos (quadro de 11:42).
14. **11:45, desempenho e celular.** "Performance is mostly about pixels." A página mede o próprio tempo de quadro e baixa a resolução quando atrasa. No Mac dele deu 55–80 fps nos cômodos mobiliados e mais de 100 no desenho de linhas (medição do autor). No celular, a sala ganha um enquadramento de câmera próprio, e os detalhes sobem como uma folha de baixo.
15. **12:11, a conta.** Foram cerca de 10 mensagens em 2 dias, cerca de 1.500 tool calls e cerca de 10 horas de trabalho do Opus 5.5 (números do autor). Ele escolheu as referências, a sensação e o momento de parar.

## Ferramentas e skills mostradas

| Ferramenta | O que faz | URL | Instalação | Grátis? | Quando | Evidência |
|---|---|---|---|---|---|---|
| **dream-loop** (skill) | Loop de alvo gerado → construção → juiz com nota, até ficar bom | https://github.com/achimala/dream-loop | `npx skills add achimala/dream-loop` | Sim (MIT). Precisa de um gerador de imagem à parte, e o caminho de assets 3D usa fal.ai, que é paga | 06:31–09:35 | Fala em 08:15; quadros de 08:27 (README), 08:51 (pasta da skill) e 09:21 (`.dream-loop/`); descrição do vídeo |
| **skills** (CLI `npx skills`) | Instala skills de agente a partir de repositórios do GitHub | https://github.com/vercel-labs/skills | `npx skills add <dono>/<repo>` | Sim (MIT) | 08:39 | Quadro de 08:39 ("One line / Clone / Paste the link"); README do dream-loop |
| **Mobbin MCP** | Busca telas, fluxos e seções de apps e sites reais (`search_screens`, `search_flows`, `search_sections`, mais as ferramentas de coleção) | https://mobbin.com/mcp (endpoint `https://api.mobbin.com/mcp`) | `claude mcp add --transport http mobbin https://api.mobbin.com/mcp` (descrição) ou `claude mcp add mobbin --scope user --transport http https://api.mobbin.com/mcp` (docs), depois autenticar em `/mcp`. No desktop: Customize → Connectors | **Não.** Exige plano Pro, Team ou Enterprise (mobbin.com/mcp). É o patrocinador | 02:06–03:27 | Quadros de 02:20 a 02:44: Customize → Connectors → Mobbin, as três ferramentas de busca e "WITH SCREENSHOTS" |
| **Aura** (aura.build) | Construtor de sites com IA. No vídeo, gera as imagens-alvo do loop e hospeda o Tracewood | https://www.aura.build/ | O vídeo não mostra como foi ligado ao Claude Code | Há plano Free limitado (as páginas oficiais dizem 10 ou 20 mensagens por mês). Não confirmado se o Free gera imagem | 09:01–09:09 | Fala "I connected a service like aura for the target images"; quadro de 09:09 ("Image generation · for the target images · Aura"); prompt 4 ("6 Aura prompts"); o site está em tracewood.aura.build |
| **Claude Code + Opus 5.5** (app desktop, esforço alto) | O agente que planejou e construiu o site | https://www.anthropic.com/claude-opus-5-5 (anúncio de 22/09/2026: US$ 4 por milhão de tokens de entrada e US$ 20 por milhão de saída) | (já temos) | Pela assinatura | 02:06, 02:50, 04:21 | Quadros de 02:14 ("Claude Code") e 02:50 ("Opus 5.5 · Effort · High") |
| **Three.js r170** via CDN (importmap, um HTML só) | Renderização 3D. Addons usados: RoomEnvironment, RoundedBoxGeometry, EffectComposer, RenderPass, GTAOPass, UnrealBloomPass, ShaderPass, OutputPass | https://cdn.jsdelivr.net/npm/three@0.170.0/ | Sem build: `<script type="importmap">` | Sim (MIT) | 11:42 | HTML do autor (importmap); documento: "built into one HTML file with Three.js from a CDN"; quadro de 11:42 (`new THREE.Group()`) |
| **Modelo de geração de imagem** (qualquer um) | Cria o alvo: a versão pronta da mesma vista | (no vídeo, via Aura) | — | Depende do serviço | 06:55 | Fala "ask ... the image model for a finished version" |
| **Blender** (opcional) e um "Blender MCP" | Modelos 3D sob medida. O README do dream-loop prefere MCP ou script a computer use | https://www.blender.org/ e, como exemplo de MCP comunitário, https://github.com/ahujasid/mcp-for-blender (o README não diz qual MCP usar) | — | Sim | 09:05 | Fala "Blender is optional"; README do dream-loop |
| **fal.ai** (dentro da skill, não aparece no vídeo) | Converte imagem em modelo 3D (`tripo3d/h3.1/image-to-3d`, `fal-ai/trellis`) | https://fal.ai | Pede a variável `FAL_KEY` | **Não** (paga por asset) | — | `references/fal.md` e `references/pro-mode/assets-3d.md` no repositório |

Sites citados como referência: Basement Studio (https://basement.studio), Poly (https://poly.app), Tracewood (https://tracewood.aura.build/) e a demo da skill (https://dream-loop-demo.anshu.dev, link do README: "Vesper — The Drowned Cathedral", uma cena em tempo real com controles de andar, orbitar e zoom).

## Prompts que ele mostra

1. `find inspiration on mobbin for 3D site`
2. `Give me the top five 3D websites from Mobbin, with screenshots.` (02:38)
3. `Build an immersive 3D-world landing page in the basement.studio / Poly style, where the whole page is one scene.` (04:21–04:31)
4. `Use dream-loop to build a polished 3D scene.` Segundo o documento, foi junto com um brief mais longo dele, "Upgrade the Entire 3D Website to Premium AAA Quality (9/10)", que não foi publicado.
5. `Keep iterating the dream-loop on Tracewood. Spend up to another 6 Aura prompts if they help (for example a cleaner garden backdrop or a butcher-block texture), and try a new approach for the exterior and table.`
6. `Keep iterating toward 9? On the section "WORK", I want a score of 9/10 for visual on paper work. I want the service section to be interactive. I can click on the paper and show more information.` (05:11)
7. `Resume the Work desk bake and keep iterating it toward 9/10.`
8. `Use dream-loop to build a polished 3D scene. I want a better visual for paper with stunning image with premium design and layout. The room looks plain and empty. Please add more decoration and furniture. I want a high-end and modern room.` (09:56)
9. O prompt do juiz está no repositório (`references/pro-mode/workflow.md`): rubrica de 0 a 10, lista completa e acionável do que falta, e "Don't sugarcoat it".

## Dicas técnicas (do vídeo e do HTML do autor)

Estas notas descrevem a técnica. O código do autor não foi copiado.

- **Um valor comanda tudo.** O alvo é `pt = clamp(scrollY / (SPAN * altura_da_tela), 0, P_END)`, e o valor usado é `p = damp(p, pt, 5, dt)`, com `damp(a, b, k, dt) = lerp(a, b, 1 - exp(-k*dt))`, uma suavização exponencial que não depende do FPS. Câmera, luz, neblina, bloom, AO e texto leem esse mesmo `p`.
- **Uma pose de câmera por capítulo.** Uma lista `KEYS` guarda `{p, pos, tgt, fov}` de cada parada. Entre paradas, a interpolação é Catmull-Rom na posição e no alvo, com o `t` local passando por `smoothstep(0.08, 0.92)`, o que faz a câmera "estacionar" em cada parada. O FOV é interpolado linearmente.
- **O menu usa o mesmo trilho do scroll.** `goTo(p)` faz `scrollTo({top: p*SPAN*vh, behavior: 'smooth'})`, com `SPAN = 1,55` alturas de tela por unidade de `p`. Um elemento alto (o "sizer") dá a altura total da rolagem. Hotspot, menu e scroll caem no mesmo caminho.
- **Celular com enquadramento próprio.** Cada parada tem, opcionalmente, uma versão retrato (`ppos`, `ptgt`, `pfov`). A mistura é `portraitK = clamp((1,15 − largura/altura) / 0,6)`, com FOV maior no retrato (por exemplo, 56 → 76).
- **Aparelho fraco.** `matchMedia('(max-width: 760px), (pointer: coarse)')` liga o modo leve: sombra em 2048 e pixel ratio menor.
- **Acessibilidade.** O parallax do mouse desliga no toque e com `prefers-reduced-motion`. Nesse caso o scroll fica `auto` e a suavização, mais rápida.
- **Resolução adaptativa.** O DPR fica limitado a 1,75. A escala começa em min(DPR, 1,5), ou 1,25 no modo leve, e o código acompanha a média móvel do tempo de quadro. Se ela fica acima de 18,5 ms por 1,5 s seguidos, a escala cai 0,12, até 4 vezes (mínimo 0,95, ou 0,75 no modo leve). Isso só vale nos capítulos da sala já construída, onde o custo de preenchimento (AO, bloom, MSAA) domina.
- **Modo captura para revisão.** Com `?capture=P&cam=x,y,z,tx,ty,tz[,fov]`, a página fixa o progresso e a câmera. Serve ao juiz do dream loop e serve para os nossos testes com Playwright.
- **Revelar com linhas.** As arestas de cada malha (`EdgesGeometry`) são juntadas em `LineSegments` em coordenadas de mundo, cada vértice com a sua distância até um ponto de origem (a mesa). Um uniform `uFront` avança com `p`: os materiais da sala descartam o que está além da frente (injeção por `onBeforeCompile`), e as linhas brilham perto dela.
- **Luz.** Usa PMREM com `RoomEnvironment` e um light probe de dia e outro de entardecer. O probe é capturado uma vez, então o que estiver visível nesse momento contamina a luz. O AO (GTAO) só liga quando a sala já foi revelada. Cada luz real custa em cada pixel; o resto foi pintado na textura.
- **Truques baratos que parecem caros.** Plantas recortadas do alvo em cartões que giram para a câmera; texto pintado em `CanvasTexture`; sombras finas embaixo de cada folha de papel.
- **Painéis presos ao capítulo.** O painel abre perto da parada (|p − capítulo| < 0,22) e fecha ao se afastar (> 0,32). Um link para outro capítulo rola até lá e só abre ao chegar (< 0,04).

## O que dá para aplicar no nosso site

Itens marcados com **(nosso)** não vêm do vídeo.

1. **Fachada → cômodos como capítulos.** Cada página (flats e casa dos chalés) vira uma cena com `p = 0` na fachada, `p = 1` na entrada e uma parada por cômodo. Basta copiar a ideia da lista `KEYS`. **(nosso)** Tirar as poses das câmeras que já existem nos `.blend`, exportadas no GLB ou num JSON de poses, para não chutar coordenadas.
2. **Menu de cômodos e hotspots** chamando `goTo(p)`, no mesmo trilho do scroll. As transições ficam suaves e iguais, venha o visitante de onde vier. O nome do cômodo e um painel de detalhes abrem perto da parada.
3. **Celular.** Uma pose retrato por cômodo (FOV maior), o modo leve por `matchMedia`, resolução adaptativa e detalhes em folha que sobe de baixo, como no Tracewood (quadros de 12:06 e 12:09).
4. **Entrada pela fachada em linhas.** A fachada começa como desenho de arestas e "se revela" ao rolar, a assinatura do Tracewood. **(nosso)** Isso funciona com os modelos como estão, porque as arestas saem da própria geometria.
5. **Andar livre opcional. (nosso)** O vídeo não tem. A ideia é um botão que solta a câmera do trilho (pointer lock ou toque) e, ao sair, devolve o visitante ao `p` mais próximo.
6. **Carregamento progressivo. (nosso)** O vídeo não trata disso: o HTML do Tracewood tem 9,8 MB, com as texturas embutidas em base64. Para nós: um GLB por página, ou por bloco de cômodos, com Draco ou meshopt e texturas KTX2 (gltf-transform), carregando primeiro a fachada.
7. **Dream loop sem gasto extra. (nosso)** Usar como `target.png` os renders e panoramas que já existem em `flats-3d/saida/`; o `SKILL.md` aceita alvo fornecido pelo usuário. Assim não precisamos gerar imagem. O juiz é um subagente novo com a rubrica, e a captura sai do modo `?capture=` com Playwright. Parar com nota ≥ 8 ou com um limite de tempo.
8. **O que ficou de fora deste projeto:** o caminho da fal.ai dentro do dream-loop (pago, e remodelaria os assets), o Mobbin MCP (plano pago) e o Aura para gerar imagem (plano e limites não confirmados).

## Cuidados

- Notas, FPS, número de tool calls, horas e preços são do autor. Não medimos nada disso.
- Mobbin (pago) e Aura (limites não confirmados) não foram usados.
- A transcrição completa ficou fora deste repositório (direito autoral). Aqui há só trechos curtos citados.
