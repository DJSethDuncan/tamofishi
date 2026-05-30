(function () {
  if (!window.Capacitor) return;

  const TipPlugin = Capacitor.registerPlugin('TipPlugin');
  const section = document.getElementById('tip-section');
  const buttons = document.getElementById('tip-buttons');
  const label = document.getElementById('tip-label');

  const DEFAULTS = [
    { label: '$1 TIP', id: 'com.djsethduncan.tamofishi.tip.small' },
    { label: '$5 TIP', id: 'com.djsethduncan.tamofishi.tip.medium' },
    { label: '$10 TIP', id: 'com.djsethduncan.tamofishi.tip.large' },
  ];

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

  function makeBtns(tips) {
    return tips.map(t => btn(t.label, () => purchase(t.id)));
  }

  function loadProducts() {
    setButtons(makeBtns(DEFAULTS));
    TipPlugin.getProducts()
      .then(({ products }) => {
        if (!products.length) return;
        setButtons(products.map(p =>
          btn(p.displayPrice + ' — ' + p.displayName.toUpperCase(), () => purchase(p.id))
        ));
      })
      .catch(() => {});
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

  const observer = new MutationObserver(() => {
    const modal = document.getElementById('settings-modal');
    if (!modal.classList.contains('hidden')) loadProducts();
  });
  observer.observe(document.getElementById('settings-modal'), { attributeFilter: ['class'] });
})();
