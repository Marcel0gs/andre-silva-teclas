/* ===========================================================================
   PÁGINA DE CURSO MONTADA PELO PAINEL (04/11/2026)

   ⚠️ O ANDRÉ NÃO MEXE NESTE ARQUIVO. O curso é criado na aba "Cursos" do
   painel (https://painel.andresilvateclas.com.br) e esta página só monta o
   que vem de lá, no mesmo molde das páginas fixas de site/cursos/.

   Endereço: cursos/curso.html?c=<slug>   (prévia: &previa=<código do painel>)

   Ordem das coisas, e por quê:
     1. busca o curso no painel
     2. monta a página
     3. SÓ ENTÃO carrega o site.js e o rastreio.js. Eles ligam o play do
        vídeo, as perguntas, a animação de entrada e o botão de compra no
        que já está na página; carregados antes, não achariam nada. E o
        rastreio lê o nome do curso no título da aba, que só existe depois.

   Se o painel não responder, a página diz isso e oferece o WhatsApp.
   =========================================================================== */
(function () {
  'use strict';

  var API = 'https://painel.andresilvateclas.com.br';
  var SITE = 'https://andresilvateclas.com.br';
  var NIVEIS = {
    iniciante: 'para iniciantes',
    'ini-inter': 'do iniciante ao intermediário',
    intermediario: 'nível intermediário',
    'inter-avan': 'intermediário e avançado',
    todos: 'para todos os níveis'
  };

  var params = new URLSearchParams(location.search);
  var slug = params.get('c') || '';
  var previa = params.get('previa') || '';
  var $ = function (id) { return document.getElementById(id); };

  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  /* *assim* vira destaque no título e negrito no texto */
  function marcar(t, tag, classe) {
    return esc(t).replace(/\*([^*\n]+)\*/g, '<' + tag + (classe ? ' class="' + classe + '"' : '') + '>$1</' + tag + '>');
  }
  function paragrafos(t) {
    return String(t || '').split(/\n\s*\n/).map(function (p) {
      p = p.trim();
      return p ? '<p>' + marcar(p, 'strong').replace(/\n/g, '<br>') + '</p>' : '';
    }).join('');
  }
  function meta(nome, valor, prop) {
    var sel = prop ? 'meta[property="' + nome + '"]' : 'meta[name="' + nome + '"]';
    var m = document.querySelector(sel);
    if (!m) {
      m = document.createElement('meta');
      m.setAttribute(prop ? 'property' : 'name', nome);
      document.head.appendChild(m);
    }
    m.setAttribute('content', valor);
  }

  function carregarScripts() {
    ['../assets/js/site.js', '../assets/js/rastreio.js'].forEach(function (src) {
      var s = document.createElement('script');
      s.src = src;
      s.async = false;  // executa na ordem: o rastreio depende do site.js
      document.body.appendChild(s);
    });
  }

  function naoAchou(motivo) {
    document.title = (motivo === 'rede' ? 'Curso' : 'Curso não encontrado') + ' | André Silva Teclas';
    meta('robots', 'noindex');
    $('curso-topo').hidden = true;
    $('c-nao-achou').hidden = false;
    if (motivo === 'rede') {
      $('c-nao-achou-titulo').innerHTML = 'Não consegui abrir o curso <span class="destaque">agora</span>';
      $('c-nao-achou-texto').textContent = 'Pode ser a internet. Tente de novo em instantes, ou chame o André no WhatsApp que ele te passa o link.';
    }
    carregarScripts();
  }

  function montar(d) {
    var c = d.curso;
    var nome = c.nome;
    document.title = nome + ' | André Silva Teclas';
    var descricao = c.frase || c.sub || '';
    meta('description', descricao);
    meta('og:title', nome + ' | André Silva Teclas', true);
    meta('og:description', descricao, true);
    var canon = document.querySelector('link[rel="canonical"]');
    if (canon) canon.href = SITE + '/cursos/curso.html?c=' + encodeURIComponent(c.slug);
    if (d.previa) {
      meta('robots', 'noindex');
      var faixa = $('c-previa');
      faixa.hidden = false;
    }

    /* ---- topo ---- */
    $('c-kicker').textContent = 'Curso online - ' + (NIVEIS[c.nivel] || NIVEIS.todos);
    $('c-titulo').innerHTML = c.titulo ? marcar(c.titulo, 'span', 'destaque') : esc(nome);
    if (c.sub) $('c-sub').innerHTML = marcar(c.sub, 'strong').replace(/\n/g, '<br>');
    else $('c-sub').hidden = true;

    var vsl = $('c-vsl');
    if (c.vsl) {
      vsl.innerHTML = '<button class="video__tela" type="button" data-vsl="' + esc(c.vsl) + '" aria-label="Assistir a apresentação do curso ' + esc(nome) + '">' +
        '<img src="https://i.ytimg.com/vi/' + esc(c.vsl) + '/hqdefault.jpg" alt="" width="480" height="360">' +
        '<span class="video__play"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></span></button>';
      vsl.hidden = false;
    } else if (c.capa) {
      vsl.innerHTML = '<img src="' + API + '/img/' + esc(c.capa) + '" alt="" style="display:block;width:100%;height:auto">';
      vsl.hidden = false;
    }

    /* ---- caixa de compra ---- */
    var link = /^https:\/\//.test(c.link || '') ? c.link : '';
    document.querySelectorAll('[data-comprar]').forEach(function (a) {
      a.setAttribute('data-comprar', c.slug);
      a.href = link || '../#contato';
      if (link) { a.target = '_blank'; a.rel = 'noopener'; }
    });
    $('c-preco').textContent = c.preco || '';
    $('c-preco').hidden = !c.preco;
    if (c.precoAntigo) { $('c-de').textContent = 'de ' + c.precoAntigo + ' por'; $('c-de').hidden = false; }
    $('c-obs').textContent = c.obs || '';
    $('c-obs').hidden = !c.obs;
    $('c-itens').innerHTML = (c.itens || []).map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('');
    $('c-itens').hidden = !(c.itens || []).length;

    /* ---- seções do meio, só as que ele preencheu ---- */
    if (c.texto) {
      $('c-sobre-texto').innerHTML = paragrafos(c.texto);
      $('c-sobre').hidden = false;
    }
    if ((c.topicos || []).length) {
      $('c-topicos').innerHTML = c.topicos.map(function (t, i) {
        return '<div class="carta revela"><div class="carta__num">' + String(i + 1).padStart(2, '0') + '</div>' +
          (t.t ? '<h3>' + esc(t.t) + '</h3>' : '') + (t.d ? '<p>' + esc(t.d) + '</p>' : '') + '</div>';
      }).join('');
      $('conteudo').hidden = false;
    }
    if ((c.perguntas || []).length) {
      $('c-perguntas').innerHTML = c.perguntas.map(function (q) {
        return '<div class="pergunta" data-pergunta><button class="pergunta__topo" aria-expanded="false">' + esc(q.p) + '</button>' +
          '<div class="pergunta__corpo">' + paragrafos(q.r) + '</div></div>';
      }).join('');
      $('perguntas').hidden = false;
    }
    // faixa clara e escura alternando, seja qual for a combinação de seções
    ['c-sobre', 'conteudo', 'perguntas'].filter(function (id) { return !$(id).hidden; }).forEach(function (id, i) {
      $(id).classList.toggle('faixa-escura', i % 2 === 0);
    });

    /* menu e botões que apontam pra seção que não existe somem */
    document.querySelectorAll('a[href="#conteudo"]').forEach(function (a) {
      var alvo = $('conteudo').hidden ? ($('c-sobre').hidden ? '' : '#c-sobre') : '#conteudo';
      if (alvo) a.setAttribute('href', alvo);
      else (a.closest('li') || a).hidden = true;
    });
    if ($('perguntas').hidden) document.querySelectorAll('a[href="#perguntas"]').forEach(function (a) { (a.closest('li') || a).hidden = true; });

    $('c-chamada-titulo').innerHTML = 'Pronto pra começar o <span class="destaque">' + esc(nome) + '</span>?';
    $('c-chamada-texto').textContent = [c.preco, c.obs].filter(Boolean).join(', ') + (c.preco ? '. ' : '') + 'Se tiver dúvida antes de comprar, é só chamar.';
    $('c-chamada').hidden = false;
    $('c-acoes').hidden = false;

    carregarScripts();
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) { naoAchou(); return; }

  fetch(API + '/api/cursos/' + encodeURIComponent(slug) + (previa ? '?previa=' + encodeURIComponent(previa) : ''), { credentials: 'omit' })
    .then(function (r) {
      if (r.status === 404) return { naoExiste: true };
      if (!r.ok) throw new Error('rede');
      return r.json();
    })
    .then(function (d) {
      if (!d || d.naoExiste || !d.curso) naoAchou();
      else montar(d);
    })
    .catch(function () { naoAchou('rede'); });
})();
