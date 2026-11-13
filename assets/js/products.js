(function () {
  'use strict';
  let products = [];
  let loading = false;
  let loadError = '';
  const icons = {
    laptop: '<rect x="22" y="15" width="116" height="75" rx="5"/><path d="M12 98h136l-12 10H24z"/><path d="M35 31h90v43H35z"/>',
    desktop: '<rect x="15" y="12" width="130" height="80" rx="5"/><path d="M80 92v18m-30 0h60M28 28h104v48H28z"/>',
    mouse: '<rect x="48" y="9" width="64" height="102" rx="32"/><path d="M80 9v37m-31 0h62"/><path d="M80 25v9"/>',
    keyboard: '<rect x="8" y="30" width="144" height="62" rx="7"/><path d="M22 46h116M22 60h116M22 75h22m10 0h52m10 0h22"/>',
    printer: '<path d="M40 44V10h80v34M40 88H18V44h124v44h-22M40 70h80v40H40zM55 84h50M55 96h50"/><circle cx="127" cy="57" r="2"/>'
  };
  const grid = document.getElementById('product-grid');
  const search = document.getElementById('product-search');
  const sort = document.getElementById('product-sort');
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
  function artwork(product, interactive = false) {
    const box = element('div', 'product-art');
    const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let angle = 0;
    function turn(x, y) {
      box.style.setProperty('--rotate-x', x + 'deg');
      box.style.setProperty('--rotate-y', y + 'deg');
    }
    box.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || reducedMotion()) return;
      const bounds = box.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      turn((0.5 - (event.clientY - bounds.top) / bounds.height) * 16,
        ((event.clientX - bounds.left) / bounds.width - 0.5) * 24);
    });
    box.addEventListener('pointerleave', () => turn(0, angle));

    // Only fixed, local SVG paths are inserted; product text uses textContent.
    box.innerHTML = '<svg viewBox="0 0 160 120" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">' + (icons[product.icon] || icons.laptop) + '</svg>';
    box.querySelector('svg').setAttribute('aria-hidden', 'true');
    if (product.imageUrl) {
      const photo = document.createElement('img');
      photo.alt = product.name;
      photo.loading = 'lazy';
      photo.decoding = 'async';
      photo.referrerPolicy = 'no-referrer';
      photo.addEventListener('load', () => { box.querySelector('svg').style.display = 'none'; });
      photo.addEventListener('error', () => { photo.remove(); box.querySelector('svg').style.display = '';  });
      photo.src = product.imageUrl;
      box.append(photo);
    } else {
      box.append(element('span', 'sample-tag', 'PHOTO COMING SOON'));
    }
    if (interactive) {
      const controls = element('div', 'photo-controls');
      controls.setAttribute('role', 'group');
      controls.setAttribute('aria-label', 'Rotate product photo');
      const rotate = (label, change) => {
        const button = element('button', '', label);
        button.type = 'button';
        button.addEventListener('click', () => {
          angle = change === 0 ? 0 : Math.max(-50, Math.min(50, angle + change));
          turn(0, angle);
        });
        controls.append(button);
      };
      rotate('Rotate left', -25);
      rotate('Reset', 0);
      rotate('Rotate right', 25);
      const viewer = element('div', 'photo-viewer');
      const zoom = element('button', '', 'Zoom photo');
      zoom.type = 'button';
      zoom.setAttribute('aria-pressed', 'false');
      zoom.disabled = !product.imageUrl;
      zoom.addEventListener('click', () => {
        const active = viewer.classList.toggle('is-zoomed');
        zoom.setAttribute('aria-pressed', String(active));
        zoom.textContent = active ? 'Reset zoom' : 'Zoom photo';
      });
      controls.append(zoom);
      const thumbs = element('div', 'gallery-thumbnails');
      const photos = product.imageUrls || [product.imageUrl];
      if (photos.length > 1) photos.forEach((url,index) => {
        const button = element('button');button.type='button';
        button.setAttribute('aria-label', 'Show photo ' + (index + 1));
        button.setAttribute('aria-pressed', String(index === 0));
        const thumb = document.createElement('img');thumb.src=url;thumb.alt='';thumb.loading='lazy';button.append(thumb);
        button.addEventListener('click', () => {
          let photo = box.querySelector('img');
          if (!photo) {
            photo = document.createElement('img');photo.alt=product.name;
            photo.addEventListener('load',()=>{box.querySelector('svg').style.display='none';zoom.disabled=false;});
            photo.addEventListener('error',()=>{photo.remove();box.querySelector('svg').style.display='';zoom.disabled=true;});
            box.append(photo);
          }
          photo.src=url;
          thumbs.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
        });
        thumbs.append(button);
      });
      viewer.append(box, thumbs, controls, element('p', 'photo-hint', 'Tilt the photo with your mouse or the rotation buttons. Photo effect only.'));
      return viewer;
    }
    return box;
  }
  function inquiry(product) {
    const phone = String((window.GETPC_CONFIG?.contact?.whatsapp) || '').replace(/\D/g, '');
    const link = element('a', 'button button-dark', product.available ? 'Ask to Buy on WhatsApp ↗' : 'Ask about alternatives ↗');
    if (phone.length >= 7 && phone.length <= 15) {
      const message = 'Hello GET-PC, I am interested in ' + product.name + ' (' + money(product.price) + ', product ID: ' + product.id + '). ' + (product.available ? 'Is it available? Please confirm the price and how I can buy it.' : 'It is listed as sold out. Do you have a similar product available?');
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
    content.replaceChildren(artwork(product, true));
    const title = element('h2', '', product.name);
    title.id = 'product-dialog-title';
    content.append(title, element('p', 'product-price', money(product.price)), element('p', 'product-specs', product.details), element('p', 'purchase-note', 'Contact GET-PC to confirm availability, payment, and collection before buying.'), inquiry(product));
    if (product.condition) content.append(element('p', '', 'Condition: ' + product.condition));
    content.append(element('p', 'purchase-note', 'Ask us to confirm any warranty, delivery options and charges before you pay.'));
    const sharing = element('div', 'product-share');
    const share = element('button', 'details-button', 'Copy product link');share.type='button';
    const productUrl = new URL('products.html', window.location.href);productUrl.searchParams.set('product', product.id);
    const shareStatus = element('p');shareStatus.setAttribute('role','status');
    share.addEventListener('click', async () => {
      try {await Promise.race([navigator.clipboard.writeText(productUrl.href), new Promise((_,reject)=>setTimeout(()=>reject(new Error('Clipboard unavailable')),2000))]);shareStatus.textContent='Product link copied.';}
      catch (_) {const input=element('input');input.value=productUrl.href;input.readOnly=true;input.setAttribute('aria-label','Product link to copy');sharing.append(input);input.focus();input.select();shareStatus.textContent='Copy the selected link.';}
    });
    const permalink = element('a', 'text-link', 'Open product link');permalink.href=productUrl.href;
    sharing.append(share,permalink,shareStatus);content.append(sharing);
    dialog.showModal();
  }
  function render() {
    const term = search.value.trim().toLowerCase();
    const visible = products.filter(p => (category === 'All' || p.category === category) && (p.name + ' ' + p.category + ' ' + p.description).toLowerCase().includes(term));
    if (sort?.value === 'price-low') visible.sort((a,b)=>a.price-b.price);
    if (sort?.value === 'price-high') visible.sort((a,b)=>b.price-a.price);
    if (sort?.value === 'name') visible.sort((a,b)=>a.name.localeCompare(b.name));
    grid.replaceChildren();
    visible.forEach(product => {
      const card = element('article', 'product-card');
      card.dataset.productId = product.id;
      const body = element('div', 'product-body');
      const meta = element('div', 'product-meta');
      meta.append(element('span', '', product.category), element('span', 'stock' + (product.available ? '' : ' sold'), product.available ? 'Available' : 'Sold out'));
      const price = element('p', 'product-price', money(product.price));

      const actions = element('div', 'product-actions');
      const detail = element('button', 'details-button', 'View details');
      detail.type = 'button';
      detail.setAttribute('aria-label', 'View details for ' + product.name);
      detail.addEventListener('click', () => openDetails(product, detail));
      actions.append(detail, inquiry(product));
      if (product.condition) body.append(element('p', 'small-note', product.condition));
      body.append(meta, element('h3', '', product.name), element('p', 'product-description', product.description), price, actions);
      card.append(artwork(product), body);
      grid.append(card);
    });
    document.getElementById('product-count').textContent = visible.length + ' product' + (visible.length === 1 ? '' : 's');
    document.getElementById('product-empty').hidden = loading || !!loadError || visible.length !== 0;
    if (!loading && !loadError && !products.length) document.getElementById('product-empty').querySelector('p').textContent = 'New products will appear here soon. Contact GET-PC for current availability.';
    filters.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.textContent === category)));
  }
  function buildFilters() {
    filters.replaceChildren();
    ['All', ...new Set(products.map(p => p.category))].forEach(name => {
      const button = element('button', '', name);
      button.type = 'button';
      button.addEventListener('click', () => { category = name; render(); });
      filters.append(button);
    });
  }
  async function loadProducts() {
    loading = true;
    loadError = '';
    const state = document.getElementById('catalogue-state');
    const message = document.getElementById('catalogue-state-message');
    const retry = document.getElementById('retry-products');
    state.hidden = false;
    retry.hidden = true;
    message.textContent = 'Loading products…';
    search.disabled = true;
    render();
    const endpoint = window.GETPC_CONFIG?.productsFeedUrl || '';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      if (!endpoint) throw new Error('unconfigured');
      const url = new URL(endpoint);
      if (url.protocol !== 'https:' || url.hostname !== 'script.google.com' || !/^\/macros\/s\/[^/]+\/exec$/.test(url.pathname)) throw new Error('unconfigured');
      const response = await fetch(url.href, { signal: controller.signal, credentials: 'omit', redirect: 'follow' });
      if (!response.ok) throw new Error('unavailable');
      const data = await response.json();
      products = window.GETPC_PRODUCTS.normalize(data);
      category = 'All';
      buildFilters();
      state.hidden = true;
    } catch (error) {
      products = [];
      loadError = error.message;
      message.textContent = loadError === 'unconfigured' ? 'Our product catalogue is being prepared. Please contact GET-PC for current products and prices.' : 'We could not load products right now. Please try again or contact GET-PC.';
      retry.hidden = loadError === 'unconfigured';
    } finally {
      clearTimeout(timeout);
      loading = false;
      search.disabled = !!loadError;
      render();
      if (!loadError) {
        const id = new URLSearchParams(window.location.search).get('product');
        const selected = products.find(p=>p.id===id);
        if (selected) openDetails(selected, search);
        else if (id) {state.hidden=false;message.textContent='This product is no longer listed. Browse our current products below.';}
      }
    }
  }
  document.getElementById('retry-products').addEventListener('click', loadProducts);
  sort?.addEventListener('change', render);
  search.addEventListener('input', render);
  document.getElementById('clear-filters').addEventListener('click', () => { category = 'All'; search.value = ''; render(); search.focus(); });
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => previousFocus?.focus());
  loadProducts();
}());
