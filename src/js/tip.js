(function () {
  if (!window.Capacitor) return;

  const TipPlugin = Capacitor.registerPlugin('TipPlugin');
  const section = document.getElementById('tip-section');
  const buttons = document.getElementById('tip-buttons');
  const label = document.getElementById('tip-label');

  section.classList.remove('hidden');

  function setButtons(els) {
    while (buttons.firstChild) buttons.removeChild(buttons.firstChild);
    els.forEach(e => buttons.appendChild(e));
  }

  function btn(text, onClick) {
    const b = document.createElement('button');
    b.className = 'btn btn-modal';
    b.textContent = text;
    b.addEventListener('click', onClick);
    return b;
  }

  function loadProducts() {
    setButtons([btn('LOADING...', () => {})]);
    TipPlugin.getProducts()
      .then(({ products }) => {
        if (!products.length) { setButtons([]); return; }
        setButtons(products.map(p =>
          btn(p.displayPrice + ' — ' + p.displayName.toUpperCase(), () => purchase(p.id))
        ));
      })
      .catch(() => setButtons([btn('UNAVAILABLE', () => {})]));
  }

  async function purchase(productId) {
    try {
      const { status } = await TipPlugin.purchase({ productId });
      if (status === 'success') {
        const prev = label.textContent;
        label.textContent = '— THANK YOU ♥ —';
        setButtons([]);
        setTimeout(() => { label.textContent = prev; loadProducts(); }, 3000);
      }
    } catch (_) {}
  }

  // Load products whenever the settings modal opens
  const observer = new MutationObserver(() => {
    const modal = document.getElementById('settings-modal');
    if (!modal.classList.contains('hidden')) loadProducts();
  });
  observer.observe(document.getElementById('settings-modal'), { attributeFilter: ['class'] });
})();
