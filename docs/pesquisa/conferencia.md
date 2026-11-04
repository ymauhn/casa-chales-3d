# Conferência adversarial da pesquisa (03/11/2026)

Cada documento desta pasta passou por um cético independente, que tentou derrubar as afirmações abrindo as fontes de novo (legenda do vídeo, quadros, repositórios, páginas). Esta é a lista do que caiu e do que foi acrescentado. Os documentos originais (`video-I96tdKCCI3g.md` e `referencias.md`) ficaram como foram escritos: valem com as correções abaixo.

## Vídeo (12 confirmados, 5 derrubados)

- **Horários.** As marcas por palavra da legenda dão "GitHub" em 08:21 e a linha "ashimala/dream-loop" entre 08:22 e 08:25 (e não 08:15). O "Aura" cai em 09:07 e o "Blender é opcional", em 09:10.
- **Juiz com nota.** O juiz novo por rodada, com a rubrica 3/3/3/1 e a parada em nota 8, só existe no fluxo **Pro** da skill. O fluxo Plus não tem juiz nem nota: roda 3 voltas e pede revisão ao usuário.
- **A pasta `.dream-loop/rounds/rN/`.** A skill só define `.dream-loop/` e o `target.png`. A organização por rodada (`live.png`, `sxs.png`, `verdict.md`) é a do projeto do autor, mostrada na tela. Este site usa a mesma organização por escolha.
- **fal.ai.** Não aparece no vídeo (nem na fala, nem nos quadros, nem na descrição). Só aparece no repositório da skill, como caminho pago para gerar assets 3D. Para nós ele não dispara: não há `FAL_KEY` e os modelos não mudam.
- **MCP do Blender.** O vídeo não nomeia nenhum. A URL `ahujasid/mcp-for-blender` foi escolha da pesquisa. O caminho que a própria skill descreve é o script Python do Blender, que é o que o flats-3d já usa.

Acrescentado pelo cético:
- O README da skill (08:57) cita as fontes de imagem: embutida (Codex, Grok) ou por API (Gemini), e diz que foi testada com o GPT-6 Astra no Codex.
- O Aura é produto do próprio autor (Meng To, DesignCode).
- A skill traz um servidor de captura (`scripts/preview-server.py`, porta 4172, `POST /__capture`). Não foi usado: as capturas daqui saem do `testes/capturar.mjs` com o Playwright.

## Referências (14 confirmados, 5 derrubados)

- **camera-controls:** `setBoundary(box3)` prende só o alvo da câmera; quem testa a parede é `colliderMeshes`.
- **three.js `games_fps`:** `fromGraphNode` é método de instância (`new Octree().fromGraphNode(cena)`), não estático.
- **Needle Engine:** os LODs progressivos não dependem só do Needle Cloud; o motivo para ficar de fora é a licença (o site dos flats é comercial).
- **Igloo Inc:** o estudo de caso não diz que o scroll move a câmera; fica como plausível, não conferido.
- **Bruno Simon:** colisão e renascer marcados pelo nome no Blender estão confirmados no código (`brunosimon/folio-2025`, MIT); o "limite" não.

Acrescentado pelo cético:
- **MengTo/Skills, skill `3d-virtual-tour`** (MIT, do mesmo autor do vídeo): guia de tour virtual com rota pelas portas, um dono só da câmera, planta e hotspots ligados ao mesmo registro de paradas, andar livre com colisão e a lista de verificação. **Instalada neste projeto** em `.claude/skills/3d-virtual-tour/`.
- `brunosimon/folio-2025` como fonte primária do que se atribui ao portfólio.
- Theatre.js, para coreografar a câmera em keyframes editados no navegador.

## Skills e pipeline (28 confirmados, 8 derrubados)

- **threejs-skills** foi conferida contra o three r186; o site está no r187. Continua recomendada.
- **Draco sem `--join false`:** dá 145.384 bytes com 21 malhas no flat 04 (o número de 291.312 é do meshopt). O `--join false` continua necessário para manter os nomes das malhas (o site acha forro e telhado pelo nome).
- **Vite e decoders:** com o Vite 8.3.5 e o three r187, `DRACOLoader` e `KTX2Loader` acham os próprios arquivos no dev e no build; não é preciso copiar para `public/`.
- **`npx skills add`** sem `--skill` pergunta quais instalar e trava sem terminal. O certo: `npx skills add cloudai-x/threejs-skills --skill '*' -a claude-code -y --copy`. Aqui as skills foram copiadas do clone do repositório.
- Licenças: o exportador glTF do Blender é Apache-2.0 (o Blender é GPL); o ffmpeg do pacote full é GPL-3.0.
- O `casa-chales.glb` mudou em 5 commits depois do `-web.glb` velho do flats-3d. O site usa o de 18.448.832 bytes (v3, 85703c8).

Acrescentado pelo cético:
- O exportador do Blender 5.2 já traz o gltfpack (`export_use_gltfpack`, KTX2 com BasisU), se o binário estiver instalado.
- O `gltf-transform validate` não valida a geometria com `EXT_meshopt_compression`; a prova é carregar o GLB no site, que o teste com o Playwright faz.
