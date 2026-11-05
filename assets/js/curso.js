/* ===========================================================================
   PÁGINA DE CURSO MONTADA PELO PAINEL (04/11/2026, seções em 05/11/2026)

   ⚠️ O ANDRÉ NÃO MEXE NESTE ARQUIVO. O curso é criado e editado na aba
   "Cursos" do painel (https://painel.andresilvateclas.com.br) e esta página
   só monta o que vem de lá.

   Dois endereços, a mesma página:
     cursos/curso.html?c=<slug>   curso criado no painel
     cursos/<slug>/               os 4 cursos que já existiam (Tocando de
                                  Ouvido, Harmonia, Poliacordes, Blues). A
                                  pasta continua de pé porque o Google já
                                  conhece o endereço e porque o <head> dela
                                  tem a capa certa pra prévia do WhatsApp
   Prévia de rascunho: o mesmo endereço com previa=<código do painel>.

   Ordem das coisas, e por quê:
     1. busca o curso no painel
     2. monta a página
     3. SÓ ENTÃO carrega o site.js e o rastreio.js. Eles ligam o play do
        vídeo, as perguntas, a animação de entrada e o botão de compra no
        que já está na página; carregados antes, não achariam nada. E o
        rastreio lê o nome do curso no título da aba, que só existe depois.

   Painel fora do ar: as 4 páginas antigas trazem uma cópia do curso no
   próprio HTML (#curso-reserva) e montam com ela. Curso novo, sem cópia,
   diz que não abriu e oferece o WhatsApp. Curso tirado do ar ou apagado
   (o painel responde 404) mostra "não está mais aqui", nunca a cópia.
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
  var pasta = location.pathname.match(/\/cursos\/([a-z0-9-]+)\/(index\.html)?$/);
  var slug = params.get('c') || (pasta ? pasta[1] : '');
  var previa = params.get('previa') || '';
  var raiz = pasta ? '../../' : '../';   // a pasta do curso fica um nível abaixo
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
  function num(i) { return String(i + 1).padStart(2, '0'); }
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
  function iniciais(nome) {
    return String(nome).trim().split(/\s+/).filter(Boolean).slice(0, 2).map(function (p) { return p.charAt(0); }).join('').toUpperCase();
  }
  /* link de botão: de fora (https) ou página do próprio site (/cursos/...) */
  function href(link) {
    if (/^https:\/\//.test(link || '')) return link;
    if (/^\//.test(link || '')) return raiz + link.slice(1);
    return '';
  }

  function carregarScripts() {
    [raiz + 'assets/js/site.js', raiz + 'assets/js/rastreio.js'].forEach(function (src) {
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

  /* ---- seções do meio ---- */
  function cabeca(s) {
    if (!s.kicker && !s.titulo) return '';
    return '<div class="centro revela">' +
      (s.kicker ? '<p class="kicker">' + esc(s.kicker) + '</p>' : '') +
      (s.titulo ? '<h2 class="titulo-secao">' + marcar(s.titulo, 'span', 'destaque') + '</h2>' : '') +
      (s.intro && s.tipo !== 'texto' ? '<div class="texto curso-intro">' + paragrafos(s.intro) + '</div>' : '') +
      '</div>';
  }
  function itemTexto(it) {
    return (it.t ? '<h3>' + esc(it.t) + '</h3>' : '') + (it.d ? '<p>' + marcar(it.d, 'strong') + '</p>' : '');
  }
  var DESENHO = {
    cartoes: function (s) {
      return cabeca(s) + '<div class="grade-3">' + (s.itens || []).map(function (it, i) {
        return '<div class="carta revela">' + (s.numerar ? '<div class="carta__num">' + num(i) + '</div>' : '') + itemTexto(it) + '</div>';
      }).join('') + '</div>';
    },
    modulos: function (s) {
      return cabeca(s) + '<div class="modulos">' + (s.itens || []).map(function (it, i) {
        return '<div class="modulo revela"><div class="modulo__num">' + num(i) + '</div><div>' + itemTexto(it) + '</div></div>';
      }).join('') + '</div>';
    },
    depoimentos: function (s) {
      return cabeca(s) + '<div class="depoimentos">' + (s.itens || []).map(function (d) {
        return '<div class="depo revela"><div class="depo__estrelas">★★★★★</div>' +
          '<p class="depo__texto">' + esc(d.texto) + '</p>' +
          '<div class="depo__pessoa"><div class="depo__avatar">' + esc(iniciais(d.nome)) + '</div><div>' +
          '<div class="depo__nome">' + esc(d.nome) + '</div>' + (d.papel ? '<div class="depo__papel">' + esc(d.papel) + '</div>' : '') +
          '</div></div></div>';
      }).join('') + '</div>';
    },
    texto: function (s) {
      var link = href(s.link);
      return '<div class="centro revela">' +
        (s.kicker ? '<p class="kicker" style="justify-content:center">' + esc(s.kicker) + '</p>' : '') +
        (s.titulo ? '<h2 class="titulo-secao">' + marcar(s.titulo, 'span', 'destaque') + '</h2>' : '') +
        (s.intro ? '<div class="texto curso-texto">' + paragrafos(s.intro) + '</div>' : '') +
        (link && s.botao ? '<div class="hero__acoes" style="margin-top:2rem"><a class="btn btn--vazado" href="' + esc(link) + '"' +
          (/^https:/.test(link) ? ' target="_blank" rel="noopener"' : '') + '>' + esc(s.botao) + '</a></div>' : '') +
        '</div>';
    },
    garantia: function (s) {
      return '<div class="garantia revela"><div class="garantia__selo">🛡️</div>' + paragrafos(s.intro) + '</div>';
    }
  };
  /* curso salvo antes das seções existirem (texto + tópicos) */
  function secoesDe(c) {
    if (Array.isArray(c.secoes)) return c.secoes;
    var s = [];
    if (c.texto) s.push({ tipo: 'texto', kicker: 'Sobre o curso', intro: c.texto });
    if ((c.topicos || []).length) s.push({ tipo: 'cartoes', numerar: true, kicker: 'O que você vai aprender', titulo: 'Passo a passo, *direto no teclado*', itens: c.topicos });
    return s;
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
    if (canon) canon.href = SITE + (c.caminho || '/cursos/curso.html?c=' + encodeURIComponent(c.slug));
    if (d.previa) {
      meta('robots', 'noindex');
      $('c-previa').hidden = false;
    }

    /* ---- topo ---- */
    $('c-kicker').textContent = c.kickerTopo || 'Curso online - ' + (NIVEIS[c.nivel] || NIVEIS.todos);
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

    /* ---- compra ---- */
    var link = /^https:\/\//.test(c.link || '') ? c.link : '';
    document.querySelectorAll('[data-comprar]').forEach(function (a) {
      a.setAttribute('data-comprar', c.slug);
      a.href = link || raiz + '#contato';
      if (link) { a.target = '_blank'; a.rel = 'noopener'; }
      if (c.botao && !a.classList.contains('btn--pequeno')) a.textContent = c.botao;
    });
    $('c-preco').textContent = c.preco || '';
    $('c-preco').hidden = !c.preco;
    if (c.precoAntigo) { $('c-de').textContent = 'de ' + c.precoAntigo + ' por'; $('c-de').hidden = false; }
    $('c-obs').textContent = c.obs || '';
    $('c-obs').hidden = !c.obs;
    $('c-itens').innerHTML = (c.itens || []).map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('');
    $('c-itens').hidden = !(c.itens || []).length;

    /* ---- seções do meio, faixa clara e escura alternando ---- */
    var caixa = $('c-secoes');
    var lista = secoesDe(c).filter(function (s) { return DESENHO[s.tipo]; });
    lista.forEach(function (s) {
      var anterior = caixa.lastElementChild;
      // garantia depois de outra seção entra na mesma faixa, como nas páginas antigas
      if (s.tipo === 'garantia' && anterior) {
        anterior.firstElementChild.insertAdjacentHTML('beforeend', DESENHO.garantia(s));
        return;
      }
      var sec = document.createElement('section');
      sec.className = 'secao' + (caixa.children.length % 2 === 0 ? ' faixa-escura' : '');
      sec.setAttribute('data-tipo', s.tipo);
      sec.innerHTML = '<div class="limite">' + DESENHO[s.tipo](s) + '</div>';
      caixa.appendChild(sec);
    });
    var total = caixa.children.length;
    // o "Conteúdo" do menu leva pros módulos; sem módulos, pros primeiros cartões
    var alvo = caixa.querySelector('[data-tipo="modulos"]') || caixa.querySelector('[data-tipo="cartoes"]') || caixa.firstElementChild;
    var conteudo = '';
    if (alvo) { alvo.id = 'conteudo'; conteudo = 'conteudo'; }

    if ((c.perguntas || []).length) {
      $('c-perguntas').innerHTML = c.perguntas.map(function (q) {
        return '<div class="pergunta" data-pergunta><button class="pergunta__topo" aria-expanded="false">' + esc(q.p) + '</button>' +
          '<div class="pergunta__corpo">' + paragrafos(q.r) + '</div></div>';
      }).join('');
      $('perguntas').hidden = false;
      $('perguntas').classList.toggle('faixa-escura', total % 2 === 0);
    }

    /* menu e botões que apontam pra seção que não existe somem */
    if (!conteudo) document.querySelectorAll('a[href="#conteudo"]').forEach(function (a) { (a.closest('li') || a).hidden = true; });
    if ($('perguntas').hidden) document.querySelectorAll('a[href="#perguntas"]').forEach(function (a) { (a.closest('li') || a).hidden = true; });

    $('c-chamada-titulo').innerHTML = c.chamadaTitulo ? marcar(c.chamadaTitulo, 'span', 'destaque')
      : 'Pronto pra começar o <span class="destaque">' + esc(nome) + '</span>?';
    $('c-chamada-texto').innerHTML = c.chamadaTexto ? marcar(c.chamadaTexto, 'strong')
      : esc([c.preco, c.obs].filter(Boolean).join(', ') + (c.preco ? '. ' : '') + 'Se tiver dúvida antes de comprar, é só chamar.');
    $('c-chamada').hidden = false;
    $('c-acoes').hidden = false;

    carregarScripts();
  }

  function reserva() {
    var r = $('curso-reserva');
    if (!r) return null;
    try { return JSON.parse(r.textContent); } catch (e) { return null; }
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
    .catch(function () {
      var c = reserva();
      if (c) montar({ curso: c });
      else naoAchou('rede');
    });
})();
