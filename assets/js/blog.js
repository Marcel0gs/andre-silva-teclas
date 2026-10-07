/* ===========================================================================
   BLOG

   ⚠️ O ANDRÉ NÃO MEXE NESTE ARQUIVO. Ele escreve e publica pelo painel,
   na aba "Blog":

       https://andreteclas.marcel0gs.workers.dev

   Os textos moram no Worker do painel, não aqui. Este arquivo só busca e
   desenha, em três lugares:

     1. HOME: os 3 textos mais novos, dentro da seção de vídeos. O bloco
        nasce escondido e só aparece se tiver texto publicado. Sem texto, ou
        com o painel fora do ar, a home fica exatamente como era: bloco vazio
        num site de cliente parece site quebrado.
     2. blog/index.html: todos os textos, o mais novo em destaque.
     3. blog/post.html?p=<slug>: um texto inteiro.

   O corpo do texto chega da API já em HTML, montado e escapado no Worker
   (função textoParaHtml do worker.js). Aqui ele só é encaixado na página.
   =========================================================================== */
(function () {
  'use strict';

  var API = 'https://andreteclas.marcel0gs.workers.dev';
  var SITE = 'https://marcel0gs.github.io/andre-silva-teclas';

  function esc(t) {
    return String(t == null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function dataLonga(ms) {
    if (!ms) return '';
    return new Date(ms).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function meta(p) {
    var partes = [dataLonga(p.data)];
    var min = Number(p.min) || 1;
    partes.push(min + ' min de leitura');
    return partes.filter(Boolean).join(' · ');
  }

  function buscar(caminho) {
    return fetch(API + caminho).then(function (r) {
      if (r.status === 404) { var e = new Error('nao-achou'); e.naoAchou = true; throw e; }
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    });
  }

  /* cartão de um texto. `prefixo` é o caminho até o post.html a partir da
     página onde o cartão aparece (a home e o blog estão em pastas diferentes) */
  function cartao(p, prefixo, i, destaque) {
    var a = document.createElement('a');
    a.className = 'post-card entra' + (destaque ? ' post-card--destaque' : '');
    a.href = prefixo + encodeURIComponent(p.slug);
    a.style.setProperty('--i', Math.min(i, 5));
    a.innerHTML =
      '<div class="post-card__capa">' +
        (p.capa
          ? '<img src="' + API + '/img/' + esc(p.capa) + '" alt="" loading="lazy" decoding="async">'
          : '<span class="post-card__nota" aria-hidden="true">♪</span>') +
      '</div>' +
      '<div class="post-card__corpo">' +
        '<p class="post-card__meta">' + esc(meta(p)) + '</p>' +
        '<h3 class="post-card__titulo">' + esc(p.titulo) + '</h3>' +
        (p.resumo ? '<p class="post-card__resumo">' + esc(p.resumo) + '</p>' : '') +
        '<span class="post-card__ler">Ler o texto <span aria-hidden="true">→</span></span>' +
      '</div>';
    return a;
  }

  /* vídeo dentro do texto: só a capa, e o player nasce no clique, igual à
     seção de vídeos da home */
  function ligarVideos(raiz) {
    raiz.querySelectorAll('[data-yt]').forEach(function (b) {
      b.addEventListener('click', function () {
        var f = document.createElement('iframe');
        f.src = 'https://www.youtube-nocookie.com/embed/' + b.getAttribute('data-yt') + '?autoplay=1&rel=0&modestbranding=1';
        f.title = 'Vídeo do André Silva Teclas';
        f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
        f.allowFullscreen = true;
        b.replaceWith(f);
      });
    });
  }

  /* COMO OS CARTÕES SE ARRUMAM numa grade que divide a linha (auto-fit):
       1 texto     vira o cartão horizontal de destaque. Cartão comum sozinho
                   esticava na largura toda, com uma capa de 700px de altura
       2 textos    meio a meio
       3 ou mais   o primeiro em destaque, fora da grade, e o resto dividindo
                   a linha (só na página do blog, com `destacarPrimeiro`)
     O destaque mora FORA da grade de propósito: um item ocupando a linha
     inteira impede o auto-fit de juntar as colunas vazias, e dois cartões
     ficavam com um buraco do lado. */
  function encaixar(grade, posts, prefixo, destacarPrimeiro) {
    var resto = posts;
    if (posts.length === 1 || (destacarPrimeiro && posts.length >= 3)) {
      grade.parentNode.insertBefore(cartao(posts[0], prefixo, 0, true), grade);
      resto = posts.slice(1);
    }
    resto.forEach(function (p, i) { grade.appendChild(cartao(p, prefixo, i + 1)); });
  }

  /* ======================================================== 1. HOME ===== */
  var home = document.getElementById('blog-home');
  if (home) {
    buscar('/api/posts').then(function (d) {
      var posts = (d && d.posts) || [];
      if (!posts.length) return;
      encaixar(home.querySelector('[data-lista]'), posts.slice(0, 3), 'blog/post.html?p=');
      home.hidden = false;
    }).catch(function () { /* silêncio: a home fica como era */ });
  }

  /* =================================================== 2. LISTA ========= */
  var pagLista = document.getElementById('blog-lista');
  if (pagLista) {
    var mostrar = function (qual) {
      document.querySelectorAll('[data-estado]').forEach(function (e) {
        e.hidden = e.getAttribute('data-estado') !== qual;
      });
    };
    buscar('/api/posts').then(function (d) {
      var posts = (d && d.posts) || [];
      pagLista.innerHTML = '';
      if (!posts.length) { mostrar('vazio'); return; }
      mostrar('');
      encaixar(pagLista, posts, 'post.html?p=', true);
    }).catch(function () {
      pagLista.innerHTML = '';
      mostrar('erro');
    });
  }

  /* ==================================================== 3. TEXTO ======== */
  var pagPost = document.getElementById('post');
  if (pagPost) {
    var slug = '';
    try { slug = new URLSearchParams(location.search).get('p') || ''; } catch (e) {}

    var naoAchou = function () {
      pagPost.hidden = true;
      document.getElementById('post-erro').hidden = false;
      document.title = 'Texto não encontrado | André Silva Teclas';
    };

    if (!slug) naoAchou();
    else buscar('/api/posts/' + encodeURIComponent(slug)).then(montar).catch(function (e) {
      if (e.naoAchou) { naoAchou(); return; }
      var corpo = pagPost.querySelector('[data-post-corpo]');
      corpo.innerHTML = '<p class="post-falhou">Não deu pra carregar o texto agora. ' +
        '<a href="">Tentar de novo</a></p>';
      pagPost.querySelector('[data-post-titulo]').textContent = 'Ops, a conexão falhou';
      pagPost.classList.add('post--pronto');
    });
  }

  function montar(d) {
    var p = d.post;
    var url = SITE + '/blog/post.html?p=' + encodeURIComponent(p.slug);

    /* título e descrição da aba e do Google */
    document.title = p.titulo + ' | André Silva Teclas';
    var desc = document.querySelector('meta[name="description"]');
    if (desc && p.resumo) desc.setAttribute('content', p.resumo);
    var canon = document.querySelector('link[rel="canonical"]');
    if (canon) canon.setAttribute('href', url);

    /* dado estruturado de artigo: é o que o Google usa pra mostrar data e
       autor no resultado da busca */
    var ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: p.titulo,
      description: p.resumo || undefined,
      image: p.capa ? API + '/img/' + p.capa : SITE + '/assets/img/og-capa.jpg',
      datePublished: new Date(p.data).toISOString(),
      author: { '@type': 'Person', name: 'André Silva', url: SITE + '/' },
      mainEntityOfPage: url,
    });
    document.head.appendChild(ld);

    pagPost.querySelector('[data-post-titulo]').textContent = p.titulo;
    pagPost.querySelector('[data-post-meta]').textContent = meta(p);

    var capa = pagPost.querySelector('[data-post-capa]');
    if (p.capa) {
      var img = capa.querySelector('img');
      img.src = API + '/img/' + p.capa;
      img.alt = '';
    } else {
      capa.hidden = true;
      pagPost.classList.add('post--sem-capa');
    }

    var corpo = pagPost.querySelector('[data-post-corpo]');
    corpo.innerHTML = p.html;
    ligarVideos(corpo);

    /* compartilhar: o link do Worker, que entrega a capa certa na prévia do
       WhatsApp (o link do site mostraria a capa genérica) */
    var link = d.compartilhar || url;
    var zap = pagPost.querySelector('[data-partilha-whats]');
    if (zap) zap.href = 'https://wa.me/?text=' + encodeURIComponent(p.titulo + '\n' + link);
    var copiar = pagPost.querySelector('[data-partilha-copiar]');
    if (copiar) copiar.addEventListener('click', function () {
      var feito = function () {
        copiar.textContent = 'Link copiado!';
        setTimeout(function () { copiar.textContent = 'Copiar link'; }, 2000);
      };
      if (navigator.clipboard) navigator.clipboard.writeText(link).then(feito, function () { prompt('Copie o link:', link); });
      else prompt('Copie o link:', link);
    });

    var outros = d.outros || [];
    var secOutros = document.querySelector('[data-outros-secao]');
    if (secOutros && outros.length) {
      encaixar(secOutros.querySelector('[data-outros]'), outros, 'post.html?p=');
      secOutros.hidden = false;
    }

    pagPost.classList.add('post--pronto');
  }
})();
