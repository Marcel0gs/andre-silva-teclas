/* ===========================================================================
   VÍDEOS DA PÁGINA

   ⚠️ O ANDRÉ NÃO MEXE MAIS NESTE ARQUIVO.
   Desde 20/09/2026 ele troca os vídeos sozinho no painel:

       https://andreteclas.marcel0gs.workers.dev

   Ele cola o link do YouTube, confere a capa e salva. Aparece no site em
   até um minuto.

   A lista aqui embaixo virou a RESERVA. Ela é desenhada de cara, antes de
   qualquer pedido de rede, e a lista do painel entra por cima quando chega.
   Existe por dois motivos:

     1. se o painel estiver fora do ar, a seção continua cheia. Seção de
        vídeo vazia num site de cliente parece site quebrado
     2. quem abre a página vê vídeo imediatamente, sem esperar a rede

   Só vale a pena mexer aqui se a lista de reserva ficar velha demais (tipo
   um ano) ou se o painel for desligado de vez.
   =========================================================================== */

var VIDEOS = [

  {
    link: "https://www.youtube.com/watch?v=XaRqTtDTB_c",
    titulo: "Aula de Blues no Teclado: escala de C#m",
    nota: "Exercício prático pra tocar junto"
  },
  {
    link: "https://www.youtube.com/watch?v=49ihvyhLjgM",
    titulo: "Casio Privia PX-5S em 2026: ainda vale a pena?",
    nota: "Review sincero, sem propaganda"
  },
  {
    link: "https://www.youtube.com/watch?v=aeuugBtIPAI",
    titulo: "O segredo do preenchimento no teclado",
    nota: "O que dá corpo ao som entre um acorde e outro"
  },
  {
    link: "https://www.youtube.com/watch?v=KBdT94mERnU",
    titulo: "SMK25 + Audio Evolution, sem placa de áudio",
    nota: "Gravando com zero latência"
  },
  {
    link: "https://www.youtube.com/watch?v=S8922R5JJ1I",
    titulo: "Salve projetos no Audio Evolution sem perder nada",
    nota: "Tutorial completo"
  },
  {
    link: "https://www.youtube.com/watch?v=Qh5LIPt6NKs",
    titulo: "Como separar os pads das teclas no SMK-25",
    nota: "Passo a passo no controlador"
  }

];

var CANAL_YOUTUBE = "https://www.youtube.com/@andresilvateclas";

/* De onde vem a lista que o André edita. */
var API_VIDEOS = "https://andreteclas.marcel0gs.workers.dev/api/videos";


/* ===========================================================================
   Daqui pra baixo é o motor. Não precisa mexer.

   Detalhe que importa pra velocidade do site: os vídeos NÃO carregam o
   player do YouTube de cara. Entra só a capa, que é uma imagem leve, e o
   player só nasce quando alguém clica. Seis players carregando juntos
   derrubariam o site no celular.
   =========================================================================== */
(function () {
  'use strict';

  var caixa = document.getElementById('videos');
  if (!caixa) return;

  /* Aceita qualquer formato de link do YouTube e devolve só o código.
     ⚠️ Esta função existe igual no worker.js do painel, de propósito. Se um
     dia divergirem, um aceita link que o outro recusa e o André fica sem
     entender por quê. Mexeu aqui, mexe lá. */
  function codigoDoLink(link) {
    if (!link) return null;
    link = String(link).trim();
    if (!link) return null;
    if (/^[A-Za-z0-9_-]{11}$/.test(link)) return link;   // já é o código puro
    var padroes = [
      /[?&]v=([A-Za-z0-9_-]{11})/,          // youtube.com/watch?v=
      /youtu\.be\/([A-Za-z0-9_-]{11})/,      // youtu.be/
      /\/shorts\/([A-Za-z0-9_-]{11})/,       // /shorts/
      /\/embed\/([A-Za-z0-9_-]{11})/,        // /embed/
      /\/live\/([A-Za-z0-9_-]{11})/          // /live/
    ];
    for (var i = 0; i < padroes.length; i++) {
      var achou = link.match(padroes[i]);
      if (achou) return achou[1];
    }
    return null;
  }

  function normalizar(bruta) {
    return (bruta || [])
      .map(function (v) {
        return { codigo: codigoDoLink(v.codigo || v.link), titulo: v.titulo, nota: v.nota };
      })
      .filter(function (v) { return v.codigo; });
  }

  function escapar(txt) {
    return String(txt)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  var PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';

  function cartaoDe(v, indice, jaVisivel) {
    var cartao = document.createElement('article');
    cartao.className = 'video revela' + (jaVisivel ? ' visivel' : '');
    cartao.style.setProperty('--i', Math.min(indice, 5));

    var titulo = v.titulo || 'Vídeo no canal do André';
    var nota = v.nota || 'Assista sem sair do site';

    cartao.innerHTML =
      '<button class="video__tela" type="button" aria-label="Tocar: ' + escapar(titulo) + '">' +
        '<img src="https://i.ytimg.com/vi/' + v.codigo + '/maxresdefault.jpg" alt="" loading="lazy" ' +
             'onerror="this.onerror=null;this.src=\'https://i.ytimg.com/vi/' + v.codigo + '/hqdefault.jpg\'">' +
        '<span class="video__play">' + PLAY + '</span>' +
      '</button>' +
      '<div class="video__corpo">' +
        '<h3 class="video__titulo">' + escapar(titulo) + '</h3>' +
        '<p class="video__nota">' + escapar(nota) + '</p>' +
      '</div>';

    /* O player só nasce no clique. Autoplay aqui é permitido porque veio de
       um gesto do usuário. */
    var botao = cartao.querySelector('.video__tela');
    botao.addEventListener('click', function () {
      var quadro = document.createElement('iframe');
      quadro.src = 'https://www.youtube-nocookie.com/embed/' + v.codigo +
                   '?autoplay=1&rel=0&modestbranding=1';
      quadro.title = titulo;
      quadro.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
      quadro.allowFullscreen = true;
      quadro.loading = 'lazy';
      botao.replaceWith(quadro);
    });

    return cartao;
  }

  function vazio() {
    caixa.className = 'videos--vazio';
    caixa.innerHTML =
      'Os vídeos novos aparecem aqui assim que forem publicados no canal. ' +
      '<a class="link-seta" style="color:var(--dourado);margin-left:.4rem" href="' +
      CANAL_YOUTUBE + '" target="_blank" rel="noopener">Ver o canal <span>→</span></a>';
  }

  /* jaVisivel: na primeira pintura os cartões entram com a animação de
     revelar, como o resto da página. Na troca pela lista do painel eles já
     nascem visíveis, porque a essa altura o observador do site.js já passou
     por aqui e não voltaria pra ligar cartão novo. */
  function desenhar(lista, jaVisivel) {
    if (!lista.length) { vazio(); return; }
    caixa.className = 'videos';
    caixa.innerHTML = '';
    lista.forEach(function (v, i) { caixa.appendChild(cartaoDe(v, i, jaVisivel)); });
  }

  function assinatura(lista) {
    return lista.map(function (v) { return v.codigo + '|' + (v.titulo || '') + '|' + (v.nota || ''); }).join('~');
  }

  /* 1. reserva na tela imediatamente, sem esperar rede nenhuma */
  var local = normalizar(typeof VIDEOS !== 'undefined' ? VIDEOS : []);
  desenhar(local, false);

  /* 2. lista do painel entra por cima quando chegar.
     Qualquer falha (painel fora do ar, sem internet, resposta estranha) cai
     no catch e não faz nada: a reserva já está na tela. */
  if (window.fetch && API_VIDEOS) {
    fetch(API_VIDEOS, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (dados) {
        if (!dados) return;
        var doPainel = normalizar(dados.videos);
        if (!doPainel.length) return;                       // painel vazio: mantém a reserva
        if (assinatura(doPainel) === assinatura(local)) return;  // igual: não repinta à toa
        desenhar(doPainel, true);
      })
      .catch(function () { /* silêncio: a reserva já está na tela */ });
  }

  /* Liga o botão "ver o canal" do topo da seção, se existir. */
  var linkCanal = document.getElementById('link-canal');
  if (linkCanal) linkCanal.href = CANAL_YOUTUBE;
})();
