# Nexus Marketplace

A local marketplace demo with three workspaces: buyer, seller, and administrator. Shoppers browse a catalog, spend demo store credit, and review orders. Sellers manage listings and sales. Administrators approve sellers, edit accounts, and review activity. An assistant in the corner can search the catalog and carry out those tasks in plain language.

Accounts, products, carts, and orders are stored in the browser. Nothing is charged to a real card.

## Demo accounts

| Role | Username | Password |
| --- | --- | --- |
| Buyer | `alex_buyer` | `password123` |
| Seller | `alpha_seller` | `password123` |
| Seller | `nordic_living` | `password123` |
| Buyer | `jane_shopper` | `password123` |
| Admin | `admin` | `admin123` |

Passwords are stored in plain text in `localStorage` so the demo can reset and inspect accounts. Do not reuse these credentials anywhere else.

## Run locally

Requirements: Node.js 20 or newer.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The assistant runs marketplace tasks from plain language. Put a [Gemini API key](https://aistudio.google.com/apikey) in `.env.local` as `GEMINI_API_KEY`, then restart the server. With that one key it can answer questions and carry out the signed-in role's tasks: search, cart, checkout, listings, sales, and admin account changes. Without a key, the same marketplace commands still run from the local matcher. Do not commit `.env.local`.

`TAVILY_API_KEY` is optional and adds web search. `QWEN_API_KEY` is an optional fallback used only when Gemini is not set.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the API and the Vite app together |
| `npm run lint` | Type-checks the project |
| `npm run build` | Builds the client and bundles the server into `dist/` |
| `npm start` | Serves the production build |
| `npm run clean` | Deletes `dist/` |

## Notes

- New seller registrations stay pending until an administrator approves them.
- Checkout and saved cards are simulated. The app keeps only the last four digits of a demo card and does not ask for a security code.
- Changing the seed version replaces the sample catalog, orders, and accounts already saved in that browser.

## License

This project is free to view, run, and modify for noncommercial use. Selling it, or charging for a product that includes it, is not allowed. See [LICENSE](LICENSE). Demo account details are in [DEMO-ACCOUNTS.txt](DEMO-ACCOUNTS.txt).
