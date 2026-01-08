import { MarketManager, Env } from "./market-manager";

export { MarketManager };

export default {
	async fetch(request, env) {
		const url = new URL(request.url);

		if (url.pathname === "/api/data") {
			// Try to get from KV first for speed
			const cached = await env.MARKET_CACHE.get("latest_matches");
			if (cached) {
				return new Response(cached, {
					headers: {
						"Content-Type": "application/json",
						"Access-Control-Allow-Origin": "*",
					},
				});
			}

			// If KV is empty, DO NOT trigger a fetch (it causes subrequest limits).
			// Just return an empty list or a status indicating data is initializing.
			return new Response(JSON.stringify([]), {
				headers: {
					"Content-Type": "application/json",
					"Access-Control-Allow-Origin": "*",
					"X-Status": "Initializing"
				},
			});
		}

		return new Response(null, { status: 404 });
	},

	async scheduled(event, env, ctx) {
		const id = env.MARKET_MANAGER.idFromName("global");
		const obj = env.MARKET_MANAGER.get(id);

		ctx.waitUntil(obj.fetchMarkets());
	},
} satisfies ExportedHandler<Env>;
