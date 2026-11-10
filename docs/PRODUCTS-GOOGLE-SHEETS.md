# Manage GET-PC products with Google Sheets

The Products page reads a public, read-only Apps Script feed. You edit products in the private Google Sheet. This setup does not receive orders, collect customer information, or take payment.

## Your sheet

[Open GET-PC Products](https://docs.google.com/spreadsheets/d/1CCI1JzDWon7pe_L6BJTKe1bZSoYKivlLZAs_YQ-rwnw/edit)

Keep the `Products` tab and the first nine headers unchanged:

| Column | Header | What to enter |
| --- | --- | --- |
| A | Product ID | Unique identifier, such as laptop-001 |
| B | Product name | Actual product name |
| C | Price (D) | Number only, such as 8500 |
| D | Description | Short description for the card |
| E | Category | Choose a category |
| F | Image URL | Public HTTPS direct image URL |
| G | Availability | Available or Sold out |
| H | Show on website | Yes publishes; No or blank hides |
| I | Details | Specifications, condition, and other product information |

The example row is hidden. Replace it with a real product before choosing Yes, or delete it. Add rows within/at the end of the native table so dropdowns extend. Do not rename headers or move their order. Numeric zero is valid; blank or non-numeric prices are skipped. Duplicate IDs and invalid visible rows are skipped and logged only in Apps Script.

## Activate the connection once

1. Open the sheet using the Google account that owns it.
2. Select **Extensions → Apps Script** and name the project **GET-PC Products Feed**.
3. Replace the starter code in `Code.gs` with the full contents of [`apps-script/products.gs`](../apps-script/products.gs). The spreadsheet ID is already filled in.
4. Save. Select **Deploy → New deployment → Web app**.
5. Set **Execute as: Me** and **Who has access: Anyone**. This makes only the product feed accessible without sign-in; the spreadsheet can stay private. The code reads only the first nine columns of the Products tab and returns only rows marked Yes. It has no write endpoint.
6. Click **Deploy** and complete Google's authorization in your account. Review the code and requested permissions before authorizing it. If your organisation prevents public web apps, this deployment method will need administrator support.
7. Copy the **Web app URL** ending in `/exec` and send it back in our chat. Do not use the `/dev` test URL.
8. The website's `assets/js/config.js` must have that URL in `productsFeedUrl`. Then the pending website changes need to be merged and successfully deployed through GitHub Pages.

## Verify before launch

- Open the `/exec` URL in a signed-out/private browser. It should show `{"ok":true,"products":[]}` until a real product is marked Yes.
- For one real product, enter a price and public image URL, then mark Yes. Refresh the endpoint and Products page. Check the name, price, image, and WhatsApp inquiry.
- Mark that product No and refresh: it must disappear from the feed and page.
- Mark it Yes and Sold out: it should offer an inquiry about alternatives.
- Sheet data edits do not require redeploying Apps Script. Script code edits require **Deploy → Manage deployments → Edit → New version → Deploy**.

The website shows a preparation message until configured, a retry/contact message on connection errors, and an empty catalogue message when the sheet contains no visible products. It never substitutes sample products when loading fails. Updates appear on page refresh; no automatic live polling is used.

## Adding product photos

Upload a real product image to the website repository, for example `assets/images/products/dell-laptop.jpg`, and deploy it. Then put its deployed URL, such as `https://getpc.gm/assets/images/products/dell-laptop.jpg`, in Image URL. This is an example path, not an existing photo. Other public HTTPS image hosts also work if they allow direct image embedding.

Use a link that displays the image itself without signing in, not a GitHub file-view page or Google Drive sharing page. Blank or broken images use the product-category icon as a fallback. Photos should ideally be under 500 KB to load quickly. No automatic upload feature is included.

## Technical notes

- `products-data.js` validates the JSON schema, prices, availability, IDs, and HTTPS image URLs. Product text is inserted with `textContent`.
- Browser requests use a simple GET without credentials or custom headers, follow Apps Script's ContentService redirect, and time out after 15 seconds. Verify cross-origin loading from the deployed website after activation.
- The feed is public catalogue data, not a place for customer records, supplier costs, or private information. Do not add confidential details to visible product fields.
- The supplied Apps Script uses the spreadsheet ID, which is an identifier rather than a password. Spreadsheet access remains controlled by Google permissions.

Official references: [Apps Script web apps](https://developers.google.com/apps-script/guides/web) and [Content Service](https://developers.google.com/apps-script/guides/content).
