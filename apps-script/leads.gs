/** Separate PRIVATE inquiry store. Do not replace the working product script. */
function setupLeads() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('LEADS_SPREADSHEET_ID')) throw new Error('Already configured; use the existing spreadsheet.');
  const ss = SpreadsheetApp.create('GET-PC Private Inquiries');
  const sheet = ss.getSheets()[0];
  sheet.setName('Inquiries');
  sheet.appendRow(['Request ID','Received at','Type','Name','Phone','Email','Course / Service','Message','Consent']);
  sheet.setFrozenRows(1);
  props.setProperty('LEADS_SPREADSHEET_ID', ss.getId());
  console.log(ss.getUrl());
}
function doGet() { return leadJson_({ok:false, error:'This endpoint accepts inquiries only.'}); }
function validateLead_(p) {
  if (!p || p.website || p.consent !== 'yes' || !['training','service'].includes(p.kind)) throw new Error('Invalid inquiry');
  const limits = {requestId:36,name:100,phone:30,email:150,topic:160,message:2000};
  const result = {};
  Object.keys(limits).forEach(key => {
    const value = String(p[key] || '').trim();
    if (value.length > limits[key]) throw new Error('Field too long');
    result[key] = value;
  });
  if (!/^[a-f0-9-]{36}$/i.test(result.requestId) || !result.name || !result.topic || !/^[+\d ()-]{7,30}$/.test(result.phone) || result.phone.replace(/\D/g,'').length < 7) throw new Error('Missing or invalid fields');
  if (result.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) throw new Error('Invalid email');
  if (p.kind === 'service' && !result.message) throw new Error('Message required');
  result.kind = p.kind;
  return result;
}
function sheetText_(value) { return /^[=+\-@\t\r]/.test(value) ? "'" + value : value; }
function doPost(e) {
  let lock;
  try {
    if (!e || !e.postData || e.postData.length > 12000) throw new Error('Invalid request');
    const p = validateLead_(e.parameter);
    const id = PropertiesService.getScriptProperties().getProperty('LEADS_SPREADSHEET_ID');
    if (!id) throw new Error('Not configured');
    lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) throw new Error('Busy');
    const sheet = SpreadsheetApp.openById(id).getSheetByName('Inquiries');
    const last = sheet.getLastRow();
    if (last > 1 && sheet.getRange(2,1,last-1,1).createTextFinder(p.requestId).matchEntireCell(true).findNext()) return leadJson_({ok:true,requestId:p.requestId});
    // Basic shared quota to limit automated abuse. This is not identity verification.
    const cache = CacheService.getScriptCache();
    const bucket = 'leads-' + Math.floor(Date.now()/60000);
    const count = Number(cache.get(bucket) || 0);
    if (count >= 20) throw new Error('Busy');
    cache.put(bucket,String(count+1),120);
    sheet.appendRow([p.requestId,new Date(),p.kind,p.name,p.phone,p.email,p.topic,p.message,'yes'].map(v=>typeof v === 'string' ? sheetText_(v) : v));
    SpreadsheetApp.flush();
    return leadJson_({ok:true,requestId:p.requestId});
  } catch (_) { return leadJson_({ok:false,error:'Unable to save inquiry. Please retry or contact GET-PC.'}); }
  finally { if (lock && lock.hasLock()) lock.releaseLock(); }
}
function leadJson_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
