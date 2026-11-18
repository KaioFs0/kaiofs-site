// Menu do celular
const toggle = document.querySelector('.nav__toggle');
const menu = document.getElementById('menu');
function setMenu(open) {
  menu.classList.toggle('is-open', open);
  toggle.setAttribute('aria-expanded', open);
  toggle.innerHTML = open ? '<i class="ti ti-x"></i>' : '<i class="ti ti-menu-2"></i>';
}
toggle.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));

// Marca a página atual no menu
const here = location.pathname.split('/').pop() || 'index.html';
menu.querySelectorAll('a[href]').forEach(a => {
  if (a.getAttribute('href') === here) a.setAttribute('aria-current', 'page');
});

// Animação ao rolar
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
} else {
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-in'));
}

// Simulador (só existe na Home)
const $ = id => document.getElementById(id);
if ($('valor')) {
  const brl = n => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const inputs = ['valor', 'aluguel', 'valoriz', 'prazo'].map($);
  const calc = () => {
    const valor = +$('valor').value, alug = +$('aluguel').value / 100,
          val = +$('valoriz').value / 100, prazo = +$('prazo').value;
    $('oValor').textContent = brl(valor);
    $('oAluguel').textContent = $('aluguel').value.replace('.', ',') + '% ao ano';
    $('oVal').textContent = $('valoriz').value.replace('.', ',') + '% ao ano';
    $('oPrazo').textContent = prazo + (prazo > 1 ? ' anos' : ' ano');
    // o aluguel acompanha a valorização do imóvel ano a ano
    let total = 0, v = valor;
    for (let i = 0; i < prazo; i++) { total += v * alug; v *= 1 + val; }
    $('rMes').textContent = brl(valor * alug / 12);
    $('rTot').textContent = brl(total);
    $('rFim').textContent = brl(v);
    inputs.forEach(r => r.style.setProperty('--p', ((r.value - r.min) / (r.max - r.min) * 100) + '%'));
  };
  inputs.forEach(i => i.addEventListener('input', calc));
  calc();
}

// Simulador de financiamento (página Comprar): SAC ou Price
if ($('finForm')) {
  const brl = n => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const ids = ['fValor', 'fEnt', 'fPrazo', 'fJuros'];
  const calcFin = () => {
    const valor = +$('fValor').value, entPct = +$('fEnt').value, anos = +$('fPrazo').value, aa = +$('fJuros').value / 100;
    const pv = valor * (1 - entPct / 100), n = anos * 12, i = Math.pow(1 + aa, 1 / 12) - 1; // juros efetivos ao mês
    const sac = document.querySelector('input[name=sistema]:checked').value === 'sac';
    let primeira, ultima, total;
    if (sac) {
      const amort = pv / n;
      primeira = amort + pv * i;
      ultima = amort + amort * i;
      total = pv + i * amort * n * (n + 1) / 2;
    } else {
      primeira = ultima = pv * i / (1 - Math.pow(1 + i, -n));
      total = primeira * n;
    }
    $('fValorO').textContent = brl(valor);
    $('fEntO').textContent = `${entPct}% · ${brl(valor * entPct / 100)}`;
    $('fPrazoO').textContent = `${anos} anos · ${n} parcelas`;
    $('fJurosO').textContent = String(aa * 100).replace('.', ',') + '% ao ano';
    $('fParcK').textContent = sac ? 'Primeira parcela' : 'Parcela fixa';
    $('fUltK').textContent = sac ? 'Última parcela' : 'Número de parcelas';
    $('fParc').textContent = brl(primeira);
    $('fUlt').textContent = sac ? brl(ultima) : String(n);
    $('fFin').textContent = brl(pv);
    $('fRenda').textContent = brl(primeira / 0.3); // bancos costumam limitar a parcela a ~30% da renda
    $('fTot').textContent = brl(total);
    ids.forEach(id => { const r = $(id); r.style.setProperty('--p', ((r.value - r.min) / (r.max - r.min) * 100) + '%'); });
    const msg = `Olá, Kaio! Fiz uma simulação de financiamento no seu site:\n\n🏠 Imóvel: ${brl(valor)}\n💵 Entrada: ${brl(valor * entPct / 100)} (${entPct}%)\n📅 Prazo: ${anos} anos (${sac ? 'SAC' : 'Price'})\n💰 Parcela estimada: ${brl(primeira)}\n\nPode fazer a simulação oficial para mim?`;
    $('fWa').href = 'https://wa.me/5511989008162?text=' + encodeURIComponent(msg);
  };
  ids.forEach(id => $(id).addEventListener('input', calcFin));
  document.querySelectorAll('input[name=sistema]').forEach(r => r.addEventListener('change', calcFin));
  calcFin();
}

$('ano').textContent = new Date().getFullYear();
