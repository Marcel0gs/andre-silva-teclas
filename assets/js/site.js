/* ===========================================================================
   André Silva Teclas — comportamento compartilhado. Sem dependência externa.

   Reconstrução 19/09/2026. O que existe aqui, em ordem:
     1. (o scroll suave por interpolação foi removido, ver o bloco 1)
     2. revelar ao rolar, com cascata
     3. hero coberto pelo scroll (07/10/2026)
     3b. camadas em parallax pelo resto da página (07/10/2026)
     4. nav que muda ao rolar
     5. rastro do cursor
     6. perguntas (FAQ)
     7. teclado tocável

   REGRA QUE NÃO SE QUEBRA: tudo que anima aqui mexe só em transform e
   opacity. Qualquer outra propriedade força recálculo de layout a cada
   quadro e é exatamente daí que vem o engasgo em celular intermediário.
   =========================================================================== */

/* ===========================================================================
   ╔═══════════════════════════════════════════════════════════════════════╗
   ║   ANDRÉ: PONHA SEU NÚMERO DE WHATSAPP AQUI.                           ║
   ║                                                                       ║
   ║   Escreva com código do país e DDD, só números:                       ║
   ║       Brasil (55) + DDD + número                                      ║
   ║       exemplo de Minas: "5531999998888"                               ║
   ║                                                                       ║
   ║   Enquanto estiver vazio, os botões de WhatsApp do site apenas        ║
   ║   descem até a seção de contato, sem abrir conversa nenhuma.          ║
   ╚═══════════════════════════════════════════════════════════════════════╝
   =========================================================================== */
var WHATSAPP = "5531989356183";

var WHATSAPP_MENSAGEM = "Oi André! Vi seu site e quero saber qual curso é melhor pro meu nível.";


(function () {
  'use strict';

  var reduzMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var temMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---- liga todos os botões de WhatsApp de uma vez ----
     Cada botão no HTML tem data-whats. Assim o número mora num lugar só,
     em vez de espalhado por cinco links que é fácil esquecer de trocar. */
  (function () {
    var numero = String(WHATSAPP || '').replace(/\D/g, '');
    if (!numero) return;                       // vazio: mantém o rolar até #contato
    var url = 'https://wa.me/' + numero +
              '?text=' + encodeURIComponent(WHATSAPP_MENSAGEM || '');
    document.querySelectorAll('[data-whats]').forEach(function (a) {
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
    });
  })();

  /* ======================================================================
     1. SCROLL SUAVE: REMOVIDO EM 19/09/2026

     Existia aqui uma interpolação que arrastava o #palco atrás do scroll
     nativo, pra imitar a "manteiga" dos sites de referência.

     Foi retirada porque o usuário sentiu exatamente o defeito que ela
     costuma ter: ao soltar a rolagem, a página dava mais um movimento
     e parecia travada. O motivo é que a roda do Chrome JÁ rola com
     animação própria; somar a nossa por cima empilha duas suavizações, e
     o que era pra ser maciez vira atraso. Em cima disso, transformar o
     invólucro da página inteira a cada quadro obriga o navegador a
     repintar tudo, e em página longa isso derruba quadro.

     NÃO REINTRODUZIR sem ter como medir quadro a quadro num aparelho
     real. A fluidez do site não dependia disso: ela vem da curva de saída
     longa, da cascata entre irmãos e de só animar transform e opacity.

     O #palco continua no HTML e continua útil (é onde nav e botão
     flutuante NÃO podem entrar), mas agora nada o transforma.
     ====================================================================== */

  /* ======================================================================
     2. REVELAR AO ROLAR, COM CASCATA

     O --i é o índice do elemento entre os irmãos, e vira atraso no CSS.
     Sem isso tudo entra junto e parece barato, mesmo com a curva certa.
     ====================================================================== */
  var alvos = document.querySelectorAll('.revela, .moldura');

  // numera cada grupo de irmãos separadamente
  var porPai = new Map();
  alvos.forEach(function (el) {
    var pai = el.parentNode;
    var n = porPai.get(pai) || 0;
    if (!el.style.getPropertyValue('--i')) {
      el.style.setProperty('--i', Math.min(n, 6));  // teto: cascata longa demais vira espera
    }
    porPai.set(pai, n + 1);
  });

  if ('IntersectionObserver' in window && !reduzMovimento) {
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('visivel');
        obs.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    alvos.forEach(function (el) { obs.observe(el); });
  } else {
    alvos.forEach(function (el) { el.classList.add('visivel'); });
  }

  /* ======================================================================
     3. HERO COBERTO PELO SCROLL (07/10/2026)

     O hero fica parado (sticky) e a página sobe por cima dele, como no
     site do Marcelo. A variável --cobre vai de 0 a 1 conforme ele é
     coberto, e o CSS usa ela pra mover cada camada numa velocidade: a
     marca desce devagar, a figura recua, o texto sobe e apaga. É o
     cruzamento das velocidades que dá profundidade.

     ⚠️ O parallax antigo daqui escrevia style.transform na marca e na
     figura, e NUNCA FUNCIONOU: as duas têm animação de entrada com
     `forwards` em transform e opacity, e animação vence estilo inline.
     As camadas agora mexem nas propriedades `translate` e `scale`, que a
     animação de entrada não toca.

     A altura do hero fica em cache e só é relida no resize: por quadro,
     só window.scrollY, que não força recálculo de layout.

     (O parallax de MOUSE saiu em 19/09/2026 a pedido do usuário e
     continua fora.)
     ====================================================================== */
  var heroCobre = document.querySelector('.hero');
  if (heroCobre) {
    var provas = document.querySelector('.provas');
    var videoHero = heroCobre.querySelector('.hero__arte-video');
    var inicioCobre = 0, pedidoCobre = false, cobertoAntes = false;

    var medirHero = function () {
      var alturaHero = heroCobre.offsetHeight;
      // hero mais alto que a tela: só trava depois de mostrar o fim dele
      heroCobre.style.setProperty('--hero-topo', Math.min(0, window.innerHeight - alturaHero) + 'px');
      inicioCobre = Math.max(0, alturaHero - window.innerHeight);
      atualizarCobre();
    };
    var atualizarCobre = function () {
      pedidoCobre = false;
      var p = (window.scrollY - inicioCobre) / window.innerHeight;
      p = p < 0 ? 0 : p > 1 ? 1 : p;
      var valor = reduzMovimento ? '0' : p.toFixed(3);
      heroCobre.style.setProperty('--cobre', valor);
      if (provas) provas.style.setProperty('--cobre', valor);
      // coberto de todo: pausa o vídeo, que ninguém está vendo
      var coberto = p >= 1;
      if (videoHero && coberto !== cobertoAntes) {
        if (coberto) videoHero.pause();
        else { var tocando = videoHero.play(); if (tocando && tocando.catch) tocando.catch(function () {}); }
      }
      cobertoAntes = coberto;
    };
    window.addEventListener('scroll', function () {
      if (!pedidoCobre) { pedidoCobre = true; requestAnimationFrame(atualizarCobre); }
    }, { passive: true });
    window.addEventListener('resize', medirHero);
    medirHero();
  }

  /* ======================================================================
     3b. CAMADAS EM PARALLAX PELO RESTO DA PÁGINA

     Quatro tipos, todos marcados no HTML:
       data-px="v"        anda na vertical (distância do centro da tela × v)
       data-px-x="v"      anda na horizontal (a pauta do "Como funciona")
       data-px-img="px"   foto andando dentro da moldura, até ±px
       data-inclina       chega deitado pra trás e assenta ao subir (o
                          teclado tocável). Nunca some: só muda o ângulo.

     Escrevem nas propriedades `translate` e `rotate`, nunca em transform:
     assim não brigam com a animação de entrada (.revela), com o zoom de
     hover das capas nem com a flutuação das notas.
     Todas as medições são lidas ANTES de qualquer escrita: ler e escrever
     intercalado obriga o navegador a refazer o layout a cada elemento.
     No celular as distâncias caem pela metade (padrão das placas NFC).
     ====================================================================== */
  if (!reduzMovimento) {
    var pxCamadas = [];
    var juntar = function (sel, tipo, attr) {
      document.querySelectorAll(sel).forEach(function (el) {
        // referência da medida: a moldura (foto), o próprio elemento (o
        // teclado que inclina, senão ele mede a seção e chega quase reto)
        // ou a seção inteira (camadas soltas)
        var ref = tipo === 'img' ? el.parentElement
                : tipo === 'inclina' || tipo === 'preenche' ? el
                : (el.closest('section, header, footer') || el.parentElement);
        pxCamadas.push({ el: el, tipo: tipo, v: parseFloat(el.getAttribute(attr)) || 0, ref: ref });
      });
    };
    juntar('[data-px]', 'y', 'data-px');
    juntar('[data-px-x]', 'x', 'data-px-x');
    juntar('[data-px-img]', 'img', 'data-px-img');
    juntar('[data-inclina]', 'inclina', 'data-inclina');
    juntar('[data-preenche]', 'preenche', 'data-preenche');

    if (pxCamadas.length) {
      var pedidoPx = false;
      var aplicarPx = function () {
        pedidoPx = false;
        var alt = window.innerHeight, meio = alt / 2;
        var fator = window.innerWidth < 700 ? 0.5 : 1;
        // 1) só leitura
        var medidas = pxCamadas.map(function (c) { return c.ref.getBoundingClientRect(); });
        // 2) só escrita
        pxCamadas.forEach(function (c, i) {
          var r = medidas[i];
          if (r.bottom < -300 || r.top > alt + 300) return;      // fora da tela: nem mexe
          var dist = (r.top + r.height / 2) - meio;
          if (c.tipo === 'y') {
            c.el.style.translate = '0 ' + (dist * c.v * fator).toFixed(1) + 'px';
          } else if (c.tipo === 'x') {
            c.el.style.translate = (dist * c.v * fator).toFixed(1) + 'px 0';
          } else if (c.tipo === 'img') {
            var n = Math.max(-1, Math.min(1, dist / alt));       // -1 a 1
            c.el.style.translate = '0 ' + (n * c.v * fator).toFixed(1) + 'px';
          } else if (c.tipo === 'preenche') {
            // trilho do "Como funciona": vazio com ele a 85% da tela, cheio a
            // 40%. Os nós acendem quando a linha passa por eles.
            var enche = Math.max(0, Math.min(1, (alt * 0.85 - r.top) / (alt * 0.45)));
            c.el.style.scale = enche.toFixed(3) + ' 1';
            if (!c.nos) c.nos = c.el.closest('.passos-trilho').querySelectorAll('[data-no]');
            Array.prototype.forEach.call(c.nos, function (no) {
              no.classList.toggle('aceso', enche >= parseInt(no.getAttribute('data-no'), 10) / 2 - 0.001);
            });
          } else {
            // 0 quando o topo encosta no pé da tela, 1 quando chega a 30% dela
            var prog = Math.max(0, Math.min(1, (alt - r.top) / (alt * 0.7)));
            c.el.style.rotate = 'x ' + ((1 - prog) * 26 * fator).toFixed(2) + 'deg';
          }
        });
      };
      var pedirPx = function () { if (!pedidoPx) { pedidoPx = true; requestAnimationFrame(aplicarPx); } };
      window.addEventListener('scroll', pedirPx, { passive: true });
      window.addEventListener('resize', pedirPx);
      window.addEventListener('load', pedirPx);
      aplicarPx();
    }
  }

  /* ======================================================================
     4. NAV
     ====================================================================== */
  var nav = document.querySelector('.nav');
  if (nav) {
    var marcarNav = function () { nav.classList.toggle('nav--rolado', window.scrollY > 40); };
    marcarNav();
    window.addEventListener('scroll', marcarNav, { passive: true });
  }

  /* ======================================================================
     5. RASTRO DO CURSOR
     Linha dourada curta que desenha o caminho do mouse e some em ~320ms,
     com a ponta mais grossa que a cauda. Encurtado em 19/09/2026: em 700ms
     a linha varria meia tela e virava o elemento mais chamativo da página.
     ====================================================================== */
  if (temMouse && !reduzMovimento) {
    var tela = document.createElement('canvas');
    tela.id = 'rastro';
    document.body.appendChild(tela);
    document.body.classList.add('cursor-proprio');
    var c = tela.getContext('2d');
    var pontos = [];
    var VIDA = 320;   // rastro curto: em 700ms a linha varria meia tela e
                      // virava o elemento mais chamativo da pagina

    function dimensionar() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      tela.width = window.innerWidth * dpr;
      tela.height = window.innerHeight * dpr;
      tela.style.width = window.innerWidth + 'px';
      tela.style.height = window.innerHeight + 'px';
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    dimensionar();
    window.addEventListener('resize', dimensionar);

    window.addEventListener('mousemove', function (ev) {
      pontos.push({ x: ev.clientX, y: ev.clientY, t: performance.now() });
      if (pontos.length > 40) pontos.shift();
    }, { passive: true });

    (function desenhar() {
      requestAnimationFrame(desenhar);
      var agora = performance.now();
      while (pontos.length && agora - pontos[0].t > VIDA) pontos.shift();
      c.clearRect(0, 0, window.innerWidth, window.innerHeight);
      if (pontos.length < 3) return;

      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.shadowColor = 'rgba(255, 196, 107, .55)';
      c.shadowBlur = 8;

      for (var i = 1; i < pontos.length - 1; i++) {
        var p0 = pontos[i - 1], p1 = pontos[i], p2 = pontos[i + 1];
        var vida = 1 - (agora - p1.t) / VIDA;
        if (vida <= 0) continue;
        c.beginPath();
        c.moveTo((p0.x + p1.x) / 2, (p0.y + p1.y) / 2);
        c.quadraticCurveTo(p1.x, p1.y, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
        c.strokeStyle = 'rgba(255, 196, 107, ' + (vida * 0.9).toFixed(3) + ')';
        c.lineWidth = 0.5 + vida * 2.4;
        c.stroke();
      }
      c.shadowBlur = 0;
    })();
  }

  /* ======================================================================
     5b. PLACAR E CARROSSEL DOS DEPOIMENTOS

     Formato vindo do site da Realce Odonto. O número entra antes dos
     depoimentos porque número não depende de quem lê acreditar em elogio.

     Sem JS nada disso quebra: a nota já está escrita no HTML, as estrelas
     já aparecem cheias e os depoimentos ficam empilhados e legíveis. O JS
     só acrescenta a contagem, o preenchimento e o deslizar.
     ====================================================================== */
  function formataNota(v, casas) {
    return casas ? v.toFixed(casas).replace('.', ',') : String(Math.round(v));
  }
  function contar(el) {
    var alvo = parseFloat(el.getAttribute('data-alvo'));
    var casas = parseInt(el.getAttribute('data-casas') || '0', 10);
    if (reduzMovimento || !window.requestAnimationFrame) {
      el.textContent = formataNota(alvo, casas); return;
    }
    var t0 = null, dur = 1500;
    requestAnimationFrame(function passo(t) {
      if (t0 === null) t0 = t;
      var p = Math.min((t - t0) / dur, 1);
      var e = 1 - Math.pow(1 - p, 3);          // easeOutCubic
      el.textContent = formataNota(alvo * e, casas);
      if (p < 1) requestAnimationFrame(passo);
    });
  }

  var placar = document.querySelector('[data-placar]');
  if (placar) {
    var dispararPlacar = function () {
      placar.querySelectorAll('[data-conta]').forEach(contar);
      var est = placar.querySelector('[data-estrelas]');
      if (est) est.classList.add('contou');
    };
    if (!('IntersectionObserver' in window)) {
      dispararPlacar();
    } else {
      var obsP = new IntersectionObserver(function (is) {
        is.forEach(function (i) { if (i.isIntersecting) { dispararPlacar(); obsP.disconnect(); } });
      }, { threshold: 0.35 });
      obsP.observe(placar);
    }
  }

  var car = document.querySelector('[data-carrossel]');
  if (car) (function () {
    var trilho = car.querySelector('[data-trilho]');
    var slides = Array.prototype.slice.call(trilho.children);
    if (slides.length < 2) return;

    car.classList.add('carrossel--on');
    var pontos = car.querySelector('[data-pontos]');
    var atual = 0, timer = null, INTERVALO = 6000;

    function ir(n) {
      atual = (n + slides.length) % slides.length;
      trilho.style.transform = 'translate3d(' + (-atual * 100) + '%,0,0)';
      Array.prototype.forEach.call(pontos.children, function (p, i) {
        p.setAttribute('aria-current', i === atual ? 'true' : 'false');
      });
      // esconde os inativos do leitor de tela, senão ele lê os quatro
      // depoimentos seguidos como se fossem um parágrafo só
      slides.forEach(function (s, i) { s.setAttribute('aria-hidden', i === atual ? 'false' : 'true'); });
    }
    function parar() { if (timer) { clearInterval(timer); timer = null; } }
    function girar() { parar(); if (!reduzMovimento) timer = setInterval(function () { ir(atual + 1); }, INTERVALO); }

    slides.forEach(function (s, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ponto';
      b.setAttribute('aria-label', 'Depoimento ' + (i + 1) + ' de ' + slides.length);
      b.addEventListener('click', function () { ir(i); girar(); });
      pontos.appendChild(b);
    });

    car.querySelector('[data-anterior]').addEventListener('click', function () { ir(atual - 1); girar(); });
    car.querySelector('[data-proximo]').addEventListener('click', function () { ir(atual + 1); girar(); });

    /* ⚠️ NÃO por o pausar no carrossel inteiro. Ele fica no meio da página, e
       quem rola de mouse deixa o cursor parado bem em cima dele: o giro
       automático nunca acontecia e parecia defeito. Pausar só na faixa dos
       controles resolve sem perder o "para quando alguém vai interagir". */
    var controles = car.querySelector('.carrossel__controles');
    if (controles) {
      controles.addEventListener('mouseenter', parar);
      controles.addEventListener('mouseleave', girar);
    }
    car.addEventListener('focusin', parar);
    car.addEventListener('focusout', girar);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) parar(); else girar();
    });

    // arrastar com o dedo
    var x0 = null;
    car.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; parar(); }, { passive: true });
    car.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) ir(atual + (dx < 0 ? 1 : -1));
      x0 = null;
      girar();
    }, { passive: true });

    ir(0);
    girar();
  })();

  /* ======================================================================
     6. PERGUNTAS (FAQ)
     ====================================================================== */
  document.querySelectorAll('[data-pergunta]').forEach(function (item) {
    var botao = item.querySelector('.pergunta__topo');
    if (!botao) return;
    botao.addEventListener('click', function () {
      var aberto = item.classList.toggle('pergunta--aberta');
      botao.setAttribute('aria-expanded', aberto ? 'true' : 'false');
    });
  });

  /* ======================================================================
     7. TECLADO TOCÁVEL
     Web Audio só nasce no primeiro toque (política de autoplay).

     Duas oitavas também no celular (07/10/2026, pedido do usuário): com
     uma só sobravam 8 teclas e o instrumento parecia de brinquedo. As teclas
     ficam mais finas (~22px num aparelho de 390), e o instrumento estica
     quase até a borda da tela pra compensar (CSS, .instrumento no celular).
     ====================================================================== */
  var raiz = document.getElementById('teclado');
  if (!raiz) return;

  var OITAVAS = 2;
  var PALETA = ['var(--paleta-0)', 'var(--paleta-1)', 'var(--paleta-2)'];
  var SEMITOM = { C:-9,'C#':-8, D:-7,'D#':-6, E:-5, F:-4,'F#':-3, G:-2,'G#':-1, A:0,'A#':1, B:2 };
  var ORDEM = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  var ctx = null;

  function freqDe(letra, oitava) {
    return 440 * Math.pow(2, (SEMITOM[letra] + (oitava - 4) * 12) / 12);
  }

  function tocar(freq) {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') ctx.resume();
    var t = ctx.currentTime;
    var ganho = ctx.createGain();
    var filtro = ctx.createBiquadFilter();
    filtro.type = 'lowpass'; filtro.frequency.value = 2600;
    var o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = freq;
    var o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = freq * 2;
    var g2 = ctx.createGain(); g2.gain.value = .18;
    o1.connect(ganho); o2.connect(g2); g2.connect(ganho);
    ganho.connect(filtro); filtro.connect(ctx.destination);
    ganho.gain.setValueAtTime(0, t);
    ganho.gain.linearRampToValueAtTime(.5, t + .012);
    ganho.gain.exponentialRampToValueAtTime(.001, t + .8);
    o1.start(t); o2.start(t); o1.stop(t + .85); o2.stop(t + .85);
  }

  function efeito(tecla, cor) {
    if (reduzMovimento) return;
    var b = document.createElement('div');
    b.className = 'brilho';
    b.style.setProperty('--cor', cor);
    tecla.appendChild(b);
    requestAnimationFrame(function () { b.classList.add('brilho--ativa'); });
    b.addEventListener('animationend', function () { b.remove(); });
    for (var i = 0; i < 6; i++) {
      var p = document.createElement('div');
      p.className = 'particula';
      p.style.setProperty('--cor', cor);
      p.style.left = (40 + Math.random() * 20) + '%';
      p.style.top = '10%';
      p.style.setProperty('--dx', (Math.random() * 40 - 20) + 'px');
      tecla.appendChild(p);
      p.addEventListener('animationend', function () { this.remove(); });
    }
  }

  function ligar(el, letra, oitava, indiceCor) {
    var freq = freqDe(letra, oitava);
    var cor = PALETA[indiceCor % PALETA.length];
    el.addEventListener('pointerdown', function (ev) {
      ev.preventDefault();
      el.classList.add('tecla--ativa');
      tocar(freq);
      efeito(el, cor);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (nome) {
      el.addEventListener(nome, function () { el.classList.remove('tecla--ativa'); });
    });
  }

  var notas = [];
  for (var o = 0; o < OITAVAS; o++) {
    ORDEM.forEach(function (letra) {
      notas.push({ letra: letra, oitava: 4 + o, preta: letra.indexOf('#') > -1 });
    });
  }
  notas.push({ letra: 'C', oitava: 4 + OITAVAS, preta: false });

  var corIndice = 0, brancas = [];
  notas.forEach(function (n) {
    if (n.preta) return;
    var el = document.createElement('div');
    el.className = 'tecla tecla--branca';
    raiz.appendChild(el);
    brancas.push(el);
    ligar(el, n.letra, n.oitava, corIndice++);
  });

  /* Teclas pretas em PORCENTAGEM da faixa de cada branca, não em pixel
     medido: as brancas são fatias iguais (flex:1, margem inclusa), então a
     divisa entre a branca k e a k+1 cai exatamente em k/n do teclado. Em
     pixel, girar o celular ou mudar a janela deixava as pretas fora do
     lugar, e até estourando a largura da página. */
  var fatia = 100 / brancas.length;
  var conta = -1;
  notas.forEach(function (n) {
    if (!n.preta) { conta++; return; }
    var el = document.createElement('div');
    el.className = 'tecla tecla--preta';
    el.style.width = (fatia * .62) + '%';
    el.style.left = ((conta + 1) * fatia - fatia * .31) + '%';
    raiz.appendChild(el);
    ligar(el, n.letra, n.oitava, corIndice++);
  });

  /* ======================================================================
     8. TELAS QUE TOCAM, NO "COMO FUNCIONA" (07/10/2026)
     Cada passo do método tem uma tela que toca o que ele ensina, com o
     mesmo som do teclado de cima:
       data-acorde="C4 E4 G4"   notas, tocadas quase juntas (arpejo curto)
       data-modo="intervalo"    notas separadas, pra treinar o ouvido; a
                                tela pergunta e só depois mostra a resposta
                                (data-resposta)
     ====================================================================== */
  document.querySelectorAll('[data-acorde]').forEach(function (tela) {
    var notas = tela.getAttribute('data-acorde').split(' ').map(function (n) {
      var m = n.match(/^([A-G]#?)(\d)$/);
      return m ? freqDe(m[1], parseInt(m[2], 10)) : null;
    }).filter(Boolean);
    var intervalo = tela.getAttribute('data-modo') === 'intervalo';
    var lcd = tela.querySelector('[data-lcd]');
    var pergunta = lcd ? lcd.innerHTML : '';
    var resposta = tela.getAttribute('data-resposta');
    var espera = null;

    tela.addEventListener('click', function () {
      tela.classList.remove('tocando');
      void tela.offsetWidth;                 // reinicia a animação se tocar de novo
      tela.classList.add('tocando');
      notas.forEach(function (f, i) {
        setTimeout(function () { tocar(f); }, i * (intervalo ? 480 : 60));
      });
      if (intervalo && lcd && resposta) {
        clearTimeout(espera);
        lcd.innerHTML = pergunta;
        espera = setTimeout(function () {
          lcd.innerHTML = resposta;
          espera = setTimeout(function () { lcd.innerHTML = pergunta; }, 3200);
        }, notas.length * 480 + 250);
      }
    });
  });
})();
