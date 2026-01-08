import { DurableObject } from "cloudflare:workers";
import { Configuration, MarketApi, Market } from "kalshi-typescript";
import initialData from "../seed.json";

export interface Env {
	MARKET_MANAGER: DurableObjectNamespace<MarketManager>;
	MARKET_CACHE: KVNamespace;
}

export class MarketManager extends DurableObject<Env> {
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
	}

	async fetchMarkets(): Promise<string> {
		console.log("📊 MarketManager waking up...");
		const config = new Configuration({
			basePath: "https://api.elections.kalshi.com/trade-api/v2",
		});
		const marketsApi = new MarketApi(config);

		const SCHEMA_VERSION = 6; // Bump this via 'pnpm run bump' to force a re-seed

		// Load State
		console.log("📂 Loading state from storage...");
		let storedVersion = await this.ctx.storage.get<number>("schema_version") || 0;
		let initComplete = await this.ctx.storage.get<boolean>("init_complete") || false;

		// Force Re-Init if version mismatch
		if (storedVersion !== SCHEMA_VERSION) {
			console.log(`♻️ Schema Update (v${storedVersion} -> v${SCHEMA_VERSION}). Wiping storage...`);
			await this.ctx.storage.deleteAll();
			initComplete = false;
			// Re-save the new version immediately
			await this.ctx.storage.put("schema_version", SCHEMA_VERSION);
		}

		let ignoredEvents = new Set(await this.ctx.storage.get<string[]>("ignored_events") || []);
		let lastScanTs = await this.ctx.storage.get<number>("last_scan_ts");

		// Load Active Events Map
		let activeEvents = new Map<string, Market[]>();
		const chunkCount = await this.ctx.storage.get<number>("active_chunks_count") || 0;
		for (let i = 0; i < chunkCount; i++) {
			const chunk = await this.ctx.storage.get<Array<[string, Market[]]>>(`active_chunk_${i}`);
			if (chunk) {
				chunk.forEach(([k, v]) => activeEvents.set(k, v));
			}
		}

		// --- PHASE 0: SEED DATA ---
		if (!initComplete) {
			console.log("🌱 [SEED MODE] Initializing from local seed data...");
			// Clear any old state just in case
			await this.ctx.storage.deleteAll();
			activeEvents.clear();
			ignoredEvents.clear();

			// Populate from seed
			(initialData as Array<[string, Market[]]>).forEach(([ticker, markets]) => {
				activeEvents.set(ticker, markets);
			});

			initComplete = true;
			lastScanTs = Math.floor(Date.now() / 1000) - 60; // 1 minute ago
			console.log(`✅ Seeded ${activeEvents.size} events.`);
		}

		console.log(`📦 Active events: ${activeEvents.size}, Ignored: ${ignoredEvents.size}`);

		const BATCH_LIMIT = 10;
		let requestsMade = 0;

		try {
			// --- PHASE 1: MAINTENANCE (Incremental Fetch) ---
			console.log(`🛡️ [MAINTENANCE MODE] Checking for updates since ${new Date((lastScanTs || 0) * 1000).toISOString()}`);
			
			// 1. Expunge Old
			const now = Date.now() / 1000;
			let removedCount = 0;
			for (const [ticker, markets] of activeEvents) {
				const allClosed = markets.every(m => new Date(m.close_time).getTime() / 1000 < now);
				if (allClosed) {
					activeEvents.delete(ticker);
					removedCount++;
				}
			}
			if (removedCount > 0) console.log(`🧹 Expunged ${removedCount} closed events.`);

			// 2. Fetch New Markets (timestamped)
			let cursor: string | undefined = undefined;
			while (requestsMade < BATCH_LIMIT) {
				console.log(`📡 Fetching new markets (Page ${requestsMade + 1}, Cursor: ${cursor || 'Start'})...`);
				const response = await marketsApi.getMarkets(
					1000,
					cursor,
					undefined, // eventTicker
					undefined, // seriesTicker
					lastScanTs || undefined, // minCreatedTs (pos 5)
					undefined, // maxCreatedTs (pos 6)
					undefined, // maxCloseTs (pos 7)
					undefined, // minCloseTs (pos 8)
					undefined, // minSettledTs (pos 9)
					undefined, // maxSettledTs (pos 10)
					"open"     // status (pos 11)
				);
				requestsMade++;
				
				const markets = response.data.markets || [];
				console.log(`   ↳ Received ${markets.length} markets.`);
				
				if (markets.length > 0) {
					this.processBatch(markets, activeEvents, ignoredEvents);
				}

				cursor = response.data.cursor;
				if (!cursor || markets.length === 0) break;
			}

			lastScanTs = Math.floor(Date.now() / 1000);

			// --- SAVE STATE ---
			await this.saveState(initComplete, lastScanTs, activeEvents, ignoredEvents);

			// --- UPDATE KV ---
			const results = this.generateResults(activeEvents);
			console.log(`📤 Updating KV Cache with ${results.length} valid opportunities.`);
			await this.env.MARKET_CACHE.put("latest_matches", JSON.stringify(results));
			await this.ctx.storage.put("last_update", Date.now());

			return JSON.stringify({ status: "ok", mode: "maintenance", items: results.length });

		} catch (error: any) {
			if (error.status === 429 || (error.response && error.response.status === 429)) {
				console.warn("⚠️ Rate limit (429) hit! Saving progress.");
				await this.saveState(initComplete, lastScanTs || 0, activeEvents, ignoredEvents);
				return JSON.stringify({ status: "rate_limited", saved: true });
			}
			console.error("❌ Error fetching updates:", error);
			throw error;
		}
	}

	async saveState(initComplete: boolean, lastScanTs: number, activeEvents: Map<string, Market[]>, ignoredEvents: Set<string>) {
		console.log("💾 Saving state to storage...");
		await this.ctx.storage.put("init_complete", initComplete);
		await this.ctx.storage.put("last_scan_ts", lastScanTs);
		
		const activeArr = Array.from(activeEvents.entries());
		const CHUNK_SIZE = 10;
		let chunkIdx = 0;
		for (let i = 0; i < activeArr.length; i+=CHUNK_SIZE) {
			await this.ctx.storage.put(`active_chunk_${chunkIdx}`, activeArr.slice(i, i+CHUNK_SIZE));
			chunkIdx++;
		}
		await this.ctx.storage.put("active_chunks_count", chunkIdx);
		await this.ctx.storage.put("ignored_events", Array.from(ignoredEvents));
		console.log(`   ↳ Saved ${activeArr.length} active events in ${chunkIdx} chunks.`);
	}

	processBatch(markets: Market[], activeEvents: Map<string, Market[]>, ignoredEvents: Set<string>) {
		// Group this batch by event
		const batchGroups = new Map<string, Market[]>();
		markets.forEach(m => {
			if (!m.event_ticker) return;
			if (!batchGroups.has(m.event_ticker)) batchGroups.set(m.event_ticker, []);
			batchGroups.get(m.event_ticker)!.push(m);
		});

		// Merge into Active or Check Ignore
		for (const [ticker, batchMarkets] of batchGroups) {
			if (ignoredEvents.has(ticker)) continue;

			const existing = activeEvents.get(ticker) || [];
			// We strictly want to capture ALL markets for an event to count them.
			// Since we might see them across pages, we merge.
			
			// Deduplicate based on ticker
			const merged = [...existing];
			batchMarkets.forEach(bm => {
				if (!merged.find(em => em.ticker === bm.ticker)) {
					merged.push(bm);
				} else {
					// Update existing market data (price update!)
					const idx = merged.findIndex(em => em.ticker === bm.ticker);
					merged[idx] = bm;
				}
			});

			if (merged.length > 4) {
				// Too many options! Ignore this event forever.
				activeEvents.delete(ticker);
				ignoredEvents.add(ticker);
			} else {
				// Valid so far, keep it.
				activeEvents.set(ticker, merged);
			}
		}
	}

	generateResults(activeEvents: Map<string, Market[]>) {
		const results: any[] = [];
		for (const [ticker, markets] of activeEvents) {
			// Double check count (should be 2-4)
			if (markets.length > 4 || markets.length < 2) continue;

			// Filter out illiquid markets (0 bids)
			const validMarkets = markets.filter(m => m.yes_bid > 0 && m.no_bid > 0);
			if (validMarkets.length < 1) continue;

			// Sort
			const sorted = [...validMarkets].sort((a, b) => (b.yes_ask || 0) - (a.yes_ask || 0));
			const top2 = sorted.slice(0, 2);
			const cost = (top2[0]?.yes_ask || 0) + (top2[1]?.yes_ask || 0);

			results.push({
				eventTicker: ticker,
				title: markets[0].title,
				subtitle: markets[0].subtitle,
				marketCount: validMarkets.length,
				markets: sorted.map(m => ({
					ticker: m.ticker,
					title: m.title,
					yes_ask: m.yes_ask,
					no_ask: m.no_ask,
					close_time: m.close_time,
					open_time: m.open_time,
					rules_primary: m.rules_primary
				}))
			});
		}
		return results.sort((a, b) => {
			const profitA = 100 - ((a.markets[0]?.yes_ask || 0) + (a.markets[1]?.yes_ask || 0));
			const profitB = 100 - ((b.markets[0]?.yes_ask || 0) + (b.markets[1]?.yes_ask || 0));
			return profitB - profitA;
		});
	}
}
