# 🎯 4-Square Arb Bot

4-Square is a high-performance discovery engine for identifying arbitrage and high-probability opportunities on Kalshi prediction markets. It scans hundreds of thousands of markets to find events where the top outcomes are collectively mispriced, offering a mathematical edge.

## 🚀 Architecture

-   **Frontend**: Vue 3 + Tailwind CSS + Flowbite.
-   **Backend**: Cloudflare Workers + Durable Objects (DO) for persistent state and resumable fetching.
-   **Data Storage**: Workers KV for high-speed edge caching and DO SQLite storage for market accumulation.
-   **Discovery Engine**: Resumable fetch logic that bypasses API rate limits by paging through data across multiple cron executions.

## 🛠 Features

-   **Live Dashboard**: Real-time arbitrage opportunities sorted by profit.
-   **Smart Filtering**: Filter by strike count (1-4), minimum profit, days to close, and date opened.
-   **Advanced Search**: Search across market titles, tickers, and primary rules.
-   **Persistence**: "Watch" or "Hide" specific events (saved locally in your browser).
-   **Incremental Sync**: Once initialized, the bot only fetches newly created markets to stay within API limits.
-   **Tipping**: Integrated crypto tip page with dynamic QR code generation.

## 📦 Project Setup

```sh
pnpm install
```

### Development

```sh
# Start Vite for frontend development
pnpm dev

# Preview the worker locally with Wrangler
pnpm preview
```

### Deployment & Maintenance

To ensure the bot starts with a clean dataset and avoids hitting rate limits on fresh deploys:

1.  **Seed Data**: Pre-process the entire Kalshi market locally.
    ```sh
    pnpm run seed
    ```
2.  **Bump Version**: Force the remote Durable Object to wipe its old state and re-initialize from the new `seed.json`.
    ```sh
    pnpm run bump
    ```
3.  **Deploy**:
    ```sh
    pnpm run deploy
    ```

## 📜 Maintenance Scripts

-   `pnpm run seed`: Local crawler that generates `seed.json` (filtered for cost <= 90).
-   `pnpm run bump`: Increments `SCHEMA_VERSION` in `market-manager.ts` to trigger a remote state reset.
-   `pnpm run cf-typegen`: Generates TypeScript types for Cloudflare bindings.

## 🌍 Environment Variables

Create a `.env` file with your tip wallet addresses:

```env
VITE_BTC_WALLET=your_btc_address
VITE_USDC_WALLET=your_usdc_address
VITE_SOL_WALLET=your_sol_address
VITE_LTC_WALLET=your_ltc_address
```