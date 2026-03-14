const LOCKOUT_TIME = new Date("2026-03-15T19:00:00-04:00").getTime();
const CORS_ORIGIN = "*"; // Tighten to your GitHub Pages URL in production

function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": CORS_ORIGIN,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Admin",
        "Content-Type": "application/json"
    };
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: corsHeaders()
    });
}

async function readJson(bucket, key) {
    const obj = await bucket.get(key);
    if (!obj) return {};
    return obj.json();
}

async function writeJson(bucket, key, data) {
    await bucket.put(key, JSON.stringify(data), {
        httpMetadata: { contentType: "application/json" }
    });
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname;

        // Handle CORS preflight
        if (request.method === "OPTIONS") {
            return new Response(null, { status: 204, headers: corsHeaders() });
        }

        try {
            // GET /votes — return all votes
            if (path === "/votes" && request.method === "GET") {
                const votes = await readJson(env.OSCAR_BUCKET, "votes.json");
                return jsonResponse(votes);
            }

            // POST /vote — submit or update a person's picks
            if (path === "/vote" && request.method === "POST") {
                if (Date.now() >= LOCKOUT_TIME) {
                    return jsonResponse({ error: "Picks are locked" }, 403);
                }

                const body = await request.json();
                const { name, picks } = body;

                if (!name || typeof name !== "string" || !name.trim()) {
                    return jsonResponse({ error: "Name is required" }, 400);
                }

                if (!picks || typeof picks !== "object") {
                    return jsonResponse({ error: "Picks are required" }, 400);
                }

                const votes = await readJson(env.OSCAR_BUCKET, "votes.json");
                const key = name.trim();
                votes[key] = { ...votes[key], ...picks };
                await writeJson(env.OSCAR_BUCKET, "votes.json", votes);

                return jsonResponse({ ok: true });
            }

            // GET /winners — return announced winners
            if (path === "/winners" && request.method === "GET") {
                const winners = await readJson(env.OSCAR_BUCKET, "winners.json");
                return jsonResponse(winners);
            }

            // POST /winner — set a category winner (admin only)
            if (path === "/winner" && request.method === "POST") {
                const adminSecret = request.headers.get("X-Admin");
                if (!adminSecret || adminSecret !== env.ADMIN_SECRET) {
                    return jsonResponse({ error: "Unauthorized" }, 401);
                }

                const body = await request.json();
                const { category, winner } = body;

                if (!category || !winner) {
                    return jsonResponse({ error: "category and winner are required" }, 400);
                }

                const winners = await readJson(env.OSCAR_BUCKET, "winners.json");
                winners[category] = winner;
                await writeJson(env.OSCAR_BUCKET, "winners.json", winners);

                return jsonResponse({ ok: true, category, winner });
            }

            return jsonResponse({ error: "Not found" }, 404);

        } catch (e) {
            return jsonResponse({ error: e.message }, 500);
        }
    }
};
