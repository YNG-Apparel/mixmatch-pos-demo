# Mix & Match POS Demo

This is a standalone static demo of the Mix & Match boutique POS. It lives in `demo/` and does not use the existing staff app or its Supabase configuration.

## Included

- An overview dashboard, fictional product and inventory catalog, simulated checkout, and sales history.
- English interface and fictional English-language clothing products, brands, customers, and sample sales using IDR.
- Product editing, stock adjustments, cart changes, and simulated sales saved to `localStorage` in the visitor's browser profile for this site.
- A reset button that restores the sample products and sales.
- A Content Security Policy that blocks browser API connections, plus Netlify response headers.

The demo has no build step or package dependencies. Its seed data and behavior are in `app.js`. State is stored under the `mixmatch-pos-demo-v2` key. If you change the seed data after visitors have opened the demo, increment the key and state version so existing browser data does not replace the new sample data. Visitors can clear their browser data at any time. Data is scoped to the deployed site and browser profile.

## Run locally

From the project root, start a static file server:

```powershell
py -m http.server 8000 --directory demo
```

Open [http://localhost:8000](http://localhost:8000). If `py` is unavailable, use `python -m http.server 8000 --directory demo`. Stop the server with `Ctrl+C`.

Opening `index.html` directly as a `file://` URL is not recommended because browsers may restrict local storage for file URLs.

## Publish as a separate public site on Netlify

1. Sign in to the Netlify team where you want the demo site.
2. Open [Netlify Drop](https://app.netlify.com/drop) and upload **the `demo/` folder only**. This creates a separate static site and leaves the existing app deployment settings alone. The repository root redirects visitors to staff login; uploading only `demo/` keeps that root configuration out of the demo deploy.
3. If the new site is private, open **Project configuration → General → Visitor access → Project visibility** and make the production site public. Some Netlify teams default new sites to private, so check this before sharing the URL.
4. Share the production URL. To publish later changes, upload the updated `demo/` folder to that site's deploy page.

For other static hosts, publish the contents of `demo/` as the site root. Do not publish the repository root as the standalone demo.

## Data and payment boundary

All products, brands, customers, receipts, and sales are fictional. The demo has no Supabase client, credentials, API calls, remote fonts, analytics, or payment SDK. Checkout creates a fictional receipt in local browser storage and reduces stock in that same browser profile. The payment selector stores a label only; it does not collect payment details or send a transaction.
