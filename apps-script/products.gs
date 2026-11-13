/** GET-PC public, read-only product feed. Deploy as a web app: Me / Anyone. */
const PRODUCTS_SPREADSHEET_ID = '1CCI1JzDWon7pe_L6BJTKe1bZSoYKivlLZAs_YQ-rwnw';
const PRODUCT_HEADERS = ['Product ID', 'Product name', 'Price (D)', 'Description', 'Category', 'Image URL', 'Availability', 'Show on website', 'Details'];

function doGet() {
  try {
    const sheet = SpreadsheetApp.openById(PRODUCTS_SPREADSHEET_ID).getSheetByName('Products');
    if (!sheet) throw new Error('Products tab missing');
    const lastRow = sheet.getLastRow();
    if (lastRow < 1) throw new Error('Product headers missing');
    const values = sheet.getRange(1, 1, lastRow, Math.max(PRODUCT_HEADERS.length, sheet.getLastColumn())).getValues();
    return productJson_({ok: true, products: productRows_(values)});
  } catch (error) {
    console.error(error.message);
    return productJson_({ok: false, error: 'Product catalogue temporarily unavailable.'});
  }
}

function productRows_(values) {
  if (!values.length || PRODUCT_HEADERS.some((header, index) => String(values[0][index]).trim() !== header)) throw new Error('Product headers do not match the template');
  const seen = new Set();
  const output = [];
  values.slice(1).forEach((row, index) => {
    // Publication is opt-in. Blank, No, and other values never leave the sheet.
    if (String(row[7]).trim().toLowerCase() !== 'yes') return;
    const id = String(row[0] || '').trim();
    const name = String(row[1] || '').trim();
    const price = row[2];
    const availability = String(row[6] || '').trim();
    if (!id || !name || typeof price !== 'number' || !Number.isFinite(price) || price < 0 || !['Available', 'Sold out'].includes(availability) || seen.has(id)) {
      console.warn('Skipped invalid or duplicate product at row ' + (index + 2));
      return;
    }
    seen.add(id);
    const image = String(row[5] || '').trim();
    const optional = header => {
      const column = values[0].findIndex(cell => String(cell).trim() === header);
      return column < 0 ? '' : String(row[column] || '').trim();
    };
    const imageUrls = optional('Additional images').split(/[\n,]+/).map(url=>url.trim()).filter(url=>/^https:\/\//i.test(url)).slice(0,7);
    const condition = optional('Condition');
    const featured = optional('Featured').toLowerCase() === 'yes';
    // Explicit whitelist: no internal columns or other tabs are returned.
    output.push({id, name, price, imageUrls, condition, featured, description: String(row[3] || ''), category: String(row[4] || 'Other').trim(), imageUrl: /^https:\/\//i.test(image) ? image : '', availability, details: String(row[8] || '')});
  });
  return output;
}

function productJson_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
