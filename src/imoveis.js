// Os imóveis e as paradas da visita. Coordenadas em metros do Blender (x, y no plano, z para cima),
// as mesmas do flats-3d: cam é o olho, alvo é para onde ele olha. As câmeras vêm de imoveis/<nome>.json
// (as vistas Cycles) e os pontos 360° de web/tour-pontos.json do flats-3d; nada foi remodelado.
//   img: miniatura em public/img/<imovel>/<img>.webp   pano: panorama Cycles em public/pano/<pano>.webp
//   semTeto: a parada mostra a maquete sem forro nem telhado   externo: a marca aparece vista de fora
//   visao: parada de visão geral (sem marca no chão)
//   lente: a lente (mm) da vista Cycles, para enquadrar igual ao render; fov: o ângulo horizontal, quando não há lente

export const IMOVEIS = {
  'casa-chales': {
    titulo: 'Casa dos Chalés',
    lugar: 'Lençóis, Chapada Diamantina (BA)',
    glb: 'modelos/casa-chales.glb',
    vegetacao: 'modelos/casa-chales-mata.glb',
    pano8k: true,   // public/pano/8k: os 360 Cycles de 8192 px   // coleção Paisagismo do .blend, simplificada (pipeline/exportar_paisagismo.py)
    colisao: 'colisao/casa-chales.json',
    alturaVoo: 11,          // altura do voo entre cômodos (acima do telhado)
    alturaTelhado: 5.5,     // acima disso a câmera está "fora": com telhado, só as marcas externas aparecem
    neblina: [0xd3dde0, 45, 150],   // o terreno do glb não tem a mata: some no horizonte
    // sol: rotacao_graus [x, z] e cor do luz.sol do imoveis/casa-chales.json; raio: metade do lado da sombra (m)
    luz: {
      exposicao: 0.8, ambiente: 0.22, ambientePano: 0.4, ceuDentro: 0.1, ceu: [0xa9c4f0, 0x7a6450, 0.42],
      sol: { rotacao: [60, 40], cor: [1.0, 0.9, 0.78], forca: 3.8, centro: [8, 6], raio: 19 },
      lampada: { cor: 0xffcf9a, alcance: 10, porM2: 1.2, min: 8, max: 26 },
    },
    tetos: /^(teto|telhado|laje|g_laje|forro|coz_rebaixo_teto)/,
    atenuar: { sm_cobogo_luz: 0.3 },
    tingir: { terreno: [0.66, 0.37, 0.29] },   // a terra vermelha (laterita) das vistas Cycles
    inicio: 'aerea',
    entrada: ['fachada', 'entrada'],
    paradas: [
      { id: 'aerea', nome: 'Vista aérea', texto: 'A casa no terreno, vista do alto', cam: [30, 30, 17], alvo: [8, 7.5, -1.2], lente: 24, ev: -0.1, img: 'aerea', visao: true },
      { id: 'fachada', nome: 'Fachada', texto: 'A chegada pelo caminho de pedra', cam: [10.2, -7.2, 1.55], alvo: [10, 4, 1.9], lente: 20, ev: -0.1, img: 'fachada', externo: true },
      { id: 'entrada', nome: 'Entrada', texto: 'Os degraus da frente e a varanda', cam: [9.8, -0.9, 1.28], alvo: [9.8, 5, 1.1], img: 'pano-entrada', pano: 'entrada', externo: true },
      { id: 'varanda', nome: 'Varanda', texto: 'A varanda sul, entre a entrada e a piscina', cam: [11.6, 2.6, 1.6], alvo: [5.2, 3.6, 2.3], lente: 18, img: 'varanda', externo: true },
      { id: 'salao', nome: 'Salão', texto: 'Sala de estar e jantar sob o forro ripado', cam: [8.35, 5.4, 1.5], alvo: [16, 6.9, 1.55], lente: 17, ev: 0.3, img: 'sala', pano: 'salao' },
      { id: 'cozinha', nome: 'Cozinha', texto: 'A ilha e a bancada, abertas para o salão', cam: [11.1, 4.75, 1.4], alvo: [15.8, 7.9, 1.15], lente: 24, ev: 0.3, img: 'cozinha' },
      { id: 'suite', nome: 'Suíte master', texto: 'A suíte do térreo, com closet e terraço', cam: [14.1, 12.85, 1.45], alvo: [10.7, 15.6, 0.9], lente: 20, ev: -0.6, img: 'quarto', pano: 'suite', ocultar: ['suite_S_folha'] },
      { id: 'banheiro', nome: 'Banheiro da suíte', texto: 'O banheiro da suíte master', cam: [15.2, 9.62, 1.5], alvo: [14.3, 11.8, 1.0], lente: 18, ev: -0.3, img: 'banheiro', pano: 'banheiro' },
      { id: 'varanda_suspensa', nome: 'Varanda suspensa', texto: 'O terraço e a varanda suspensa sobre a mata', cam: [10.0, 13.73, 1.6], alvo: [5.5, 13.6, 2.0], lente: 18, img: 'varanda_suspensa', pano: 'varanda_suspensa', externo: true },
      { id: 'piscina', nome: 'Piscina e deck', texto: 'A piscina, o deck e a cascata', cam: [1.9, -0.9, 2.3], alvo: [2.6, 8.5, -0.3], lente: 17, ev: -0.1, img: 'piscina', pano: 'piscina', externo: true },
      { id: 'gourmet', nome: 'Espaço gourmet', texto: 'Churrasqueira, forno e a mesa ao ar livre', cam: [4.2, 0.25, 1.6], alvo: [0, -4.95, 1.0], lente: 18, img: 'gourmet', pano: 'gourmet', externo: true },
      { id: 'varanda_baixo', nome: 'Varanda de baixo', texto: 'As varandas das suítes do pavimento inferior', cam: [17.3, 14.4, -1.48], alvo: [22, 14.4, -1.75], img: 'pano-varanda_baixo', pano: 'varanda_baixo', externo: true },
      { id: 'suite_baixo', nome: 'Suítes de baixo', texto: 'As duas suítes do pavimento inferior (−3,06 m)', cam: [15.7, 13.7, -1.51], alvo: [13.2, 16.2, -2.26], lente: 16, ev: 0.1, img: 'suite_inferior', pano: 'suite_baixo' },
      { id: 'fundos', nome: 'Fundos', texto: 'A casa vista dos fundos, com os dois pavimentos', cam: [24, 26, 0], alvo: [12, 12, -0.8], lente: 22, ev: -0.1, img: 'fundos', visao: true },
      { id: 'planta', nome: 'Planta', texto: 'A casa vista de cima, sem telhado', cam: [8.5, 5.0, 30], alvo: [8.5, 5.01, 0], fov: 74, img: 'topo', visao: true, semTeto: true },
    ],
  },

  'flat-04': {
    titulo: 'Flat 04',
    lugar: 'Diamantina Flats',
    glb: 'modelos/flat-04.glb',
    luzAssada: { glb: 'modelos/flat-04-luz.glb', pasta: 'luz/flat-04/', ganho: 1.5, grupos: ['Estrutura', 'Tetos', 'SoVisita'] },   // bake Cycles de 04/11 (assar_luz.py); os móveis saíram bloqueados (peças sobrepostas) e ficam dinâmicos
    colisao: 'colisao/flat-04.json',
    alturaVoo: 6.5,
    luz: {
      exposicao: 0.82, ambiente: 0.2, ceu: [0xc4d6f5, 0x7a6450, 0.35],
      sol: { rotacao: [55, -70], cor: [1.0, 0.9, 0.76], forca: 3.6, centro: [3.9, 4.8], raio: 8 },
      lampada: { cor: 0xffcf9a, alcance: 8, porM2: 2.0, min: 9, max: 30 },
    },
    alturaTelhado: 3.2,
    tetos: /^(teto|coz_rebaixo_teto|laje)/,
    inicio: 'maquete',
    entrada: ['sala'],
    paradas: [
      { id: 'maquete', nome: 'Maquete', texto: 'O flat inteiro, sem o forro', cam: [10.5, -3.2, 8.2], alvo: [3.6, 4.6, 0], fov: 80, img: 'topo', visao: true, semTeto: true },
      { id: 'sala', nome: 'Sala', texto: 'A sala, vista da porta da lavanderia', cam: [4.1, 0.75, 1.6], alvo: [1.6, 4.6, 1.2], lente: 14.56, pano: 'flat-sala', img: 'cozinha_para_tv' },
      { id: 'cozinha', nome: 'Cozinha', texto: 'A cozinha americana e a bancada', cam: [0.85, 2.55, 1.45], alvo: [4.9, 2.75, 1.22], lente: 24.96, pano: 'flat-cozinha', img: 'cozinha' },
      { id: 'tv', nome: 'TV e ripado', texto: 'O painel ripado e a TV', cam: [2.95, 1.85, 1.35], alvo: [1.27, 4.34, 1.32], lente: 24.96, pano: 'flat-tv', img: 'tv' },
      { id: 'sofa', nome: 'Sofá e janela', texto: 'O sofá e a janela da sala', cam: [1.29, 2.22, 1.39], alvo: [1.07, -0.77, 1.24], lente: 14.56, img: 'sofa' },
      { id: 'lavanderia', nome: 'Lavanderia', texto: 'A lavanderia, ao lado da cozinha', cam: [5.5, 0.55, 1.5], alvo: [7.6, 0.75, 1.0], pano: 'flat-lavanderia', img: 'unreal-lavanderia' },
      { id: 'varanda', nome: 'Varanda', texto: 'A varanda, entre a sala e o banheiro', cam: [5.6, 5.0, 1.55], alvo: [5.4, 7.1, 1.25], pano: 'flat-varanda', img: 'unreal-sala' },
      { id: 'quarto', nome: 'Quarto', texto: 'O quarto, da porta até a cama', cam: [3.35, 6.55, 1.45], alvo: [1.0, 9.35, 0.95], pano: 'flat-quarto', img: 'quarto' },
      { id: 'quarto_sala', nome: 'Quarto, da cama', texto: 'O quarto visto do lado do banheiro', cam: [3.3, 8.52, 1.25], alvo: [0.6, 7.79, 1.05], lente: 14.56, img: 'quarto_para_sala' },
      { id: 'banheiro', nome: 'Banheiro', texto: 'O banheiro, com a cuba e o box', cam: [4.5, 8.8, 1.25], alvo: [5.95, 7.97, 0.95], lente: 24.96, ev: 0.9, pano: 'flat-banheiro', img: 'banheiro' },
      { id: 'planta', nome: 'Planta', texto: 'O flat visto de cima, sem o forro', cam: [3.86, 4.3, 15], alvo: [3.86, 4.31, 0], fov: 88, img: 'topo-anotado', visao: true, semTeto: true },
    ],
  },
};
