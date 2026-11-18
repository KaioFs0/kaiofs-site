// Painel do administrador: publica, edita, desativa e exclui imóveis.
// Os dados ficam em data/*.json no GitHub; o painel grava direto no repositório pela API do GitHub.
(() => {
  'use strict';

  /* ---------- utilidades ---------- */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const slug = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const b64enc = str => { const bytes = new TextEncoder().encode(str); let bin = ''; bytes.forEach(b => bin += String.fromCharCode(b)); return btoa(bin); };
  const b64dec = b64 => new TextDecoder().decode(Uint8Array.from(atob(String(b64).replace(/\s/g, '')), c => c.charCodeAt(0)));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const store = {
    get: k => { try { return localStorage.getItem(k) ?? sessionStorage.getItem(k); } catch { return null; } },
    set: (k, v, persist) => { try { (persist ? localStorage : sessionStorage).setItem(k, v); } catch { } },
    del: k => { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch { } },
  };

  /* ---------- tipos de imóvel e campos do formulário ---------- */
  const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
  const f = (name, label, type, opts = {}) => ({ name, label, type, ...opts });
  const local = [
    f('endereco', 'Endereço (rua e número)', 'text', { group: 'Localização', placeholder: 'Rua Exemplo, 100' }),
    f('bairro', 'Bairro', 'text', { group: 'Localização' }),
    f('cidade', 'Cidade', 'text', { group: 'Localização', def: 'São Paulo' }),
    f('estado', 'Estado (UF)', 'select', { group: 'Localização', options: UFS, def: 'SP' }),
  ];
  const fim = [
    f('descricao', 'Descrição', 'textarea', { group: 'Descrição', full: true }),
    f('diferenciais', 'Diferenciais (um por linha)', 'lines', { group: 'Descrição', full: true, placeholder: 'Piscina\nPerto do metrô' }),
    f('fotos', 'Fotos (até 4)', 'photos', { group: 'Fotos e vídeo', full: true }),
    f('video', 'Vídeo (1)', 'video', { group: 'Fotos e vídeo', full: true }),
    f('ativo', 'Mostrar no site', 'bool', { group: 'Publicação', def: true }),
  ];
  // Regra: só imóveis À VENDA podem ser destaque na página inicial, no máximo 3.
  const MAX_DESTAQUES = 3;
  const destaqueField = f('destaque', `Destacar na página inicial (máx. ${MAX_DESTAQUES} imóveis à venda)`, 'bool', { group: 'Publicação', def: false });
  const contaDestaques = (items, exceto) => items.filter(x => x.destaque && !same(x, exceto)).length;
  const limiteErro = () => Object.assign(new Error(`Já existem ${MAX_DESTAQUES} imóveis em destaque na página inicial. Tire o destaque de um deles antes (clique na estrela da lista).`), { limit: true });
  const TYPES = {
    venda: {
      label: 'À venda', page: 'comprar.html', file: 'data/venda.json', icon: 'key', prefix: 'KV',
      fields: [
        f('titulo', 'Nome do imóvel / empreendimento', 'text', { group: 'Informações', full: true, required: true }),
        f('tipo', 'Tipo', 'select', { group: 'Informações', options: ['Apartamento', 'Casa', 'Studio', 'Cobertura', 'Terreno'] }),
        f('situacao', 'Situação', 'select', { group: 'Informações', options: ['Lançamento', 'Em obras', 'Pronto para morar'] }),
        f('preco', 'Preço', 'text', { group: 'Informações', placeholder: 'A partir de R$ 450.000' }),
        ...local,
        f('area', 'Área (m²)', 'text', { group: 'Características' }),
        f('quartos', 'Quartos', 'number', { group: 'Características' }),
        f('banheiros', 'Banheiros', 'number', { group: 'Características' }),
        f('vagas', 'Vagas', 'number', { group: 'Características' }),
        ...fim,
        destaqueField,
        f('negocio', 'Situação do negócio', 'select', { group: 'Publicação', options: ["Disponível","Vendido"], def: 'Disponível', noEmpty: true }),
      ],
    },
    aluguel: {
      label: 'Aluguel', page: 'alugar.html', file: 'data/aluguel.json', icon: 'home-search', prefix: 'KA',
      fields: [
        f('titulo', 'Nome do imóvel', 'text', { group: 'Informações', full: true, required: true }),
        f('tipo', 'Tipo', 'select', { group: 'Informações', options: ['Apartamento', 'Casa', 'Studio', 'Cobertura'] }),
        f('mobiliado', 'Mobiliado', 'bool', { group: 'Informações', def: false }),
        f('preco', 'Aluguel', 'text', { group: 'Informações', placeholder: 'R$ 2.800/mês' }),
        f('condominio', 'Condomínio', 'text', { group: 'Informações', placeholder: 'R$ 450' }),
        f('iptu', 'IPTU', 'text', { group: 'Informações', placeholder: 'R$ 90' }),
        ...local,
        f('area', 'Área (m²)', 'text', { group: 'Características' }),
        f('quartos', 'Quartos', 'number', { group: 'Características' }),
        f('banheiros', 'Banheiros', 'number', { group: 'Características' }),
        f('vagas', 'Vagas', 'number', { group: 'Características' }),
        ...fim,
        f('negocio', 'Situação do negócio', 'select', { group: 'Publicação', options: ["Disponível","Alugado"], def: 'Disponível', noEmpty: true }),
      ],
    },
    comercial: {
      label: 'Comercial', page: 'comercial.html', file: 'data/comercial.json', icon: 'building-warehouse', prefix: 'KC',
      fields: [
        f('titulo', 'Nome do imóvel', 'text', { group: 'Informações', full: true, required: true }),
        f('finalidade', 'Finalidade', 'select', { group: 'Informações', options: ['Locação', 'Venda'], def: 'Locação' }),
        f('tipo', 'Tipo', 'select', { group: 'Informações', options: ['Galpão', 'Sala comercial', 'Laje corporativa', 'Loja', 'Prédio comercial', 'Terreno comercial'] }),
        f('preco', 'Preço ou aluguel', 'text', { group: 'Informações', placeholder: 'R$ 25.000/mês' }),
        f('condominio', 'Condomínio', 'text', { group: 'Informações' }),
        f('iptu', 'IPTU', 'text', { group: 'Informações' }),
        ...local,
        f('area', 'Área (m²)', 'text', { group: 'Características' }),
        f('pe_direito', 'Pé-direito (m)', 'text', { group: 'Características' }),
        f('banheiros', 'Banheiros', 'number', { group: 'Características' }),
        f('vagas', 'Vagas', 'number', { group: 'Características' }),
        ...fim,
        f('negocio', 'Situação do negócio', 'select', { group: 'Publicação', options: ["Disponível","Vendido","Alugado"], def: 'Disponível', noEmpty: true }),
      ],
    },
  };

  /* ---------- conexão com o GitHub ---------- */
  class GitHubStore {
    constructor({ owner, repo, branch, token }) { Object.assign(this, { owner, repo, branch: branch || 'main', token }); }
    get label() { return `${this.owner}/${this.repo}`; }
    async api(path, opts = {}) {
      const r = await fetch(`https://api.github.com/repos/${this.owner}/${this.repo}${path}`, {
        ...opts,
        headers: { Authorization: `Bearer ${this.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(opts.body ? { 'Content-Type': 'application/json' } : {}) },
      });
      if (!r.ok) { const e = new Error((await r.json().catch(() => ({}))).message || r.statusText); e.status = r.status; throw e; }
      return r.status === 204 ? null : r.json();
    }
    async check() {
      const repo = await this.api('');
      if (repo.permissions && !repo.permissions.push) throw Object.assign(new Error('A chave não tem permissão de escrita neste repositório.'), { status: 403 });
    }
    async read(file) {
      try {
        const r = await this.api(`/contents/${file}?ref=${encodeURIComponent(this.branch)}&t=${Date.now()}`);
        return { items: JSON.parse(b64dec(r.content) || '[]'), sha: r.sha };
      } catch (e) { if (e.status === 404) return { items: [], sha: null }; throw e; }
    }
    async write(file, items, sha, message) {
      const body = { message, branch: this.branch, content: b64enc(JSON.stringify(items, null, 2) + '\n') };
      if (sha) body.sha = sha;
      const r = await this.api(`/contents/${file}`, { method: 'PUT', body: JSON.stringify(body) });
      return r.content.sha;
    }
    async upload(path, base64, message) {
      await this.api(`/contents/${path}`, { method: 'PUT', body: JSON.stringify({ message, branch: this.branch, content: base64 }) });
    }
    img(p) { return `https://raw.githubusercontent.com/${this.owner}/${this.repo}/${this.branch}/${String(p).replace(/^\/+/, '')}`; }
  }

  /* ---------- estado ---------- */
  const state = { store: null, type: 'venda', data: {}, q: '', status: 'todos', editing: null, preview: {} };

  /* ---------- avisos ---------- */
  let toastT;
  function toast(msg, kind = 'ok') {
    const t = $('#toast');
    t.className = 'toast is-' + kind;
    t.innerHTML = `<i class="ti ti-${kind === 'ok' ? 'circle-check' : kind === 'err' ? 'alert-triangle' : 'loader-2 spin'}"></i><span>${esc(msg)}</span>`;
    t.hidden = false;
    clearTimeout(toastT);
    if (kind !== 'wait') toastT = setTimeout(() => t.hidden = true, kind === 'err' ? 8000 : 5000);
  }
  function confirmar(titulo, texto, botao = 'Confirmar', perigo = false) {
    return new Promise(res => {
      const d = $('#confirm');
      $('#confirmT').textContent = titulo;
      $('#confirmP').textContent = texto;
      const ok = $('#confirmOk');
      ok.textContent = botao;
      ok.className = 'btn ' + (perigo ? 'btn--danger' : 'btn--gold');
      // responde direto no clique (não depende do evento "close", que alguns navegadores atrasam)
      const done = v => { ok.onclick = $('#confirmNo').onclick = d.oncancel = null; if (d.open) d.close(); res(v); };
      ok.onclick = e => { e.preventDefault(); done(true); };
      $('#confirmNo').onclick = e => { e.preventDefault(); done(false); };
      d.oncancel = e => { e.preventDefault(); done(false); };
      d.showModal();
    });
  }
  const erroAmigavel = e => e.limit ? e.message : e.status === 401 ? 'Chave de acesso inválida ou expirada. Confira a chave ou crie uma nova.'
    : e.status === 403 ? 'A chave não tem permissão para alterar este repositório.'
      : e.status === 404 ? 'Repositório não encontrado. Confira o usuário e o nome do repositório.'
        : e.status === 409 ? 'O arquivo mudou enquanto você editava. Recarregue e tente de novo.'
          : 'Não foi possível concluir: ' + (e.message || 'erro de conexão');

  /* ---------- login ---------- */
  function showLogin(msg) {
    $('#app').hidden = true;
    $('#login').hidden = false;
    $('#lOwner').value = store.get('kaio.owner') || '';
    $('#lRepo').value = store.get('kaio.repo') || '';
    $('#lBranch').value = store.get('kaio.branch') || 'main';
    $('#loginErr').textContent = msg || '';
  }
  async function start(s) {
    state.store = s;
    $('#login').hidden = true;
    $('#app').hidden = false;
    $('#repoName').textContent = s.label;
    await loadAll();
  }
  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const cfg = { owner: $('#lOwner').value.trim(), repo: $('#lRepo').value.trim(), branch: $('#lBranch').value.trim() || 'main', token: $('#lToken').value.trim() };
    const persist = $('#lRemember').checked;
    const btn = $('#loginBtn');
    btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2 spin"></i> Conectando…';
    try {
      const s = new GitHubStore(cfg);
      await s.check();
      store.set('kaio.owner', cfg.owner, true); store.set('kaio.repo', cfg.repo, true); store.set('kaio.branch', cfg.branch, true);
      store.set('kaio.token', cfg.token, persist);
      $('#lToken').value = '';
      await start(s);
    } catch (err) {
      $('#loginErr').textContent = erroAmigavel(err);
    } finally {
      btn.disabled = false; btn.innerHTML = '<i class="ti ti-login"></i> Entrar';
    }
  });
  $('#logout').addEventListener('click', () => { store.del('kaio.token'); state.store = null; state.data = {}; showLogin('Você saiu do painel.'); });

  /* ---------- carregar e listar ---------- */
  async function loadAll() {
    $('#list').innerHTML = '<div class="adm-empty"><i class="ti ti-loader-2 spin"></i><p>Carregando imóveis…</p></div>';
    try {
      const keys = Object.keys(TYPES);
      const res = await Promise.all(keys.map(k => state.store.read(TYPES[k].file)));
      keys.forEach((k, n) => state.data[k] = res[n]);
      render();
    } catch (e) {
      if (e.status === 401) return showLogin(erroAmigavel(e));
      $('#list').innerHTML = `<div class="adm-empty"><i class="ti ti-alert-triangle"></i><p>${esc(erroAmigavel(e))}</p><button class="btn btn--line" id="retry">Tentar de novo</button></div>`;
      $('#retry').onclick = loadAll;
    }
  }

  const thumb = p => !p ? '' : (state.preview[p] || state.store.img(p));
  const siteLink = (type, it) => `imovel.html?f=${type}&id=${encodeURIComponent(slug(it.titulo))}`;

  function render() {
    // abas
    $$('.adm-tab').forEach(b => {
      const k = b.dataset.type, d = state.data[k];
      b.classList.toggle('is-on', k === state.type);
      b.setAttribute('aria-selected', k === state.type);
      b.querySelector('em').textContent = d ? d.items.length : '…';
    });
    const d = state.data[state.type];
    if (!d) return;
    const q = slug(state.q);
    const rows = d.items.map((it, i) => ({ it, i })).filter(({ it }) =>
      (state.status === 'todos' || (state.status === 'ativos' ? it.ativo !== false : it.ativo === false)) &&
      (!q || slug([it.codigo, it.titulo, it.bairro, it.cidade, it.estado, it.tipo].join(' ')).includes(q)));
    const ativos = d.items.filter(i => i.ativo !== false).length;
    $('#summary').textContent = `${d.items.length} ${d.items.length === 1 ? 'imóvel' : 'imóveis'} · ${ativos} no site · ${d.items.length - ativos} desativado${d.items.length - ativos === 1 ? '' : 's'}`
      + (state.type === 'venda' ? ` · ${contaDestaques(d.items)} de ${MAX_DESTAQUES} em destaque` : '');
    if (!rows.length) {
      $('#list').innerHTML = `<div class="adm-empty"><i class="ti ti-building-community"></i><p>${d.items.length ? 'Nenhum imóvel com esse filtro.' : 'Nenhum imóvel cadastrado aqui ainda.'}</p><button class="btn btn--gold" data-new><i class="ti ti-plus"></i> Cadastrar imóvel</button></div>`;
      return;
    }
    $('#list').innerHTML = rows.map(({ it, i }) => {
      const off = it.ativo === false;
      const loc = [it.bairro, [it.cidade, it.estado].filter(Boolean).join(' - ')].filter(Boolean).join(', ');
      const extra = state.type === 'comercial' ? (it.finalidade === 'Venda' ? 'À venda' : 'Para alugar') : state.type === 'venda' ? (it.situacao || '') : (it.mobiliado ? 'Mobiliado' : '');
      return `
      <article class="adm-row${off ? ' is-off' : ''}" data-i="${i}">
        <div class="adm-row__img">${it.fotos && it.fotos[0] ? `<img src="${esc(thumb(it.fotos[0]))}" alt="" loading="lazy">` : '<i class="ti ti-photo-off"></i>'}</div>
        <div class="adm-row__info">
          <h3>${it.codigo ? `<span class="adm-code">${esc(it.codigo)}</span>` : ''}${esc(it.titulo || '(sem nome)')} ${state.type === 'venda' && it.destaque ? '<span class="adm-star" title="Destaque na página inicial"><i class="ti ti-star-filled"></i></span>' : ''}</h3>
          <p>${esc([it.tipo, extra].filter(Boolean).join(' · '))}${loc ? ' · ' + esc(loc) : ''}</p>
          <p class="adm-row__price">${esc(it.preco || 'Sem preço')}</p>
        </div>
        <span class="adm-badges">${fechado(it) ? `<span class="adm-badge is-sold">${esc(it.negocio)}</span>` : ''}<span class="adm-badge ${off ? 'is-off' : 'is-on'}">${off ? 'Desativado' : 'No site'}</span></span>
        <div class="adm-row__act">
          <button class="adm-ic" data-act="edit" title="Editar"><i class="ti ti-pencil"></i><span>Editar</span></button>
          ${state.type === 'venda' ? `<button class="adm-ic${it.destaque ? ' is-star' : ''}" data-act="star" title="${it.destaque ? 'Tirar da página inicial' : 'Destacar na página inicial'}"><i class="ti ti-star${it.destaque ? '-filled' : ''}"></i><span>${it.destaque ? 'Destaque' : 'Destacar'}</span></button>` : ''}
          <button class="adm-ic" data-act="toggle" title="${off ? 'Ativar' : 'Desativar'}"><i class="ti ti-${off ? 'eye' : 'eye-off'}"></i><span>${off ? 'Ativar' : 'Desativar'}</span></button>
          <a class="adm-ic" href="${esc(siteLink(state.type, it))}" target="_blank" rel="noopener" title="Ver no site"><i class="ti ti-external-link"></i><span>Ver</span></a>
          <button class="adm-ic adm-ic--danger" data-act="del" title="Excluir"><i class="ti ti-trash"></i><span>Excluir</span></button>
        </div>
      </article>`;
    }).join('');
  }

  $('#tabs').addEventListener('click', e => { const b = e.target.closest('.adm-tab'); if (!b) return; state.type = b.dataset.type; render(); });
  $('#search').addEventListener('input', e => { state.q = e.target.value; render(); });
  $('#statusF').addEventListener('change', e => { state.status = e.target.value; render(); });
  $('#reload').addEventListener('click', loadAll);
  document.addEventListener('click', e => { if (e.target.closest('[data-new]')) openEditor(null); });

  /* ---------- salvar com segurança (relê o arquivo antes de gravar) ---------- */
  async function commit(type, change, message) {
    const t = TYPES[type];
    const fresh = await state.store.read(t.file);
    const items = change(fresh.items.slice());
    if (!items) throw Object.assign(new Error('O imóvel foi alterado em outro lugar. Recarregue a lista.'), { status: 409 });
    const sha = await state.store.write(t.file, items, fresh.sha, message);
    state.data[type] = { items, sha };
    render();
  }
  const nextCode = (type, items) => {
    const pre = TYPES[type].prefix, nums = items.map(x => parseInt(String(x.codigo || '').split('-')[1], 10)).filter(n => !isNaN(n));
    return `${pre}-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0')}`;
  };
  const fechado = it => it.negocio === 'Vendido' || it.negocio === 'Alugado';
  const findIdx = (items, original) => items.findIndex(x => same(x, original));

  $('#list').addEventListener('click', async e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const i = +b.closest('.adm-row').dataset.i, type = state.type;
    const original = state.data[type].items[i];
    if (b.dataset.act === 'edit') return openEditor(i);
    if (b.dataset.act === 'star') {
      const on = !original.destaque;
      if (on && fechado(original)) return toast(`Este imóvel está como "${original.negocio}". Só imóveis disponíveis podem ser destaque.`, 'err');
      if (on && contaDestaques(state.data[type].items) >= MAX_DESTAQUES) return toast(limiteErro().message, 'err');
      toast(on ? 'Destacando…' : 'Tirando o destaque…', 'wait');
      try {
        await commit(type, items => {
          const k = findIdx(items, original); if (k < 0) return null;
          if (on && contaDestaques(items) >= MAX_DESTAQUES) throw limiteErro();
          items[k] = { ...items[k], destaque: on }; return items;
        }, `${on ? 'Destaca' : 'Tira destaque do'} imóvel: ${original.titulo} (painel)`);
        toast(on ? 'Imóvel em destaque na página inicial.' : 'Destaque removido da página inicial.');
      } catch (err) { toast(erroAmigavel(err), 'err'); }
    }
    if (b.dataset.act === 'toggle') {
      const on = original.ativo === false;
      toast(on ? 'Ativando…' : 'Desativando…', 'wait');
      try {
        await commit(type, items => { const k = findIdx(items, original); if (k < 0) return null; items[k] = { ...items[k], ativo: on }; return items; },
          `${on ? 'Ativa' : 'Desativa'} imóvel: ${original.titulo} (painel)`);
        toast(on ? 'Imóvel ativado. Volta a aparecer no site em cerca de 1 minuto.' : 'Imóvel desativado. Sai do site em cerca de 1 minuto.');
      } catch (err) { toast(erroAmigavel(err), 'err'); }
    }
    if (b.dataset.act === 'del') {
      const ok = await confirmar('Excluir este imóvel?', `"${original.titulo}" será apagado do site e do cadastro, e não dá para desfazer pelo painel. Se for só temporário, use "Desativar".`, 'Excluir', true);
      if (!ok) return;
      toast('Excluindo…', 'wait');
      try {
        await commit(type, items => { const k = findIdx(items, original); if (k < 0) return null; items.splice(k, 1); return items; },
          `Exclui imóvel: ${original.titulo} (painel)`);
        toast('Imóvel excluído.');
      } catch (err) { toast(erroAmigavel(err), 'err'); }
    }
  });

  /* ---------- formulário ---------- */
  function fieldHTML(fd, v) {
    const id = 'f_' + fd.name, req = fd.required ? ' required' : '', ph = fd.placeholder ? ` placeholder="${esc(fd.placeholder)}"` : '';
    const lbl = `<span class="adm-lbl">${esc(fd.label)}${fd.required ? ' <b>*</b>' : ''}</span>`;
    switch (fd.type) {
      case 'textarea': return `<label class="adm-f full">${lbl}<textarea id="${id}" rows="5"${ph}>${esc(v)}</textarea></label>`;
      case 'lines': return `<label class="adm-f full">${lbl}<textarea id="${id}" rows="4"${ph}>${esc((v || []).join('\n'))}</textarea></label>`;
      case 'number': return `<label class="adm-f">${lbl}<input id="${id}" type="number" min="0" step="1" inputmode="numeric" value="${v ?? ''}"></label>`;
      case 'select': return `<label class="adm-f">${lbl}<select id="${id}">${fd.noEmpty ? '' : '<option value="">Selecione…</option>'}${fd.options.map(o => `<option${o === v ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`;
      case 'bool': return `<label class="adm-sw"><input id="${id}" type="checkbox"${v ? ' checked' : ''}><span class="adm-sw__t"></span><span>${esc(fd.label)}</span></label>`;
      case 'photos': return `<div class="adm-f full">${lbl}<div class="adm-photos" id="photos"></div><label class="adm-up" id="photoUp"><input type="file" id="photoIn" accept="image/jpeg,image/png,image/webp" multiple><i class="ti ti-upload"></i><span><b>Adicionar fotos <em id="photoCount"></em></b><small>JPG, PNG ou WEBP. Elas são reduzidas automaticamente. A primeira foto é a capa.</small></span></label></div>`;
      case 'video': return `<div class="adm-f full">${lbl}<div id="videoBox"></div></div>`;
      default: return `<label class="adm-f${fd.full ? ' full' : ''}">${lbl}<input id="${id}" type="text"${req}${ph} value="${esc(v)}"></label>`;
    }
  }

  let photos = []; // [{ path } | { file, dataUrl }]
  function renderPhotos() {
    $('#photos').innerHTML = photos.length ? photos.map((p, n) => `
      <figure class="adm-ph" data-n="${n}">
        <img src="${esc(p.dataUrl || thumb(p.path))}" alt="">
        ${n === 0 ? '<span class="adm-ph__cover">Capa</span>' : ''}
        ${p.dataUrl ? '<span class="adm-ph__new">Nova</span>' : ''}
        <div class="adm-ph__act">
          <button type="button" data-ph="left" title="Mover para a esquerda" ${n === 0 ? 'disabled' : ''}><i class="ti ti-chevron-left"></i></button>
          <button type="button" data-ph="cover" title="Usar como capa" ${n === 0 ? 'disabled' : ''}><i class="ti ti-star"></i></button>
          <button type="button" data-ph="right" title="Mover para a direita" ${n === photos.length - 1 ? 'disabled' : ''}><i class="ti ti-chevron-right"></i></button>
          <button type="button" data-ph="del" title="Remover foto"><i class="ti ti-x"></i></button>
        </div>
      </figure>`).join('') : '<p class="adm-ph-empty">Nenhuma foto ainda.</p>';
    $('#photoUp').hidden = photos.length >= MAX_FOTOS;
    $('#photoCount').textContent = `(${photos.length} de ${MAX_FOTOS})`;
  }

  /* ---------- vídeo: link do YouTube ou arquivo (até 25 MB) ---------- */
  const MAX_FOTOS = 4, MAX_VIDEO_MB = 25;
  const ytId = u => (String(u || '').match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/|\/live\/)([\w-]{11})/) || [])[1] || '';
  let video = null; // { url } | { path } | { file, blobUrl }
  function renderVideo() {
    const box = $('#videoBox');
    if (!video) {
      box.innerHTML = `
        <div class="adm-vid-add">
          <label class="adm-f"><span class="adm-lbl"><i class="ti ti-brand-youtube"></i> Link do YouTube (recomendado)</span>
            <span class="adm-vid-link"><input id="vidUrl" type="url" placeholder="https://youtu.be/..."><button type="button" class="btn btn--line btn--sm" id="vidUrlBtn">Usar link</button></span></label>
          <span class="adm-vid-or">ou</span>
          <label class="adm-up"><input type="file" id="vidIn" accept="video/mp4,video/webm,video/quicktime"><i class="ti ti-movie"></i><span><b>Enviar arquivo de vídeo</b><small>MP4, WEBM ou MOV, até ${MAX_VIDEO_MB} MB.</small></span></label>
        </div>
        <p class="adm-hint">Dica: no YouTube, publique como <b>Não listado</b>. Só quem tiver o link (o seu site) consegue ver.</p>`;
      return;
    }
    const id = video.url ? ytId(video.url) : '';
    const src = video.blobUrl || (video.path ? thumb(video.path) : '');
    box.innerHTML = `
      <div class="adm-vid">
        ${id ? `<img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt=""><span class="adm-vid__play"><i class="ti ti-player-play-filled"></i></span>`
        : `<video src="${esc(src)}" controls preload="metadata" playsinline></video>`}
        <div class="adm-vid__info">
          <strong>${id ? '<i class="ti ti-brand-youtube"></i> Vídeo do YouTube' : '<i class="ti ti-movie"></i> Arquivo de vídeo'}${video.file ? ' <span class="adm-ph__new">Novo</span>' : ''}</strong>
          <span>${esc(video.url || (video.file ? `${video.file.name} · ${(video.file.size / 1048576).toFixed(1)} MB` : video.path))}</span>
          <button type="button" class="btn btn--line btn--sm" id="vidDel"><i class="ti ti-trash"></i> Remover vídeo</button>
        </div>
      </div>`;
  }
  const fileB64 = file => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(file); });
  async function resize(file) {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.82);
  }

  function openEditor(i) {
    const type = state.type, t = TYPES[type];
    const it = i === null ? {} : state.data[type].items[i];
    state.editing = { type, i, original: i === null ? null : JSON.parse(JSON.stringify(it)) };
    photos = (it.fotos || []).filter(Boolean).map(path => ({ path }));
    video = !it.video ? null : /^https?:/i.test(it.video) ? { url: it.video } : { path: it.video };
    const groups = [...new Set(t.fields.map(fd => fd.group))];
    $('#edTitle').textContent = i === null ? `Novo imóvel · ${t.label}` : 'Editar imóvel';
    $('#edSub').textContent = i === null ? `O código (${TYPES[type].prefix}-…) é criado automaticamente ao salvar.` : `${it.codigo ? 'Código ' + it.codigo + ' · ' : ''}${it.titulo}`;
    $('#edForm').innerHTML = groups.map(g => `
      <fieldset class="adm-g"><legend>${esc(g)}</legend><div class="adm-grid">
        ${t.fields.filter(fd => fd.group === g).map(fd => fieldHTML(fd, it[fd.name] !== undefined ? it[fd.name] : (i === null ? fd.def : undefined))).join('')}
      </div></fieldset>`).join('');
    renderPhotos();
    renderVideo();
    $('#editor').hidden = false;
    document.body.classList.add('adm-lock');
    setTimeout(() => $('#f_titulo').focus(), 50);
  }
  async function closeEditor(force) {
    if (!force && !(await confirmar('Sair sem salvar?', 'As alterações feitas neste imóvel serão perdidas.', 'Sair sem salvar', true))) return;
    $('#editor').hidden = true;
    document.body.classList.remove('adm-lock');
    state.editing = null;
  }
  $('#edClose').addEventListener('click', () => closeEditor(false));
  $('#edCancel').addEventListener('click', () => closeEditor(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#editor').hidden && !$('#confirm').open) closeEditor(false); });

  $('#editor').addEventListener('change', async e => {
    if (e.target.id === 'vidIn') {
      const file = e.target.files[0]; e.target.value = '';
      if (!file) return;
      if (file.size > MAX_VIDEO_MB * 1048576) return toast(`O vídeo tem ${(file.size / 1048576).toFixed(0)} MB. O limite é ${MAX_VIDEO_MB} MB. Use um link do YouTube ou um vídeo mais curto.`, 'err');
      video = { file, blobUrl: URL.createObjectURL(file) };
      return renderVideo();
    }
    if (e.target.id !== 'photoIn') return;
    let files = [...e.target.files];
    e.target.value = '';
    const vagas = MAX_FOTOS - photos.length;
    if (files.length > vagas) { toast(`Limite de ${MAX_FOTOS} fotos por imóvel. Só ${vagas === 1 ? 'a primeira foto foi adicionada' : `as ${vagas} primeiras foram adicionadas`}.`, 'err'); files = files.slice(0, vagas); }
    for (const file of files) {
      try { photos.push({ file, dataUrl: await resize(file) }); } catch { toast(`Não consegui ler a foto ${file.name}.`, 'err'); }
    }
    renderPhotos();
  });
  $('#editor').addEventListener('click', e => {
    if (e.target.closest('#vidUrlBtn')) {
      const u = $('#vidUrl').value.trim();
      if (!ytId(u)) return toast('Link do YouTube não reconhecido. Copie o link pelo botão "Compartilhar" do vídeo.', 'err');
      video = { url: u }; return renderVideo();
    }
    if (e.target.closest('#vidDel')) { if (video && video.blobUrl) URL.revokeObjectURL(video.blobUrl); video = null; return renderVideo(); }
    const b = e.target.closest('[data-ph]'); if (!b) return;
    const n = +b.closest('.adm-ph').dataset.n, a = b.dataset.ph;
    if (a === 'del') photos.splice(n, 1);
    if (a === 'left' && n > 0) [photos[n - 1], photos[n]] = [photos[n], photos[n - 1]];
    if (a === 'right' && n < photos.length - 1) [photos[n + 1], photos[n]] = [photos[n], photos[n + 1]];
    if (a === 'cover') photos.unshift(photos.splice(n, 1)[0]);
    renderPhotos();
  });

  $('#edSave').addEventListener('click', async () => {
    const { type, original } = state.editing, t = TYPES[type];
    const it = original ? { ...original } : {};
    for (const fd of t.fields) {
      const el = $('#f_' + fd.name);
      if (fd.type === 'photos' || fd.type === 'video') continue;
      if (fd.type === 'bool') it[fd.name] = el.checked;
      else if (fd.type === 'number') it[fd.name] = el.value === '' ? null : Math.max(0, parseInt(el.value, 10) || 0);
      else if (fd.type === 'lines') it[fd.name] = el.value.split('\n').map(s => s.trim()).filter(Boolean);
      else it[fd.name] = el.value.trim();
    }
    if (!it.titulo) { toast('Preencha o nome do imóvel.', 'err'); $('#f_titulo').focus(); return; }
    if (type !== 'venda') delete it.destaque; // destaque é só para imóveis à venda
    if (fechado(it)) it.destaque = false;
    if (type === 'venda' && it.destaque && contaDestaques(state.data.venda.items, original) >= MAX_DESTAQUES) { toast(limiteErro().message, 'err'); return; }
    if (photos.length > MAX_FOTOS) { toast(`Este imóvel tem ${photos.length} fotos. O limite é ${MAX_FOTOS}: remova ${photos.length - MAX_FOTOS} para salvar.`, 'err'); return; }
    // link colado mas não confirmado com "Usar link"
    if (!video && $('#vidUrl') && $('#vidUrl').value.trim()) {
      if (!ytId($('#vidUrl').value)) { toast('Link do YouTube não reconhecido.', 'err'); return; }
      video = { url: $('#vidUrl').value.trim() };
    }
    const btn = $('#edSave');
    btn.disabled = true;
    try {
      // 1) envia as fotos novas
      const novas = photos.filter(p => p.dataUrl);
      let n = 0;
      for (const p of novas) {
        n++;
        toast(`Enviando foto ${n} de ${novas.length}…`, 'wait');
        const path = `imagens/imoveis/${slug(it.titulo).slice(0, 50) || 'imovel'}-${Date.now().toString(36)}-${n}.jpg`;
        await state.store.upload(path, p.dataUrl.split(',')[1], `Foto do imóvel: ${it.titulo} (painel)`);
        state.preview['/' + path] = p.dataUrl;
        p.path = '/' + path; delete p.dataUrl; delete p.file;
      }
      it.fotos = photos.map(p => p.path);
      // 1b) envia o vídeo novo (arquivo) ou guarda o link
      if (video && video.file) {
        toast('Enviando vídeo… pode levar alguns segundos.', 'wait');
        const ext = (video.file.name.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4';
        const path = `videos/imoveis/${slug(it.titulo).slice(0, 50) || 'imovel'}-${Date.now().toString(36)}.${ext}`;
        await state.store.upload(path, await fileB64(video.file), `Vídeo do imóvel: ${it.titulo} (painel)`);
        state.preview['/' + path] = video.blobUrl;
        video = { path: '/' + path };
      }
      it.video = video ? (video.url || video.path) : '';
      // 2) grava o cadastro
      toast('Salvando…', 'wait');
      await commit(type, items => {
        if (type === 'venda' && it.destaque && contaDestaques(items, original) >= MAX_DESTAQUES) throw limiteErro();
        if (!it.codigo) it.codigo = nextCode(type, items);
        if (!original) { items.unshift(it); return items; }
        const k = findIdx(items, original); if (k < 0) return null;
        items[k] = it; return items;
      }, `${original ? 'Atualiza' : 'Publica'} imóvel: ${it.titulo} (painel)`);
      toast(original ? 'Alterações salvas. O site atualiza em cerca de 1 minuto.' : `Imóvel publicado com o código ${it.codigo}! Aparece no site em cerca de 1 minuto.`);
      closeEditor(true);
    } catch (err) {
      toast(erroAmigavel(err), 'err');
    } finally { btn.disabled = false; }
  });

  /* ---------- início ---------- */
  window.kaioAdmin = { start, GitHubStore, TYPES };
  const saved = { owner: store.get('kaio.owner'), repo: store.get('kaio.repo'), branch: store.get('kaio.branch'), token: store.get('kaio.token') };
  if (saved.owner && saved.repo && saved.token) start(new GitHubStore(saved)).catch(() => showLogin());
  else showLogin();
})();
