const LOCKOUT_TIME = new Date("2026-03-15T19:15:00-04:00").getTime();
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

function normalizeKey(name) {
    return name.trim().toLowerCase().replace(/[\u{0080}-\u{FFFF}]/gu, '').replace(/\s+/g, ' ').trim();
}

async function writeJson(bucket, key, data) {
    await bucket.put(key, JSON.stringify(data), {
        httpMetadata: { contentType: "application/json" }
    });
}

// Wikipedia category heading text → our NOMINEES key
const WIKI_TO_KEY = {
    "Best Picture": "best_picture",
    "Best Directing": "best_director",
    "Best Actor in a Leading Role": "best_actor",
    "Best Actress in a Leading Role": "best_actress",
    "Best Actor in a Supporting Role": "best_supporting_actor",
    "Best Actress in a Supporting Role": "best_supporting_actress",
    "Best Writing (Original Screenplay)": "best_original_screenplay",
    "Best Writing (Adapted Screenplay)": "best_adapted_screenplay",
    "Best Animated Feature Film": "best_animated_feature",
    "Best International Feature Film": "best_international_feature",
    "Best Documentary Feature Film": "best_documentary_feature",
    "Best Documentary Short Film": "best_documentary_short",
    "Best Live Action Short Film": "best_live_action_short",
    "Best Animated Short Film": "best_animated_short",
    "Best Music (Original Score)": "best_original_score",
    "Best Music (Original Song)": "best_original_song",
    "Best Sound": "best_sound",
    "Best Casting": "best_casting",
    "Best Production Design": "best_production_design",
    "Best Cinematography": "best_cinematography",
    "Best Makeup and Hairstyling": "best_makeup_hairstyling",
    "Best Costume Design": "best_costume_design",
    "Best Film Editing": "best_film_editing",
    "Best Visual Effects": "best_visual_effects",
};

// Slim nominee data for fuzzy matching (mirrors nominees.js)
const NOMINEE_DATA = {
    best_picture: ["Bugonia","F1","Frankenstein","Hamnet","Marty Supreme","One Battle After Another","The Secret Agent","Sentimental Value","Sinners","Train Dreams"],
    best_director: ["Chloé Zhao — Hamnet","Josh Safdie — Marty Supreme","Paul Thomas Anderson — One Battle After Another","Joachim Trier — Sentimental Value","Ryan Coogler — Sinners"],
    best_actor: ["Timothée Chalamet — Marty Supreme","Leonardo DiCaprio — One Battle After Another","Ethan Hawke — Blue Moon","Michael B. Jordan — Sinners","Wagner Moura — The Secret Agent"],
    best_actress: ["Jessie Buckley — Hamnet","Rose Byrne — If I Had Legs I'd Kick You","Kate Hudson — Song Sung Blue","Renate Reinsve — Sentimental Value","Emma Stone — Bugonia"],
    best_supporting_actor: ["Benicio Del Toro — One Battle After Another","Jacob Elordi — Frankenstein","Delroy Lindo — Sinners","Sean Penn — One Battle After Another","Stellan Skarsgård — Sentimental Value"],
    best_supporting_actress: ["Elle Fanning — Sentimental Value","Inga Ibsdotter Lilleaas — Sentimental Value","Amy Madigan — Weapons","Wunmi Mosaku — Sinners","Teyana Taylor — One Battle After Another"],
    best_original_screenplay: ["Blue Moon — Robert Kaplow","It Was Just an Accident — Jafar Panahi","Marty Supreme — Ronald Bronstein & Josh Safdie","Sentimental Value — Eskil Vogt, Joachim Trier","Sinners — Ryan Coogler"],
    best_adapted_screenplay: ["Bugonia — Will Tracy","Frankenstein — Guillermo del Toro","Hamnet — Chloé Zhao & Maggie O'Farrell","One Battle After Another — Paul Thomas Anderson","Train Dreams — Clint Bentley & Greg Kwedar"],
    best_animated_feature: ["Arco","Elio","Kpop Demon Hunters","Little Amélie or the Character of Rain","Zootopia 2"],
    best_international_feature: ["The Secret Agent — Brazil","It Was Just an Accident — France","Sentimental Value — Norway","Sirāt — Spain","The Voice of Hind Rajab — Tunisia"],
    best_documentary_feature: ["The Alabama Solution","Come See Me in the Good Light","Cutting Through Rocks","Mr. Nobody Against Putin","The Perfect Neighbor"],
    best_documentary_short: ["All the Empty Rooms","Armed Only With a Camera: The Life and Death of Brent Renaud","Children No More: \"Were and Are Gone\"","The Devil Is Busy","Perfectly a Strangeness"],
    best_live_action_short: ["Butcher's Stain","A Friend of Dorothy","Jane Austen's Period Drama","The Singers","Two People Exchanging Saliva"],
    best_animated_short: ["Butterfly","Forevergreen","The Girl Who Cried Pearls","Retirement Plan","The Three Sisters"],
    best_original_score: ["Bugonia — Jerskin Fendrix","Frankenstein — Alexandre Desplat","Hamnet — Max Richter","One Battle After Another — Jonny Greenwood","Sinners — Ludwig Göransson"],
    best_original_song: ["\"Dear Me\" — Diane Warren: Relentless","\"Golden\" — Kpop Demon Hunters","\"I Lied To You\" — Sinners","\"Sweet Dreams Of Joy\" — Viva Verdi!","\"Train Dreams\" — Train Dreams"],
    best_cinematography: ["Frankenstein — Dan Laustsen","Marty Supreme — Darius Khondji","One Battle After Another — Michael Bauman","Sinners — Autumn Durald Arkapaw","Train Dreams — Adolpho Veloso"],
    best_film_editing: ["F1 — Stephen Mirrione","Marty Supreme — Ronald Bronstein and Josh Safdie","One Battle After Another — Andy Jurgensen","Sentimental Value — Olivier Bugge Coutté","Sinners — Michael P. Shawver"],
    best_production_design: ["Frankenstein — Tamara Deverell; Shane Vieau","Hamnet — Fiona Crombie; Alice Felton","Marty Supreme — Jack Fisk; Adam Willis","One Battle After Another — Florencia Martin; Anthony Carlino","Sinners — Hannah Beachler; Monique Champagne"],
    best_costume_design: ["Avatar: Fire and Ash — Deborah L. Scott","Frankenstein — Kate Hawley","Hamnet — Malgosia Turzanska","Marty Supreme — Miyako Bellizzi","Sinners — Ruth E. Carter"],
    best_makeup_hairstyling: ["Frankenstein — Mike Hill, Jordan Samuel, Cliona Furey","Kokuho — Kyoko Toyokawa, Naomi Hibino, Tadashi Nishimatsu","Sinners — Ken Diaz, Mike Fontaine, Shunika Terry","The Smashing Machine — Kazu Hiro, Glen Griffin, Bjoern Rehbein","The Ugly Stepsister — Thomas Foldberg, Anne Cathrine Sauerberg"],
    best_sound: ["F1","Frankenstein","One Battle After Another","Sinners","Sirāt"],
    best_visual_effects: ["Avatar: Fire and Ash","F1","Jurassic World Rebirth","The Lost Bus","Sinners"],
    best_casting: ["Hamnet — Nina Gold","Marty Supreme — Jennifer Venditti","One Battle After Another — Cassandra Kulukundis","The Secret Agent — Gabriel Domingues","Sinners — Francine Maisler"],
};

function stripWikiMarkup(text) {
    return text
        .replace(/'{2,}/g, '')                    // remove bold/italic markers
        .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, '$2') // [[Target|Display]] → Display
        .replace(/\[\[([^\]]*)\]\]/g, '$1')        // [[Target]] → Target
        .replace(/<[^>]+>/g, '')                   // strip HTML tags
        .replace(/\{\{[^}]*\}\}/g, '')             // strip templates
        .trim();
}

function extractWinnerFromSection(lines) {
    for (const line of lines) {
        if (!line.startsWith('*')) continue;
        // Winner is bolded: '''...''' (may also have italic '' for film titles)
        // Check for triple-quote bold markers
        if (/'{3}/.test(line)) {
            return stripWikiMarkup(line.replace(/^\*\s*/, ''));
        }
    }
    return null;
}

function norm(s) {
    return s.toLowerCase()
        .replace(/[\u{0080}-\u{FFFF}]/gu, c => {
            // Keep common accented chars for matching but normalize
            const map = {'é':'e','è':'e','ê':'e','ë':'e','à':'a','â':'a','ä':'a',
                         'ö':'o','ô':'o','ü':'u','û':'u','ù':'u','ç':'c','ñ':'n',
                         'í':'i','î':'i','ï':'i','ó':'o','ú':'u','å':'a','ø':'o',
                         'ā':'a'};
            return map[c] || c;
        })
        .replace(/[^a-z0-9 ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function fuzzyMatch(winnerText, nominees) {
    const w = norm(winnerText);

    // Extract parts split on dash: "Person – Film as Role" or "Film – Person"
    const parts = winnerText.split(/\s+[–—-]\s+/);
    const wParts = parts.map(p => norm(p.replace(/\s+as\s+.*$/i, '').replace(/\s+from\s+.*$/i, '')));
    // First part is typically the person name (or film for Best Picture-like categories)
    const wFirst = wParts[0] || '';

    let bestMatch = null;
    let bestScore = 0;

    for (const nominee of nominees) {
        const n = norm(nominee);
        const nParts = nominee.split(/\s*[—]\s*/).map(p => norm(p));
        const nFirst = nParts[0] || '';

        let score = 0;

        if (w === n) { score = 100; }

        // Prioritize first-part-to-first-part match (person→person or film→film)
        if (wFirst && nFirst) {
            if (wFirst === nFirst) { score = Math.max(score, 95); }
            if (wFirst.includes(nFirst) || nFirst.includes(wFirst)) {
                score = Math.max(score, 85);
            }
        }

        // Cross-match all parts
        for (const wp of wParts) {
            if (!wp) continue;
            for (const np of nParts) {
                if (!np) continue;
                if (wp === np) { score = Math.max(score, 90); }
                if (wp.includes(np) || np.includes(wp)) {
                    score = Math.max(score, 80);
                }
                const wpWords = wp.split(' ').filter(x => x.length > 2);
                const npWords = np.split(' ').filter(x => x.length > 2);
                const shared = wpWords.filter(x => npWords.includes(x));
                if (shared.length >= 2) {
                    score = Math.max(score, 60 + shared.length * 5);
                }
            }
        }

        if (w.includes(n) || n.includes(w)) {
            score = Math.max(score, 70);
        }

        if (score > bestScore) {
            bestScore = score;
            bestMatch = nominee;
        }
    }

    return bestScore >= 60 ? bestMatch : null;
}

function parseWikitext(wikitext) {
    const results = {};

    // Split by Award category template
    const categoryPattern = /\{\{Award category\|[^|]*\|([^}]*)\}\}/g;
    let match;
    const sections = [];

    while ((match = categoryPattern.exec(wikitext)) !== null) {
        // Extract the display name from the wiki link in the category header
        let catName = match[1];
        catName = catName.replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, '$1').replace(/\[\[([^\]]*)\]\]/g, '$1').trim();
        sections.push({ name: catName, startIndex: match.index + match[0].length });
    }

    for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const endIndex = i + 1 < sections.length ? sections[i + 1].startIndex : wikitext.length;
        const sectionText = wikitext.slice(section.startIndex, endIndex);
        const lines = sectionText.split('\n').map(l => l.trim());

        const key = WIKI_TO_KEY[section.name];
        if (!key) continue;

        const winnerText = extractWinnerFromSection(lines);
        if (!winnerText) continue;

        const nominees = NOMINEE_DATA[key];
        if (!nominees) continue;

        const matched = fuzzyMatch(winnerText, nominees);
        if (matched) {
            results[key] = matched;
        }
    }

    return results;
}

async function scrapeWinners(env) {
    const resp = await fetch(
        "https://en.wikipedia.org/w/api.php?action=parse&page=98th_Academy_Awards&prop=wikitext&format=json",
        { headers: { "User-Agent": "OscarPicksBot/1.0 (oscar-picks-app)" } }
    );
    if (!resp.ok) return { scraped: 0, error: `Wikipedia API returned ${resp.status}` };

    const data = await resp.json();
    const wikitext = data?.parse?.wikitext?.["*"];
    if (!wikitext) return { scraped: 0, error: "No wikitext found" };

    const scraped = parseWikitext(wikitext);
    if (Object.keys(scraped).length === 0) return { scraped: 0, note: "No winners found yet" };

    const winners = await readJson(env.OSCAR_BUCKET, "winners.json");
    let newCount = 0;
    for (const [cat, winner] of Object.entries(scraped)) {
        if (!winners[cat]) {
            winners[cat] = winner;
            newCount++;
        }
    }

    if (newCount > 0) {
        await writeJson(env.OSCAR_BUCKET, "winners.json", winners);
    }

    return { scraped: Object.keys(scraped).length, new: newCount, total: Object.keys(winners).length };
}

export default {
    async scheduled(event, env, ctx) {
        const result = await scrapeWinners(env);
        console.log("Wiki scrape result:", JSON.stringify(result));
    },

    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname;

        // Handle CORS preflight
        if (request.method === "OPTIONS") {
            return new Response(null, { status: 204, headers: corsHeaders() });
        }

        try {
            // GET /votes — return all votes
            // Internal format: { normalizedKey: { displayName, picks } }
            // Returns: { displayName: picks } for frontend compatibility
            if (path === "/votes" && request.method === "GET") {
                const votes = await readJson(env.OSCAR_BUCKET, "votes.json");
                const result = {};
                for (const [key, value] of Object.entries(votes)) {
                    if (value && value.displayName && value.picks) {
                        result[value.displayName] = value.picks;
                    } else {
                        // Legacy format: key is display name, value is picks directly
                        result[key] = value;
                    }
                }
                return jsonResponse(result);
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
                const key = normalizeKey(name);
                const existing = votes[key];
                const existingPicks = existing?.picks || existing || {};
                // If existing entry is legacy format (no displayName wrapper), treat it as picks
                const isLegacy = existing && !existing.displayName;
                votes[key] = {
                    displayName: name.trim(),
                    picks: { ...(isLegacy ? existing : existingPicks), ...picks },
                };
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

            // POST /scrape — manually trigger Wikipedia scrape (admin only)
            if (path === "/scrape" && request.method === "POST") {
                const adminSecret = request.headers.get("X-Admin");
                if (!adminSecret || adminSecret !== env.ADMIN_SECRET) {
                    return jsonResponse({ error: "Unauthorized" }, 401);
                }
                const result = await scrapeWinners(env);
                return jsonResponse(result);
            }

            return jsonResponse({ error: "Not found" }, 404);

        } catch (e) {
            return jsonResponse({ error: e.message }, 500);
        }
    }
};
