# GET-PC website upgrade

## Ready in this change
- Home: Shop Products / Request a Service / Join Training, product previews from the existing feed, selected products first when optional Featured data is available.
- Training: expanded course outlines, FAQs, two registration routes, selected course carried into quick inquiry.
- Contact: service-prefilled inquiry form, WhatsApp fallback, consent, privacy information, clear confirmation only after a successful server response.
- Products: price/name sorting, direct `products.html?product=PRODUCT-ID` links, copy link, zoom, gallery thumbnails, optional condition. Existing photo rotation remains.
- About/staff: links to existing GET-PC projects; no invented testimonials or client work.
- SEO: canonical/social metadata, sitemap and robots file.

## Enable private inquiry storage
This needs deployment by the Google account owner. Until configured, the form clearly directs customers to WhatsApp; it never claims a submission was saved.

1. Create a NEW Apps Script project at https://script.google.com/home. Do not replace the existing product project.
2. Paste `apps-script/leads.gs`, save, run `setupLeads` once and authorise it.
3. Open the spreadsheet URL printed in the execution log. Keep it private. The script property `LEADS_SPREADSHEET_ID` points to this new spreadsheet.
4. Deploy a Web app, execute as Me, access Anyone. The public app only accepts submissions; it provides no read API for personal information.
5. Copy its `/exec` URL into `leadsFeedUrl` in `assets/js/config.js`.
6. Test an inquiry from the deployed website: verify the success reference, matching row, and retry behaviour. Browser CORS and deployment permissions require this real check.
7. Do not publish or share the inquiry spreadsheet publicly. Only authorise staff who need it. Review/delete records when no longer required.

The endpoint validates input, limits lengths, uses a honeypot and a shared 20-per-minute quota, and escapes spreadsheet formulas. These are basic abuse limits, not authentication or robust bot prevention. Retries of the same payload use the same UUID; under a script lock, an existing request is acknowledged without appending a duplicate. The form retains data on network/confirmation failure.

## Add more product photos and condition
Existing nine columns stay unchanged. Add optional columns to the RIGHT with these exact headers:

| Header | Value |
| --- | --- |
| Additional images | Up to seven HTTPS photo links, separated by commas or line breaks |
| Condition | New, Used, or Refurbished |
| Featured | Yes to prioritise an available product on the homepage |

Update the EXISTING product Apps Script with `apps-script/products.gs`, then Manage deployments → Edit → New version → Deploy. Keep the same deployment URL. Without redeployment, existing photos/products still work; extra fields will not appear. Main Image URL remains the cover photo. Details supports line breaks for specifications. Product IDs must be unique and stable because shared links use them.

## Content to provide
- Confirm current course fees, duration, start dates, class times, prerequisites and equipment arrangements. Do not publish an old intake as current.
- Confirm opening hours, the displayed call number, delivery area/charges and warranty terms.
- Supply approved workplace/team photos, client project screenshots and testimonials with permission. No fictional examples were added.

## Verification
Run `node tests/products.cjs`, `node tests/leads.cjs` and `node --check` on changed JS files. Before publishing, test mobile navigation, selected course/service, form validation, real server success/failure/retry, gallery, zoom, sorting, sharing and WhatsApp.

## Optional analytics
No analytics script is loaded by default. If you choose Plausible, add getpc.gm in your own account and copy the site-specific script URL from Site settings → Site installation into `analyticsScriptUrl`. Confirm the site’s installation test before claiming data is collected. An account/subscription may be required; none was created by this upgrade. No inquiry names, emails, phone numbers or messages are sent as custom events. Provider reference: https://plausible.io/docs/plausible-script and https://plausible.io/docs/script-update-guide.

## Checks completed for this change
Desktop browser preview: homepage, selected course and service, required-field validation, real product feed, price sorting, detail dialog, zoom, and direct product URL. Product-copy clipboard confirmation was not verified in this browser; a direct link is also provided. Gallery parsing and additional fields were tested with fixtures; the live feed has not been redeployed with extra columns. Mobile layout, live inquiry submission and analytics activation still need verification.
