(async function () {
  'use strict';
  const grid = document.getElementById('home-product-grid');
  if (!grid) return;
  const status = document.getElementById('home-products-status');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const endpoint = new URL(window.GETPC_CONFIG.productsFeedUrl);
    if (endpoint.protocol !== 'https:' || endpoint.hostname !== 'script.google.com' || !/^\/macros\/s\/[^/]+\/exec$/.test(endpoint.pathname)) throw Error('Invalid feed');
    const response = await fetch(endpoint.href,{credentials:'omit',signal:controller.signal});
    if (!response.ok) throw Error('Unavailable');
    const all = window.GETPC_PRODUCTS.normalize(await response.json()).filter(p=>p.available);
    const products = [...all.filter(p=>p.featured), ...all.filter(p=>!p.featured)].slice(0,3);
    products.forEach(p=>{
      const card=document.createElement('a');card.className='home-product';card.href='products.html?product='+encodeURIComponent(p.id);
      if(p.imageUrl){const image=document.createElement('img');image.src=p.imageUrl;image.alt=p.name;image.loading='lazy';image.addEventListener('error',()=>image.remove());card.append(image);}
      const name=document.createElement('h3');name.textContent=p.name;
      const price=document.createElement('strong');price.textContent='D'+p.price.toLocaleString('en-GB');
      const next=document.createElement('p');next.textContent='View product →';card.append(name,price,next);grid.append(card);
    });
    status.textContent=products.length ? '' : 'Ask us about current stock, or browse the full catalogue.';
  } catch (_) {status.textContent='Browse the full catalogue for products and availability.';}
  finally {clearTimeout(timer);}
}());
