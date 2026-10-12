/* ===========================================================================
   RASTREIO (12/10/2026)

   ⚠️ O ANDRÉ NÃO MEXE NESTE ARQUIVO. Tudo que muda aqui ele muda no painel,
   na aba "Ajustes":

       https://andreteclas.marcel0gs.workers.dev

   O que este arquivo faz, em toda página:

     1. Conta a visita pro Resumo do painel (sem cookie e sem guardar IP;
        ver o topo do painel/banco.js) e recebe de volta os ajustes.
     2. Aplica os ajustes: número e mensagem do WhatsApp, link de checkout
        de cada curso, pixels (Meta, Google Analytics, Google Ads, TikTok e
        o código extra).
     3. Conta os cliques que importam: WhatsApp, checkout, play em vídeo e
        link pra fora. E avisa os pixels do clique no WhatsApp (Contato) e
        no checkout (Início de compra).

   Se o painel não responder, o site continua igual: o WhatsApp usa o
   número do site.js e os botões de compra caem no WhatsApp com o nome do
   curso. Só a contagem e os pixels ficam de fora.

   Pra suas próprias visitas não contarem: abrir o site com ?naocontar=1 no
   fim do endereço (o painel tem o botão pronto). ?naocontar=0 desfaz.

   Tem que carregar DEPOIS do site.js: o número de reserva mora lá.
   =========================================================================== */
(function () {
  'use strict';

  var API = 'https://andreteclas.marcel0gs.workers.dev';
  var CHAVE_NAO_CONTAR = 'andre-nao-contar';
  var CFG = { whatsapp: {}, comprar: {}, pixels: {} };

  /* --------------------------------------------- não contar este aparelho */
  var naoContar = false;
  try {
    var pedido = new URLSearchParams(location.search).get('naocontar');
    if (pedido === '1') {
      localStorage.setItem(CHAVE_NAO_CONTAR, '1');
      recado('Pronto: as visitas deste aparelho não entram mais na contagem do painel.');
    } else if (pedido === '0') {
      localStorage.removeItem(CHAVE_NAO_CONTAR);
      recado('Este aparelho voltou a ser contado no painel.');
    }
    naoContar = localStorage.getItem(CHAVE_NAO_CONTAR) === '1';
  } catch (e) {}

  function recado(texto) {
    var r = document.createElement('div');
    r.setAttribute('role', 'status');
    r.textContent = texto;
    r.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9999;max-width:90vw;' +
      'padding:14px 18px;border-radius:14px;background:#123a22;color:#d6f5e2;font:600 15px/1.4 "Inter Tight",system-ui,sans-serif;' +
      'box-shadow:0 18px 40px rgba(0,0,0,.45);text-align:center';
    document.body.appendChild(r);
    setTimeout(function () { r.remove(); }, 6000);
  }

  /* ------------------------------------------------------------ envio --- */
  function pagina() { return location.pathname + location.search; }

  /* Corpo em texto puro de propósito (ver o worker.js): é o que deixa o
     navegador mandar pra outro domínio sem pergunta prévia, e o que o
     sendBeacon aceita. O sendBeacon entrega mesmo se a pessoa sair da
     página no mesmo instante. */
  function contar(tipo, alvo) {
    if (naoContar) return;
    var corpo = JSON.stringify({ t: tipo, p: pagina(), a: String(alvo || '').slice(0, 80) });
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(API + '/api/e', corpo)) return;
    } catch (e) {}
    try { fetch(API + '/api/e', { method: 'POST', body: corpo, keepalive: true, credentials: 'omit' }); } catch (e) {}
  }

  /* --------------------------------------------------------- WhatsApp --- */
  function numero() {
    return String((CFG.whatsapp && CFG.whatsapp.numero) || window.WHATSAPP || '').replace(/\D/g, '');
  }
  function urlWhats(mensagem) {
    var m = mensagem || (CFG.whatsapp && CFG.whatsapp.mensagem) || window.WHATSAPP_MENSAGEM || '';
    return 'https://wa.me/' + numero() + (m ? '?text=' + encodeURIComponent(m) : '');
  }
  function abreFora(a) { a.target = '_blank'; a.rel = 'noopener'; }

  function cursoDaPagina() {
    var m = location.pathname.match(/\/cursos\/([^/]+)\//);
    return m ? m[1] : '';
  }
  function nomeDoCurso() {
    return document.title.split('|')[0].trim();
  }

  /* O que está sendo comprado: no cartão da página inicial, o título do
     cartão (produtos sem página própria, como o Pad Contínuo); na página de
     um curso, o nome do curso. */
  function nomeDaCompra(a) {
    var t = a.querySelector('.curso__titulo');
    return t ? t.textContent.trim() : nomeDoCurso();
  }

  /* Botão de compra (data-comprar): vai pro checkout salvo no painel; sem
     checkout, pro link que já está no HTML (se for de fora); sem nenhum
     dos dois, pro WhatsApp com o nome do produto já escrito. */
  function prepararCompra(a) {
    if (!a.hasAttribute('data-href-original')) a.setAttribute('data-href-original', a.getAttribute('href') || '');
    var original = a.getAttribute('data-href-original');
    var link = (CFG.comprar || {})[a.getAttribute('data-comprar')] || (/^https:\/\//.test(original) ? original : '');
    if (link) {
      a.href = link;
      a.setAttribute('data-destino', 'checkout');
      abreFora(a);
    } else if (numero()) {
      a.href = urlWhats(a.querySelector('.curso__titulo')
        ? 'Oi André! Vi no site e tenho interesse no ' + nomeDaCompra(a) + '.'
        : 'Oi André! Quero me inscrever no curso ' + nomeDoCurso() + '.');
      a.setAttribute('data-destino', 'whatsapp');
      abreFora(a);
    } else {
      a.setAttribute('data-destino', 'whatsapp');
    }
  }

  function aplicar() {
    if (numero()) {
      document.querySelectorAll('[data-whats]').forEach(function (a) { a.href = urlWhats(); abreFora(a); });
    }
    document.querySelectorAll('[data-comprar]').forEach(prepararCompra);
  }

  /* --------------------------------------------------------- pixels ----- */
  var ligado = {};

  function carregarPixels() {
    var p = CFG.pixels || {};
    try {
      if (p.meta && !ligado.meta) {
        /* código oficial do Pixel do Meta */
        !function (f, b, e, v, n, t, s) {
          if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
          if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0;
          t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
        }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
        window.fbq('init', p.meta);
        window.fbq('track', 'PageView');
        ligado.meta = true;
      }

      var google = [p.ga4, p.ads].filter(Boolean);
      if (google.length && !ligado.google) {
        var g = document.createElement('script');
        g.async = true;
        g.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(google[0]);
        document.head.appendChild(g);
        window.dataLayer = window.dataLayer || [];
        window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
        window.gtag('js', new Date());
        google.forEach(function (id) { window.gtag('config', id); });
        ligado.google = true;
      }

      if (p.tiktok && !ligado.tiktok) {
        /* código oficial do Pixel do TikTok */
        !function (w, d, t) {
          w.TiktokAnalyticsObject = t; var ttq = w[t] = w[t] || [];
          ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie', 'holdConsent', 'revokeConsent', 'grantConsent'];
          ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); }; };
          for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
          ttq.instance = function (t) { for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]); return e; };
          ttq.load = function (e, n) {
            var r = 'https://analytics.tiktok.com/i18n/pixel/events.js', o = n && n.partner;
            ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._i[e]._u = r; ttq._t = ttq._t || {}; ttq._t[e] = +new Date;
            ttq._o = ttq._o || {}; ttq._o[e] = n || {}; n = document.createElement('script'); n.type = 'text/javascript';
            n.async = !0; n.src = r + '?sdkid=' + e + '&lib=' + t; e = document.getElementsByTagName('script')[0];
            e.parentNode.insertBefore(n, e);
          };
        }(window, document, 'ttq');
        window.ttq.load(p.tiktok);
        window.ttq.page();
        ligado.tiktok = true;
      }

      if (p.extra && !ligado.extra) {
        // fragmento "contextual": é o único jeito de um <script> colado
        // como texto rodar de verdade (pelo innerHTML ele fica parado)
        var faixa = document.createRange();
        faixa.selectNodeContents(document.head);
        document.head.appendChild(faixa.createContextualFragment(p.extra));
        ligado.extra = true;
      }
    } catch (e) {}

    if (cursoDaPagina() && !ligado.curso) {
      ligado.curso = true;
      avisarPixels('curso', nomeDoCurso());
    }
  }

  /* o que cada plataforma recebe em cada momento */
  function avisarPixels(evento, nome) {
    var p = CFG.pixels || {};
    try {
      if (evento === 'whatsapp') {
        if (window.fbq) window.fbq('track', 'Contact');
        if (window.gtag && p.ga4) window.gtag('event', 'generate_lead', { method: 'whatsapp' });
        if (window.gtag && p.ads && p.adsZap) window.gtag('event', 'conversion', { send_to: p.ads + '/' + p.adsZap });
        if (window.ttq) window.ttq.track('Contact');
      } else if (evento === 'checkout') {
        if (window.fbq) window.fbq('track', 'InitiateCheckout', { content_name: nome });
        if (window.gtag && p.ga4) window.gtag('event', 'begin_checkout', { items: [{ item_name: nome }] });
        if (window.gtag && p.ads && p.adsCheckout) window.gtag('event', 'conversion', { send_to: p.ads + '/' + p.adsCheckout });
        if (window.ttq) window.ttq.track('InitiateCheckout', { content_name: nome });
      } else if (evento === 'curso') {
        if (window.fbq) window.fbq('track', 'ViewContent', { content_name: nome, content_type: 'product' });
        if (window.gtag && p.ga4) window.gtag('event', 'view_item', { items: [{ item_name: nome }] });
        if (window.ttq) window.ttq.track('ViewContent', { content_name: nome });
      }
    } catch (e) {}
  }

  /* ---------------------------------------------------------- cliques --- */
  function ondeEsta(a) {
    if (a.classList.contains('whats-flutuante')) return 'flutuante';
    if (a.closest('.nav')) return 'menu';
    if (a.closest('.post-corpo')) return 'texto-do-blog';
    if (a.closest('footer, .rodape')) return 'rodape';
    var secao = a.closest('section[id]');
    if (secao) return secao.id;
    if (a.closest('.chamada')) return 'chamada-final';
    return 'pagina';
  }

  // fase de captura: roda antes do clique seguir, a tempo de acertar o
  // endereço do botão (texto do blog e cartões entram depois do carregamento)
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a, button') : null;
    if (!a) return;

    if (a.hasAttribute('data-comprar')) {
      prepararCompra(a);
      if (a.getAttribute('data-destino') === 'checkout') {
        contar('checkout', a.getAttribute('data-comprar'));
        avisarPixels('checkout', nomeDaCompra(a));
      } else {
        contar('whatsapp', 'compra:' + a.getAttribute('data-comprar'));
        avisarPixels('whatsapp');
      }
      return;
    }
    if (a.hasAttribute('data-whats')) {
      if (numero()) { a.href = urlWhats(); abreFora(a); }
      contar('whatsapp', ondeEsta(a));
      avisarPixels('whatsapp');
      return;
    }
    if (a.hasAttribute('data-partilha-whats')) { contar('link', 'compartilhar-whatsapp'); return; }
    if (a.hasAttribute('data-partilha-copiar')) { contar('link', 'copiar-link'); return; }
    if (a.hasAttribute('data-vsl')) { contar('video', 'vsl:' + cursoDaPagina() + ':' + a.getAttribute('data-vsl')); return; }
    if (a.hasAttribute('data-video')) { contar('video', 'galeria:' + a.getAttribute('data-video')); return; }
    if (a.hasAttribute('data-yt')) { contar('video', 'blog:' + a.getAttribute('data-yt')); return; }

    if (a.tagName !== 'A' || !a.href) return;
    var u;
    try { u = new URL(a.href, location.href); } catch (err) { return; }
    if (u.host === location.host || !/^https?:$/.test(u.protocol)) return;
    if (API.indexOf('//' + u.host) > 0) return;   // botão "Painel do André", do rodapé
    if (/(^|\.)wa\.me$|whatsapp\.com$/.test(u.hostname)) {
      contar('whatsapp', ondeEsta(a));
      avisarPixels('whatsapp');
      return;
    }
    if (/hotmart|kiwify|eduzz|monetizze/.test(u.hostname)) {
      contar('checkout', cursoDaPagina() || u.hostname);
      avisarPixels('checkout', nomeDoCurso());
      return;
    }
    contar('link', (u.hostname.replace(/^www\./, '') + u.pathname).replace(/\/$/, ''));
  }, true);

  /* ------------------------------------------------------------ início --- */
  aplicar();

  fetch(API + '/api/v', {
    method: 'POST',
    body: JSON.stringify({ p: pagina(), r: document.referrer, nc: naoContar ? 1 : 0 }),
    credentials: 'omit',
    keepalive: true,
  })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (c) {
      if (!c) return;
      CFG = { whatsapp: c.whatsapp || {}, comprar: c.comprar || {}, pixels: c.pixels || {} };
      aplicar();
      carregarPixels();
    })
    .catch(function () {});
})();
