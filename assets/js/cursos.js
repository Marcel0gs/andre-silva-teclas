/* ===========================================================================
   CURSOS DO PAINEL NA PÁGINA INICIAL (04/11/2026)

   ⚠️ O ANDRÉ NÃO MEXE NESTE ARQUIVO. Curso novo nasce na aba "Cursos" do
   painel; aqui só entra o cartão dele no começo da lista de cursos (curso
   novo é lançamento, vai na frente). Os cartões fixos do index.html ficam
   como estão.

   Painel fora do ar = a lista fica só com os cursos fixos, sem buraco.
   =========================================================================== */
(function () {
  'use strict';

  var API = 'https://painel.andresilvateclas.com.br';
  var grade = document.querySelector('#cursos .cursos');
  if (!grade || !window.fetch) return;

  var NIVEIS = {
    iniciante: ['Iniciante', [1, 0, 0]],
    'ini-inter': ['Iniciante ao intermediário', [1, 1, 0]],
    intermediario: ['Intermediário', [0, 1, 0]],
    'inter-avan': ['Intermediário e avançado', [0, 1, 1]],
    todos: ['Todos os níveis', [1, 1, 1]]
  };
  var SETA = '<svg class="curso__seta-icone" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>';

  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function cartao(c) {
    var nivel = NIVEIS[c.nivel] || NIVEIS.todos;
    var capa = c.capa ? API + '/img/' + c.capa
      : c.vsl ? 'https://i.ytimg.com/vi/' + c.vsl + '/hqdefault.jpg' : 'assets/img/og-capa.jpg';
    var a = document.createElement('a');
    a.className = 'curso';
    a.href = 'cursos/curso.html?c=' + encodeURIComponent(c.slug);
    a.innerHTML =
      '<div class="curso__capa"><img src="' + esc(capa) + '" alt="" loading="lazy">' +
        (c.selo ? '<span class="curso__selo">' + esc(c.selo) + '</span>' : '') + '</div>' +
      '<div class="curso__corpo">' +
        '<h3 class="curso__titulo">' + esc(c.nome) + '</h3>' +
        '<p class="curso__desc">' + esc(c.frase) + '</p>' +
        (c.preco ? '<p class="curso__preco">' + esc(c.preco) + (c.precoAntigo ? ' <s>' + esc(c.precoAntigo) + '</s>' : '') + '</p>'
          : '<p class="curso__preco curso__preco--consulta">Saiba mais</p>') +
        '<div class="curso__rodape">' +
          '<span class="nivel"><span class="nivel__barras" aria-hidden="true">' +
            nivel[1].map(function (on) { return on ? '<i class="on"></i>' : '<i></i>'; }).join('') +
          '</span>' + esc(nivel[0]) + '</span>' +
          '<span class="curso__seta" aria-hidden="true">' + SETA + '</span>' +
        '</div>' +
      '</div>';
    return a;
  }

  fetch(API + '/api/cursos', { credentials: 'omit' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d || !Array.isArray(d.cursos) || !d.cursos.length) return;
      var primeiro = grade.firstElementChild;
      d.cursos.forEach(function (c) { grade.insertBefore(cartao(c), primeiro); });
    })
    .catch(function () { /* silêncio: a lista fica com os cursos fixos */ });
})();
