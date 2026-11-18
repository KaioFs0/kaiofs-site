// Lista e página de detalhe dos imóveis (dados em data/venda.json e data/aluguel.json)
(function () {
  const WA = '5511989008162';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const slug = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const img = p => String(p || '').replace(/^\/+/, ''); // caminho relativo funciona com e sem domínio próprio
  const cache = {};
  // vídeo: link do YouTube ou arquivo enviado pelo painel
  const vid = v => {
    if (!v) return null;
    const yt = (String(v).match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/|\/live\/)([\w-]{11})/) || [])[1];
    if (yt) return { yt };
    return /^https?:/i.test(v) ? null : { src: img(v) };
  };
  const videoHTML = v => v.yt
    ? `<button type="button" class="gal__yt" data-yt="${v.yt}" aria-label="Assistir ao vídeo"><img src="https://i.ytimg.com/vi/${v.yt}/hqdefault.jpg" alt=""><span><i class="ti ti-player-play-filled"></i></span></button>`
    : `<video src="${esc(v.src)}" controls playsinline preload="metadata"></video>`;

  async function load(fin) {
    if (!cache[fin]) {
      cache[fin] = fetch('data/' + fin + '.json', { cache: 'no-cache' })
        .then(r => r.ok ? r.json() : [])
        .catch(() => [])
        .then(list => {
          const seen = {};
          return (Array.isArray(list) ? list : []).filter(i => i && i.titulo && i.ativo !== false).map(i => {
            let id = slug(i.titulo) || 'imovel';
            if (seen[id]) id += '-' + (++seen[id]); else seen[id] = 1;
            const m = String(i.cidade || '').match(/^(.*?)s*-s*([A-Za-z]{2})$/); // aceita "Cidade - UF" antigo
            const cidade = m ? m[1] : (i.cidade || '');
            const uf = String(i.estado || (m && m[2]) || '').toUpperCase();
            const local = [cidade, uf].filter(Boolean).join(' - ');
            return { ...i, id, fin, cidade, uf, local, fotos: (i.fotos || []).filter(Boolean).map(img), video: vid(i.video) };
          });
        });
    }
    return cache[fin];
  }

  const specs = i => [
    i.area && `<span><i class="ti ti-ruler-measure"></i>${esc(i.area)} m²</span>`,
    i.quartos && `<span><i class="ti ti-bed"></i>${esc(i.quartos)} ${i.quartos > 1 ? 'quartos' : 'quarto'}</span>`,
    i.banheiros && `<span><i class="ti ti-bath"></i>${esc(i.banheiros)} ${i.banheiros > 1 ? 'banheiros' : 'banheiro'}</span>`,
    i.vagas && `<span><i class="ti ti-car"></i>${esc(i.vagas)} ${i.vagas > 1 ? 'vagas' : 'vaga'}</span>`,
    i.pe_direito && `<span><i class="ti ti-arrows-vertical"></i>Pé-direito ${esc(i.pe_direito)} m</span>`,
  ].filter(Boolean).join('');

  const photo = (src, alt) => src
    ? `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy">`
    : `<div class="ph"><i class="ti ti-building"></i><span>Foto em breve</span></div>`;

  const UFS = { AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins' };

  const isRent = i => i.fin === 'aluguel' || (i.fin === 'comercial' && i.finalidade === 'Locação');
  const tag = i => i.fin === 'comercial' ? (isRent(i) ? 'Para alugar' : 'À venda') : i.fin === 'aluguel' ? (i.mobiliado ? 'Mobiliado' : 'Para alugar') : (i.situacao || 'À venda');

  // negócio fechado: continua no site com o selo, como prova de que o negócio acontece
  const fechado = i => i.negocio === 'Vendido' || i.negocio === 'Alugado';
  const selo = i => fechado(i) ? `<span class="imv__sold"><i class="ti ti-circle-check-filled"></i>${esc(i.negocio)}</span>` : '';

  const card = i => `
    <a class="imv reveal is-in${fechado(i) ? ' is-sold' : ''}" href="imovel.html?f=${i.fin}&id=${encodeURIComponent(i.id)}">
      <div class="imv__img">${photo(i.fotos[0], i.titulo)}${selo(i)}<span class="imv__tag">${esc(tag(i))}</span>${i.codigo ? `<span class="imv__code">${esc(i.codigo)}</span>` : ''}${i.fotos.length > 1 || i.video ? `<span class="imv__count">${i.fotos.length > 1 ? `<i class="ti ti-photo"></i>${i.fotos.length}` : ''}${i.video ? '<i class="ti ti-video"></i>Vídeo' : ''}</span>` : ''}</div>
      <div class="imv__body">
        <p class="imv__type">${esc(i.tipo || 'Imóvel')}${i.local ? ' · ' + esc(i.local) : (i.bairro ? ' · ' + esc(i.bairro) : '')}</p>
        <h3>${esc(i.titulo)}</h3>
        ${i.endereco || i.bairro ? `<p class="imv__addr"><i class="ti ti-map-pin"></i>${esc([i.endereco, i.bairro, i.local].filter(Boolean).join(', '))}</p>` : ''}
        <div class="imv__specs">${specs(i)}</div>
        <div class="imv__foot"><strong>${fechado(i) ? esc(i.negocio) : esc(i.preco || 'Consulte')}</strong><span>Ver imóvel <i class="ti ti-arrow-right"></i></span></div>
      </div>
    </a>`;

  // Listas: <div data-imoveis="venda" data-destaque data-limit="6" data-empty="..."></div>
  document.querySelectorAll('[data-imoveis]').forEach(async box => {
    const fins = box.dataset.imoveis.split(',');
    let list = (await Promise.all(fins.map(load))).flat();
    list = [...list.filter(i => !fechado(i)), ...list.filter(fechado)]; // disponíveis primeiro, vendidos/alugados no fim
    if ('destaque' in box.dataset) list = list.filter(i => i.destaque && !fechado(i));
    if (box.dataset.limit) list = list.slice(0, +box.dataset.limit);
    if (!list.length) {
      const hideSel = box.dataset.hideEmpty;
      if (hideSel) { const s = box.closest(hideSel); if (s) s.hidden = true; return; }
      box.innerHTML = `<div class="imv-empty"><i class="ti ti-building-community"></i><p>${esc(box.dataset.empty || 'Nenhum imóvel disponível no momento.')}</p><a class="btn btn--gold" href="https://wa.me/${WA}?text=${encodeURIComponent('Oi Kaio, quero saber quais imóveis você tem disponíveis!')}" target="_blank" rel="noopener"><i class="ti ti-brand-whatsapp"></i> Perguntar pelo WhatsApp</a></div>`;
      return;
    }
    if (!('filtro' in box.dataset)) { box.innerHTML = list.map(card).join(''); return; }

    // Filtros (seleção múltipla). Ficam no link: comprar.html?uf=SP,MG&cidade=...&quartos=2&banheiros=1
    const num = (v, max) => { const n = parseInt(v, 10); return isNaN(n) ? '--' : String(Math.min(n, max)); };
    const plural = (k, max, um, varios) => k === '--' ? 'Não informado' : (+k >= max ? k + '+ ' + varios : k + ' ' + (k === '1' ? um : varios));
    const local = [
      { key: 'uf', label: 'Estado', icon: 'map-2', val: i => i.uf || '--', name: k => k === '--' ? 'Não informado' : (UFS[k] || k) },
      { key: 'cidade', label: 'Cidade', icon: 'building-community', val: i => i.local || '--', name: k => k === '--' ? 'Não informada' : k },
    ];
    const groups = box.dataset.filtro === 'com' ? [
      { key: 'finalidade', label: 'Finalidade', icon: 'arrows-exchange', val: i => isRent(i) ? 'Locação' : 'Venda', name: k => k === 'Locação' ? 'Para alugar' : 'À venda' },
      { key: 'tipo', label: 'Tipo', icon: 'building-warehouse', val: i => i.tipo || '--', name: k => k === '--' ? 'Não informado' : k },
      ...local,
    ] : [
      ...local,
      { key: 'quartos', label: 'Quartos', icon: 'bed', num: true, val: i => num(i.quartos, 4), name: k => plural(k, 4, 'quarto', 'quartos') },
      { key: 'banheiros', label: 'Banheiros', icon: 'bath', num: true, val: i => num(i.banheiros, 3), name: k => plural(k, 3, 'banheiro', 'banheiros') },
    ];
    const qs = new URLSearchParams(location.search);
    const sel = {};
    groups.forEach(g => sel[g.key] = new Set((qs.get(g.key) || '').split(',').filter(Boolean)));
    // except: filtro(s) ignorados ao contar opções. O Estado ignora também a Cidade, para continuar mostrando todos os estados.
    const match = (i, except) => { const ex = except === 'uf' ? ['uf', 'cidade'] : [except]; return groups.every(g => ex.includes(g.key) || !sel[g.key].size || sel[g.key].has(g.val(i))); };

    const bar = document.createElement('div');
    bar.className = 'filt reveal is-in';
    bar.innerHTML = '<div class="filt__row">' + groups.map(g => `
      <div class="ms" data-key="${g.key}">
        <button type="button" class="ms__btn" aria-haspopup="true" aria-expanded="false"><i class="ti ti-${g.icon}"></i><span class="ms__val"><small>${g.label}</small><span class="ms__txt">Todos</span></span><i class="ti ti-chevron-down ms__chev"></i></button>
        <div class="ms__pop" role="group" aria-label="Filtrar por ${g.label.toLowerCase()}" hidden></div>
      </div>`).join('') + '</div><div class="filt__info"><span class="ms__count"></span><button type="button" class="ms__clear" hidden><i class="ti ti-x"></i> Limpar filtros</button></div>';
    box.before(bar);
    const clear = bar.querySelector('.ms__clear');

    const render = (save = true) => {
      // cidades que não pertencem mais aos estados escolhidos saem da seleção
      const cg = groups.find(g => g.key === 'cidade'), cidadesOk = new Set(list.filter(i => match(i, 'cidade')).map(cg.val));
      sel.cidade.forEach(c => { if (!cidadesOk.has(c)) sel.cidade.delete(c); });
      groups.forEach(g => {
        const counts = {};
        list.filter(i => match(i, g.key)).forEach(i => { const k = g.val(i); counts[k] = (counts[k] || 0) + 1; });
        sel[g.key].forEach(k => { if (!(k in counts)) counts[k] = 0; });
        const keys = Object.keys(counts).sort((a, b) => a === '--' ? 1 : b === '--' ? -1 : g.num ? a - b : g.name(a).localeCompare(g.name(b), 'pt'));
        const el = bar.querySelector(`.ms[data-key="${g.key}"]`);
        el.querySelector('.ms__pop').innerHTML = keys.length
          ? keys.map(k => `<label class="ms__opt"><input type="checkbox" value="${esc(k)}" ${sel[g.key].has(k) ? 'checked' : ''}><span>${esc(g.name(k))}</span><em>${counts[k]}</em></label>`).join('')
          : '<p class="ms__none">Nenhuma opção</p>';
        const s = [...sel[g.key]];
        el.querySelector('.ms__txt').textContent = !s.length ? 'Todos' : s.length === 1 ? g.name(s[0]) : s.length + ' selecionados';
        el.querySelector('.ms__btn').classList.toggle('is-on', s.length > 0);
      });
      const items = list.filter(i => match(i));
      const any = groups.some(g => sel[g.key].size);
      box.innerHTML = items.length ? items.map(card).join('')
        : '<div class="imv-empty"><i class="ti ti-filter-off"></i><p>Nenhum imóvel com esses filtros.</p><button type="button" class="btn btn--line" data-clear>Limpar filtros</button></div>';
      clear.hidden = !any;
      bar.querySelector('.ms__count').textContent = items.length + (items.length === 1 ? ' imóvel encontrado' : ' imóveis encontrados');
      if (save) {
        const u = new URL(location.href);
        groups.forEach(g => sel[g.key].size ? u.searchParams.set(g.key, [...sel[g.key]].join(',')) : u.searchParams.delete(g.key));
        history.replaceState(null, '', u);
      }
    };
    const closeAll = except => bar.querySelectorAll('.ms').forEach(m => {
      if (m === except) return;
      m.querySelector('.ms__pop').hidden = true;
      m.querySelector('.ms__btn').setAttribute('aria-expanded', 'false');
    });
    bar.addEventListener('click', e => {
      const b = e.target.closest('.ms__btn'); if (!b) return;
      const m = b.closest('.ms'), pop = m.querySelector('.ms__pop'), open = pop.hidden;
      closeAll(m); pop.hidden = !open; b.setAttribute('aria-expanded', open);
    });
    bar.addEventListener('change', e => {
      const c = e.target; if (c.type !== 'checkbox') return;
      const set = sel[c.closest('.ms').dataset.key];
      c.checked ? set.add(c.value) : set.delete(c.value);
      render();
    });
    const clearAll = () => { groups.forEach(g => sel[g.key].clear()); closeAll(); render(); };
    clear.addEventListener('click', clearAll);
    box.addEventListener('click', e => { if (e.target.closest('[data-clear]')) clearAll(); });
    document.addEventListener('click', e => { if (!e.target.closest('.ms')) closeAll(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(); });
    render(false);
    if (list.length < 2) bar.hidden = true; // com um imóvel só, filtro não faz sentido
  });

  // Página de detalhe
  const det = document.getElementById('imovel');
  if (det) (async () => {
    const q = new URLSearchParams(location.search);
    const fin = ['aluguel', 'comercial'].includes(q.get('f')) ? q.get('f') : 'venda';
    const i = (await load(fin)).find(x => x.id === q.get('id'));
    const back = { aluguel: ['alugar.html', 'Imóveis para alugar'], comercial: ['comercial.html', 'Imóveis comerciais'], venda: ['comprar.html', 'Imóveis à venda'] }[fin];
    if (!i) {
      det.innerHTML = `<div class="wrap imv-empty" style="margin:80px auto"><i class="ti ti-home-off"></i><p>Este imóvel não está mais disponível.</p><a class="btn btn--gold" href="${back[0]}">Ver outros imóveis</a></div>`;
      return;
    }
    document.title = i.titulo + ' | Kaio Corretor de Imóveis';
    const nav = document.querySelector(`#menu a[href="${back[0]}"]`);
    if (nav) nav.setAttribute('aria-current', 'page');
    const fullAddr = [i.endereco, i.bairro, i.local || 'São Paulo - SP'].filter(Boolean).join(', ');
    // Mensagem pronta para o WhatsApp, com tudo que identifica o imóvel
    const link = location.origin + location.pathname + '?f=' + fin + '&id=' + encodeURIComponent(i.id);
    const ficha = [
      `🏠 *${i.titulo}*`,
      i.codigo && `🔖 Código: *${i.codigo}*`,
      [i.tipo, i.situacao, i.mobiliado ? 'Mobiliado' : ''].filter(Boolean).join(' · '),
      (i.endereco || i.bairro) && `📍 ${fullAddr}`,
      `💰 ${isRent(i) ? 'Aluguel' : 'Valor'}: ${i.preco || 'a consultar'}`,
      `🔗 ${link}`,
    ].filter(Boolean).join('\n');
    const oQue = fin === 'comercial' ? 'este imóvel comercial' : 'este imóvel';
    const msg = fechado(i)
      ? `Olá, Kaio! Vi que ${oQue} já foi *${i.negocio.toLowerCase()}*:\n\n${ficha}\n\nVocê tem algum parecido disponível?`
      : `Olá, Kaio! Tenho interesse em *${isRent(i) ? 'ALUGAR' : 'COMPRAR'}* ${oQue}:\n\n${ficha}\n\nPode me passar mais informações?`;
    // mensagem para o visitante mandar a um amigo ou familiar
    const msgShare = `Olha esse imóvel que encontrei 👇\n\n🏠 *${i.titulo}*${i.local ? '\n📍 ' + [i.bairro, i.local].filter(Boolean).join(', ') : ''}${!fechado(i) && i.preco ? `\n💰 ${i.preco}` : ''}\n🔗 ${link}`;
    const msgVisita = `Olá, Kaio! Quero *agendar uma visita* a ${oQue} (${isRent(i) ? 'aluguel' : 'compra'}):\n\n${ficha}\n\nQuais dias e horários você tem disponíveis?`;
    const waMsg = encodeURIComponent(msg);
    // o botão flutuante e o WhatsApp do topo também passam a mandar a mensagem deste imóvel
    document.querySelectorAll('.wa-float, #menu .btn--gold').forEach(a => a.href = `https://wa.me/${WA}?text=${waMsg}`);
    const slides = [...i.fotos.map(src => ({ src })), ...(i.video ? [{ video: true }] : [])]; // fotos primeiro, vídeo por último
    const costs = isRent(i) ? [['Condomínio', i.condominio], ['IPTU', i.iptu]].filter(c => c[1]) : [];
    det.innerHTML = `
      <section class="phero phero--sm"><div class="wrap">
        <p class="crumb"><a href="index.html">Início</a> / <a href="${back[0]}">${back[1]}</a> / ${esc(i.bairro || i.tipo || 'Imóvel')}</p>
        <p class="eyebrow">${esc(tag(i))}${i.tipo ? ' · ' + esc(i.tipo) : ''}${i.codigo ? ` <span class="det__code">Cód. ${esc(i.codigo)}</span>` : ''}</p>
        <h1>${esc(i.titulo)}${fechado(i) ? ` <span class="det__sold"><i class="ti ti-circle-check-filled"></i>${esc(i.negocio)}</span>` : ''}</h1>
        ${i.endereco || i.bairro ? `<p class="det__addr"><i class="ti ti-map-pin"></i>${esc(fullAddr)}</p>` : ''}
      </div></section>
      <section class="sec sec--tight"><div class="wrap det">
        <div class="det__main">
          <div class="gal">
            <div class="gal__stage">
              <div class="gal__main">${!i.fotos.length && i.video ? videoHTML(i.video) : photo(i.fotos[0], i.titulo)}</div>
              ${slides.length > 1 ? `
              <button type="button" class="gal__nav gal__prev" aria-label="Anterior"><i class="ti ti-chevron-left"></i></button>
              <button type="button" class="gal__nav gal__next" aria-label="Próxima"><i class="ti ti-chevron-right"></i></button>
              <span class="gal__count" aria-live="polite">1 / ${slides.length}</span>` : ''}
            </div>
            ${slides.length > 1 ? `<div class="gal__thumbs">${slides.map((s, k) => s.video
              ? `<button type="button" data-k="${k}" class="gal__vthumb${k ? '' : ' is-on'}" aria-label="Vídeo">${i.video.yt ? `<img src="https://i.ytimg.com/vi/${i.video.yt}/mqdefault.jpg" alt="" loading="lazy">` : ''}<span><i class="ti ti-player-play-filled"></i>Vídeo</span></button>`
              : `<button type="button" data-k="${k}" class="${k ? '' : 'is-on'}" aria-label="Foto ${k + 1}"><img src="${esc(s.src)}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}
          </div>
          ${specs(i) ? `<div class="det__specs">${specs(i)}</div>` : ''}
          ${i.descricao ? `<h2>Sobre o imóvel</h2><p class="det__desc">${esc(i.descricao).replace(/\n/g, '<br>')}</p>` : ''}
          ${(i.diferenciais || []).filter(Boolean).length ? `<h2>Diferenciais</h2><ul class="check check--2">${i.diferenciais.filter(Boolean).map(d => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}
          ${i.endereco || i.bairro ? `<h2>Localização</h2><div class="det__map"><button type="button" class="det__mapbtn" data-q="${esc(encodeURIComponent(fullAddr))}"><i class="ti ti-map-2"></i><strong>Mostrar mapa</strong><span>O mapa é carregado do Google Maps. <a href="privacidade.html#cookies">Saiba mais</a></span></button></div>` : ''}
        </div>
        <aside class="det__side"><div class="det__box">
          ${fechado(i) ? `
          <div class="det__soldbox"><i class="ti ti-circle-check-filled"></i><div><strong>Imóvel ${esc(i.negocio.toLowerCase())}</strong><span>Mais um negócio fechado! Tenho outras opções parecidas.</span></div></div>
          <a class="btn btn--wa" href="https://wa.me/${WA}?text=${waMsg}" target="_blank" rel="noopener"><i class="ti ti-brand-whatsapp"></i> Quero um parecido</a>
          <a class="btn btn--line" href="${back[0]}#imoveis"><i class="ti ti-building-community"></i> Ver imóveis disponíveis</a>` : `
          <span class="det__lbl">${isRent(i) ? 'Aluguel' : 'Valor'}</span>
          <strong class="det__price">${esc(i.preco || 'Consulte')}</strong>
          ${costs.length ? `<ul class="det__costs">${costs.map(c => `<li><span>${c[0]}</span><span>${esc(c[1])}</span></li>`).join('')}</ul>` : ''}
          <a class="btn btn--wa" href="https://wa.me/${WA}?text=${waMsg}" target="_blank" rel="noopener"><i class="ti ti-brand-whatsapp"></i> Tenho interesse</a>
          <a class="btn btn--line" href="https://wa.me/${WA}?text=${encodeURIComponent(msgVisita)}" target="_blank" rel="noopener"><i class="ti ti-calendar"></i> Agendar visita</a>`}
          <div class="det__share">
            <span>Compartilhar:</span>
            <a class="det__sh det__sh--wa" href="https://wa.me/?text=${encodeURIComponent(msgShare)}" target="_blank" rel="noopener" title="Enviar pelo WhatsApp" aria-label="Enviar pelo WhatsApp"><i class="ti ti-brand-whatsapp"></i></a>
            <button type="button" class="det__sh" data-share="copy" title="Copiar link" aria-label="Copiar link"><i class="ti ti-link"></i></button>
            <button type="button" class="det__sh" data-share="native" title="Mais opções" aria-label="Mais opções de compartilhamento" hidden><i class="ti ti-share"></i></button>
          </div>
          <div class="det__agent"><img src="kaio.png" alt=""><div><strong>Kaio</strong><span>CRECI-SP 331073-F</span></div></div>
        </div></aside>
      </div></section>`;
    // compartilhar: copiar link e menu do próprio celular (quando existir)
    const nat = det.querySelector('[data-share=native]');
    if (navigator.share) { nat.hidden = false; nat.addEventListener('click', () => navigator.share({ title: i.titulo, text: msgShare.replace(/\*/g, ''), url: link }).catch(() => { })); }
    det.querySelector('[data-share=copy]').addEventListener('click', async e => {
      const b = e.currentTarget;
      try { await navigator.clipboard.writeText(link); } catch { const t = document.createElement('textarea'); t.value = link; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); }
      b.classList.add('is-ok'); b.innerHTML = '<i class="ti ti-check"></i>'; b.setAttribute('aria-label', 'Link copiado');
      setTimeout(() => { b.classList.remove('is-ok'); b.innerHTML = '<i class="ti ti-link"></i>'; b.setAttribute('aria-label', 'Copiar link'); }, 2000);
    });
    const mapBtn = det.querySelector('.det__mapbtn');
    if (mapBtn) mapBtn.addEventListener('click', e => {
      if (e.target.closest('a')) return;
      mapBtn.parentElement.innerHTML = `<iframe title="Mapa" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=${mapBtn.dataset.q}&output=embed"></iframe>`;
    });
    // Galeria: passar fotos e vídeo com setas, miniaturas, teclado ou arrastando no celular
    let atual = 0, slide = 0; // atual = foto (para a tela cheia); slide = posição na galeria
    const irPara = k => {
      if (slides.length < 2) return;
      slide = (k + slides.length) % slides.length;
      const s = slides[slide];
      det.querySelector('.gal__main').innerHTML = s.video ? videoHTML(i.video) : photo(s.src, i.titulo);
      if (!s.video) atual = slide;
      det.querySelectorAll('.gal__thumbs button').forEach((b, n) => b.classList.toggle('is-on', n === slide));
      const t = det.querySelector('.gal__thumbs .is-on'); if (t) t.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      det.querySelector('.gal__count').textContent = `${slide + 1} / ${slides.length}`;
    };
    det.querySelectorAll('.gal__thumbs button').forEach(b => b.addEventListener('click', () => irPara(+b.dataset.k)));
    const stage = det.querySelector('.gal__stage');
    if (slides.length > 1) {
      stage.querySelector('.gal__prev').addEventListener('click', () => irPara(slide - 1));
      stage.querySelector('.gal__next').addEventListener('click', () => irPara(slide + 1));
      stage.tabIndex = 0;
      stage.setAttribute('aria-label', 'Galeria: use as setas do teclado para passar');
      stage.addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); irPara(slide - 1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); irPara(slide + 1); }
      });
      let x0 = null, y0 = null;
      stage.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
      stage.addEventListener('touchend', e => {
        if (x0 === null) return;
        const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) irPara(slide + (dx < 0 ? 1 : -1));
      });
    }

    // Foto em tela cheia: clique na foto, setas para passar, Esc para fechar, arrastar no celular
    if (i.fotos.length) {
      const lb = document.createElement('div');
      lb.className = 'lb'; lb.hidden = true;
      lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Fotos do imóvel');
      const multi = i.fotos.length > 1;
      lb.innerHTML = `
        <button type="button" class="lb__x" aria-label="Fechar"><i class="ti ti-x"></i></button>
        ${multi ? '<button type="button" class="lb__nav lb__prev" aria-label="Foto anterior"><i class="ti ti-chevron-left"></i></button><button type="button" class="lb__nav lb__next" aria-label="Próxima foto"><i class="ti ti-chevron-right"></i></button>' : ''}
        <figure class="lb__fig"><img alt=""><figcaption class="lb__cap"></figcaption></figure>`;
      document.body.appendChild(lb);
      const lbImg = lb.querySelector('img'), cap = lb.querySelector('.lb__cap');
      let n = 0, voltar = null;
      const mostrar = k => {
        n = (k + i.fotos.length) % i.fotos.length;
        lbImg.src = i.fotos[n];
        lbImg.alt = `${i.titulo}, foto ${n + 1}`;
        cap.textContent = multi ? `${n + 1} / ${i.fotos.length}` : '';
      };
      const abrir = k => { voltar = document.activeElement; mostrar(k); lb.hidden = false; document.body.style.overflow = 'hidden'; lb.querySelector('.lb__x').focus(); };
      const fechar = () => { lb.hidden = true; document.body.style.overflow = ''; if (n !== slide) irPara(n); if (voltar) voltar.focus(); };
      det.querySelector('.gal__main').addEventListener('click', e => { if (e.target.tagName === 'IMG' && !e.target.closest('.gal__yt')) abrir(atual); });
      lb.addEventListener('click', e => {
        if (e.target.closest('.lb__x') || e.target === lb || e.target.classList.contains('lb__fig')) return fechar();
        if (e.target.closest('.lb__prev')) mostrar(n - 1);
        if (e.target.closest('.lb__next')) mostrar(n + 1);
      });
      document.addEventListener('keydown', e => {
        if (lb.hidden) return;
        if (e.key === 'Escape') fechar();
        if (e.key === 'ArrowLeft' && multi) mostrar(n - 1);
        if (e.key === 'ArrowRight' && multi) mostrar(n + 1);
      });
      let x0 = null;
      lb.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
      lb.addEventListener('touchend', e => {
        if (x0 === null || !multi) return;
        const dx = e.changedTouches[0].clientX - x0; x0 = null;
        if (Math.abs(dx) > 45) mostrar(n + (dx < 0 ? 1 : -1));
      });
    }
    // YouTube só carrega quando a pessoa clica em play (sem cookies: youtube-nocookie)
    det.addEventListener('click', e => {
      const b = e.target.closest('.gal__yt'); if (!b) return;
      b.outerHTML = `<iframe class="gal__iframe" title="Vídeo do imóvel" src="https://www.youtube-nocookie.com/embed/${b.dataset.yt}?autoplay=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    });
  })();
})();
