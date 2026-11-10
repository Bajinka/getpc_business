(function () {
  'use strict';
  // Replace this sample data with validated Google Sheets data in the next phase.
  const products = [
    { id: 'sample-laptop', name: 'Everyday laptop', category: 'Laptops', price: 8500, available: true, description: 'An example laptop for documents, online learning, and everyday work.', details: 'Illustrative specification: Core i5 processor, 8 GB RAM, and 256 GB SSD. Actual brand, condition, specifications, and warranty must be confirmed with GET-PC.', icon: 'laptop' },
    { id: 'sample-desktop', name: 'Office desktop', category: 'Desktops', price: 6500, available: true, description: 'An example desktop setup for a home office or study space.', details: 'Illustrative specification: 8 GB RAM and 256 GB SSD. Monitor and accessories are not implied to be included. Ask GET-PC about current options.', icon: 'desktop' },
    { id: 'sample-mouse', name: 'Wireless mouse', category: 'Accessories', price: 350, available: true, description: 'An example wireless accessory for a simpler workspace.', details: 'Example wireless mouse with a USB receiver. Compatibility, batteries, colour, and actual availability must be confirmed.', icon: 'mouse' },
    { id: 'sample-keyboard', name: 'USB keyboard', category: 'Accessories', price: 500, available: true, description: 'An example full-size keyboard for everyday typing.', details: 'Example wired keyboard for a desktop or laptop. Ask GET-PC about layout and compatible devices.', icon: 'keyboard' },
    { id: 'sample-monitor', name: 'Desktop monitor', category: 'Monitors', price: 3500, available: false, description: 'An example display for work, study, and a larger view.', details: 'This item demonstrates the sold-out state. Size, resolution, ports, and condition will be listed for real products.', icon: 'desktop' },
    { id: 'sample-printer', name: 'Home office printer', category: 'Printers', price: 9500, available: true, description: 'An example printer for documents and everyday office tasks.', details: 'Ask GET-PC about current printer models, ink costs, connection options, and warranty before purchasing.', icon: 'printer' }
  ];
  const icons = {
    laptop: '<rect x="22" y="15" width="116" height="75" rx="5"/><path d="M12 98h136l-12 10H24z"/><path d="M35 31h90v43H35z"/>',
    desktop: '<rect x="15" y="12" width="130" height="80" rx="5"/><path d="M80 92v18m-30 0h60M28 28h104v48H28z"/>',
    mouse: '<rect x="48" y="9" width="64" height="102" rx="32"/><path d="M80 9v37m-31 0h62"/><path d="M80 25v9"/>',
    keyboard: '<rect x="8" y="30" width="144" height="62" rx="7"/><path d="M22 46h116M22 60h116M22 75h22m10 0h52m10 0h22"/>',
    printer: '<path d="M40 44V10h80v34M40 88H18V44h124v44h-22M40 70h80v40H40zM55 84h50M55 96h50"/><circle cx="127" cy="57" r="2"/>'
  };
  const grid = document.getElementById('product-grid');
  const search = document.getElementById('product-search');
  const filters = document.getElementById('category-filters');
  const dialog = document.getElementById('product-dialog');
  let category = 'All';
  let previousFocus;
  const money = value => 'D' + value.toLocaleString('en-GB');
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }
  function artwork(product) {
    const box = element('div', 'product-art');
    box.setAttribute('aria-hidden', 'true');
    // Only fixed, local SVG paths are inserted; product text uses textContent.
    box.innerHTML = '<svg viewBox="0 0 160 120" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">' + icons[product.icon] + '</svg>';
    box.append(element('span', 'sample-tag', 'SAMPLE • ILLUSTRATION'));
    return box;
  }
  function inquiry(product) {
    const phone = String((window.GETPC_CONFIG?.contact?.whatsapp) || '').replace(/\D/g, '');
    const link = element('a', 'button button-dark', product.available ? 'Ask to Buy on WhatsApp ↗' : 'Ask about alternatives ↗');
    if (phone.length >= 7 && phone.length <= 15) {
      const message = 'Hello GET-PC, I saw the SAMPLE ' + product.name + ' (illustrative price ' + money(product.price) + ') on your website. ' + (product.available ? 'Do you have a similar product for sale? Please confirm the actual price and availability.' : 'Do you have similar products available?');
      link.href = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(message);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    } else {
      link.href = 'contact.html';
      link.textContent = 'Contact GET-PC';
    }
    return link;
  }
  function openDetails(product, trigger) {
    previousFocus = trigger;
    const content = document.getElementById('product-dialog-content');
    content.replaceChildren(artwork(product));
    const title = element('h2', '', product.name);
    title.id = 'product-dialog-title';
    content.append(title, element('p', 'product-price', money(product.price)), element('p', '', product.details), element('p', 'sample-detail', 'Sample product and illustrative price only. Contact GET-PC to confirm actual products, prices, payment, and collection.'), inquiry(product));
    dialog.showModal();
  }
  function render() {
    const term = search.value.trim().toLowerCase();
    const visible = products.filter(p => (category === 'All' || p.category === category) && (p.name + ' ' + p.category + ' ' + p.description).toLowerCase().includes(term));
    grid.replaceChildren();
    visible.forEach(product => {
      const card = element('article', 'product-card');
      card.id = product.id;
      const body = element('div', 'product-body');
      const meta = element('div', 'product-meta');
      meta.append(element('span', '', product.category), element('span', 'stock' + (product.available ? '' : ' sold'), product.available ? 'Sample: available' : 'Sample: sold out'));
      const price = element('p', 'product-price', money(product.price));
      price.append(element('small', '', 'Illustrative price'));
      const actions = element('div', 'product-actions');
      const detail = element('button', 'details-button', 'View details');
      detail.type = 'button';
      detail.setAttribute('aria-label', 'View details for ' + product.name);
      detail.addEventListener('click', () => openDetails(product, detail));
      actions.append(detail, inquiry(product));
      body.append(meta, element('h3', '', product.name), element('p', 'product-description', product.description), price, actions);
      card.append(artwork(product), body);
      grid.append(card);
    });
    document.getElementById('product-count').textContent = visible.length + ' sample product' + (visible.length === 1 ? '' : 's');
    document.getElementById('product-empty').hidden = visible.length !== 0;
    filters.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.textContent === category)));
  }
  ['All', ...new Set(products.map(p => p.category))].forEach(name => {
    const button = element('button', '', name);
    button.type = 'button';
    button.addEventListener('click', () => { category = name; render(); });
    filters.append(button);
  });
  search.addEventListener('input', render);
  document.getElementById('clear-filters').addEventListener('click', () => { category = 'All'; search.value = ''; render(); search.focus(); });
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => previousFocus?.focus());
  render();
}());
