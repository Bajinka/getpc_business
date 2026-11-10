const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const headers = ['Product ID','Product name','Price (D)','Description','Category','Image URL','Availability','Show on website','Details'];
const row = ['laptop-001','Laptop <test>',8500,'For study','Laptops','https://example.com/laptop.jpg','Available','Yes','8 GB RAM'];
const server = vm.createContext({console:{warn(){},error(){}}});
vm.runInContext(source('apps-script/products.gs'), server);
const rows = [headers,row,[...row.slice(0,7),'No', 'private hidden details'],['zero','Free accessory',0,'','Accessories','','Sold out','Yes',''],['blank','Blank price','','','','','Available','Yes',''],['negative','Negative price',-1,'','','','Available','Yes',''],row];
const feed = JSON.parse(JSON.stringify(server.productRows_(rows)));
assert.equal(feed.length,2);
assert.equal(feed[1].price,0);
assert(!JSON.stringify(feed).includes('private hidden details'));
assert.throws(()=>server.productRows_([['Wrong header']]));
const dataContext = vm.createContext({URL});
vm.runInContext(source('assets/js/products-data.js'),dataContext);
const normalize = dataContext.GETPC_PRODUCTS.normalize;
assert.equal(normalize({ok:true,products:feed})[0].imageUrl,'https://example.com/laptop.jpg');
assert.equal(normalize({ok:true,products:[{...feed[0],imageUrl:'javascript:alert(1)'}]})[0].imageUrl,'');
assert.equal(normalize({ok:true,products:[{...feed[0],imageUrl:'https://name:secret@example.com/a.jpg'}]})[0].imageUrl,'');
assert.throws(()=>normalize({ok:true,products:[{...feed[0],price:''}]}));
assert.throws(()=>normalize({ok:true,products:[feed[0],feed[0]]}));
assert.throws(()=>normalize({ok:false,products:[]}));

// Minimal DOM harness: checks async state transitions without browser dependencies.
class Element {
  constructor(tag='div'){this.tag=tag;this.children=[];this.handlers={};this.attrs={};this.style={};this.dataset={};this.value='';this.textContent='';}
  append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
  replaceChildren(...nodes){this.children=[];this.append(...nodes);}
  set innerHTML(value){this.html=value;this.children=[new Element('svg')];}
  setAttribute(key,value){this.attrs[key]=value;}
  addEventListener(event,callback){this.handlers[event]=callback;}
  querySelector(selector){return this.children.find(x=>selector==='.'+x.className || selector===x.tag);}
  querySelectorAll(tag){return this.children.filter(x=>x.tag===tag);}
  remove(){this.parent.children=this.parent.children.filter(x=>x!==this);}
  focus(){this.focused=true;}
  showModal(){this.open=true;}
  close(){this.open=false;this.handlers.close();}
}
async function ui(endpoint,fetcher){
  const ids={};
  for(const id of ['product-grid','product-search','category-filters','product-dialog','product-dialog-content','product-count','product-empty','clear-filters','catalogue-state','catalogue-state-message','retry-products'])ids[id]=new Element();
  const close=new Element('button');close.className='dialog-close';ids['product-dialog'].append(close);ids['product-empty'].append(new Element('p'));
  const window={GETPC_CONFIG:{productsFeedUrl:endpoint,contact:{whatsapp:'+220 3696147'}},GETPC_PRODUCTS:{normalize}};
  const context=vm.createContext({window,document:{getElementById:id=>ids[id],createElement:tag=>new Element(tag)},URL,AbortController,setTimeout,clearTimeout,fetch:fetcher});
  vm.runInContext(source('assets/js/products.js'),context);
  await new Promise(resolve=>setImmediate(resolve));
  return ids;
}
(async()=>{
  const endpoint='https://script.google.com/macros/s/test/exec';
  const valid=async()=>({ok:true,json:async()=>({ok:true,products:feed})});
  const ids=await ui(endpoint,valid);
  assert.equal(ids['product-grid'].children.length,2);
  const card=ids['product-grid'].children[0];
  const photo=card.children[0].querySelector('img');
  assert.equal(photo.alt,'Laptop <test>');
  photo.handlers.load();assert.equal(card.children[0].querySelector('svg').style.display,'none');
  photo.handlers.error();assert.equal(card.children[0].querySelector('img'),undefined);
  assert.equal(card.children[0].querySelector('svg').style.display,'');
  const actions=card.children[1].children.at(-1);
  assert(decodeURIComponent(actions.children[1].href).includes('laptop-001'));
  assert(decodeURIComponent(actions.children[1].href).includes('D8,500'));
  actions.children[0].handlers.click();assert(ids['product-dialog'].open);
  ids['product-dialog'].querySelector('.dialog-close').handlers.click();assert(actions.children[0].focused);
  ids['product-search'].value='not found';ids['product-search'].handlers.input();assert.equal(ids['product-empty'].hidden,false);
  ids['clear-filters'].handlers.click();assert.equal(ids['product-grid'].children.length,2);
  ids['category-filters'].children.find(x=>x.textContent==='Accessories').handlers.click();assert.equal(ids['product-grid'].children.length,1);
  const empty=await ui(endpoint,async()=>({ok:true,json:async()=>({ok:true,products:[]})}));assert.equal(empty['product-empty'].hidden,false);
  const unconfigured=await ui('',()=>{throw new Error('Should not fetch');});assert(unconfigured['catalogue-state-message'].textContent.includes('being prepared'));
  let fails=true;
  const error=await ui(endpoint,async()=>{if(fails)throw new Error('Network');return valid();});assert.equal(error['product-grid'].children.length,0);assert.equal(error['retry-products'].hidden,false);
  fails=false;await error['retry-products'].handlers.click();assert.equal(error['product-grid'].children.length,2);
  const malformed=await ui(endpoint,async()=>({ok:true,json:async()=>{throw new Error('Invalid JSON');}}));assert.equal(malformed['retry-products'].hidden,false);
  console.log('PASS: publication filtering, schema checks, hidden data, numeric prices, photos/fallback, WhatsApp, search, categories, modal, empty, setup, failure, and retry.');
})().catch(error=>{console.error(error);process.exitCode=1;});
