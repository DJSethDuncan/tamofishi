(function () {
  if (!window.Capacitor) return;

  const TipPlugin = Capacitor.registerPlugin('TipPlugin');
  const modal = document.getElementById('settings-modal');
  const settingsPanel = document.getElementById('settings-panel');
  let products = null;

  // Inject SUPPORT button above CLOSE
  const supportBtn = document.createElement('button');
  supportBtn.className = 'btn btn-modal';
  supportBtn.textContent = 'SUPPORT DEV';
  settingsPanel.insertBefore(supportBtn, document.getElementById('settings-close'));

  // Tip panel lives alongside settings-panel inside the modal
  const tipPanel = document.createElement('div');
  tipPanel.id = 'tip-panel';
  tipPanel.className = 'hidden';
  modal.appendChild(tipPanel);

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function render(state) {
    while (tipPanel.firstChild) tipPanel.removeChild(tipPanel.firstChild);

    if (state === 'loading') {
      tipPanel.appendChild(el('div', 'tip-label', 'LOADING...'));
    } else if (state === 'products' && products) {
      tipPanel.appendChild(el('div', 'tip-label', 'SUPPORT THE DEV'));
      products.forEach(p => {
        const btn = el('button', 'btn btn-modal tip-btn', p.displayPrice + ' — ' + p.displayName.toUpperCase());
        btn.dataset.id = p.id;
        btn.addEventListener('click', () => purchase(p.id));
        tipPanel.appendChild(btn);
      });
    } else if (state === 'success') {
      tipPanel.appendChild(el('div', 'tip-label', 'THANK YOU ♥'));
    } else {
      tipPanel.appendChild(el('div', 'tip-label', 'SOMETHING WENT WRONG'));
    }

    const backBtn = el('button', 'btn btn-modal', state === 'success' ? 'CLOSE' : 'BACK');
    backBtn.addEventListener('click', showSettings);
    tipPanel.appendChild(backBtn);
  }

  function showSettings() {
    tipPanel.classList.add('hidden');
    settingsPanel.classList.remove('hidden');
  }

  function showTip() {
    settingsPanel.classList.add('hidden');
    tipPanel.classList.remove('hidden');
    if (products) { render('products'); return; }
    render('loading');
    TipPlugin.getProducts()
      .then(r => { products = r.products; render('products'); })
      .catch(() => render('error'));
  }

  async function purchase(productId) {
    try {
      const { status } = await TipPlugin.purchase({ productId });
      if (status === 'success') {
        render('success');
        setTimeout(() => { modal.classList.add('hidden'); showSettings(); }, 2000);
      } else if (status === 'cancelled') {
        render('products');
      }
    } catch (_) {
      render('error');
    }
  }

  supportBtn.addEventListener('click', showTip);
})();
