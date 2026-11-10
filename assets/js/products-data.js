(function (root) {
  'use strict';
  function normalize(data) {
    if (!data || data.ok !== true || !Array.isArray(data.products)) throw new Error('Invalid product feed');
    const seen = new Set();
    const icons = { Laptops: 'laptop', Desktops: 'desktop', Monitors: 'desktop', Printers: 'printer', Accessories: 'keyboard' };
    const products = data.products.map(p => {
      if (!p || typeof p !== 'object' || typeof p.id !== 'string' || !p.id.trim() || typeof p.name !== 'string' || !p.name.trim() || typeof p.price !== 'number' || !Number.isFinite(p.price) || p.price < 0 || !['Available', 'Sold out'].includes(p.availability)) throw new Error('Invalid product');
      const id = p.id.trim();
      if (seen.has(id)) throw new Error('Duplicate product');
      seen.add(id);
      let imageUrl = '';
      try { const url = new URL(p.imageUrl); if (url.protocol === 'https:' && !url.username && !url.password) imageUrl = url.href; } catch (_) {}
      const category = typeof p.category === 'string' && p.category.trim() ? p.category.trim() : 'Other';
      return {id, name:p.name.trim(), price:p.price, category, imageUrl, available:p.availability === 'Available', description:typeof p.description === 'string' ? p.description : '', details:typeof p.details === 'string' ? p.details : '', icon:icons[category] || 'laptop'};
    });
    return products;
  }
  root.GETPC_PRODUCTS = {normalize};
}(typeof window === 'undefined' ? globalThis : window));
