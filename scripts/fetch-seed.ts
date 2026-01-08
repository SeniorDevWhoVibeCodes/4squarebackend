import { Configuration, MarketApi, Market } from "kalshi-typescript";
import * as fs from "node:fs";
import * as path from "node:path";

async function main() {
    console.log("🌱 Fetching seed data...");
    
    const config = new Configuration({
        basePath: "https://api.elections.kalshi.com/trade-api/v2",
    });
    const marketsApi = new MarketApi(config);

    const allMarkets: Market[] = [];
    let cursor: string | undefined = undefined;
    let page = 0;

    while (true) {
        console.log(`Fetching page ${page + 1}...`);
        try {
            const response = await marketsApi.getMarkets(
                1000,
                cursor,
                undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
                "open"
            );
            
            const markets = response.data.markets || [];
            allMarkets.push(...markets);
            
            cursor = response.data.cursor;
            if (!cursor) break;
            
            page++;
            // Sleep slightly to be nice
            await new Promise(r => setTimeout(r, 200));
        } catch (e: any) {
            console.error("Error fetching:", e.message);
            if (e.response?.status === 429) {
                console.log("Rate limit hit, waiting 5s...");
                await new Promise(r => setTimeout(r, 5000));
                continue;
            }
            break;
        }
    }

    console.log(`✅ Fetched ${allMarkets.length} raw markets.`);

    // Process and Filter
    const eventGroups = new Map<string, Market[]>();
    allMarkets.forEach(m => {
        if (!m.event_ticker) return;
        if (!eventGroups.has(m.event_ticker)) eventGroups.set(m.event_ticker, []);
        eventGroups.get(m.event_ticker)!.push(m);
    });

    const activeEvents: any[] = [];
    
    for (const [ticker, markets] of eventGroups.entries()) {
        if (markets.length > 4 || markets.length < 2) continue;

        // Sort by yes_ask to find Top 2 cost
        // Filter: Keep if cost <= 100 (Profit >= 0)
        // Adjust threshold as needed. You mentioned ~80 items.
        // Also filter out markets with 0 bids (dead markets)
        const validMarkets = markets.filter(m => m.yes_bid > 0 && m.no_bid > 0);
        if (validMarkets.length < 1) continue;

        const options = validMarkets.filter(m => (m.yes_ask || 0) > 0);
        if (options.length < 1) continue;

        const sorted = [...options].sort((a, b) => (b.yes_ask || 0) - (a.yes_ask || 0));
        // Use top 2 or top 1 if only one option exists
        const top2 = sorted.slice(0, 2);
        const cost = top2.reduce((sum, m) => sum + (m.yes_ask || 0), 0);

        // Filter: Go even stricter to reach the ~80 item target and 10MB bundle limit
        if (cost > 80) continue;
        
        // Minimize fields
        const minimalMarkets = markets.map(m => ({
            ticker: m.ticker,
            event_ticker: m.event_ticker,
            title: m.title,
            subtitle: m.subtitle,
            yes_ask: m.yes_ask,
            no_ask: m.no_ask,
            yes_bid: m.yes_bid, // Critical for worker filtering
            no_bid: m.no_bid,   // Critical for worker filtering
            close_time: m.close_time,
            open_time: m.open_time,
            rules_primary: m.rules_primary
        }));

        activeEvents.push([ticker, minimalMarkets]);
    }

    console.log(`🎯 Processed ${activeEvents.length} valid active events.`);

    const outputPath = path.join(process.cwd(), "seed.json");
    fs.writeFileSync(outputPath, JSON.stringify(activeEvents));
    console.log(`💾 Saved to ${outputPath}`);
}

main().catch(console.error);
