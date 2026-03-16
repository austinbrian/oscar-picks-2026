const API_BASE = 'https://oscar-picks-api.austin-brian.workers.dev';
const LOCKOUT_TIME = new Date('2026-03-15T19:00:00-04:00').getTime();

// --- State ---
let currentPicks = {};
let allVotes = {};
let winners = {};
const isAdmin = new URLSearchParams(window.location.search).has('admin');

// --- DOM refs ---
const picksTab = document.querySelector('#picks-tab');
const resultsTab = document.querySelector('#results-tab');
const categoriesList = document.querySelector('#categories-list');
const playerNameInput = document.querySelector('#player-name');
const submitBtn = document.querySelector('#submit-picks');
const submitStatus = document.querySelector('#submit-status');
const pickCount = document.querySelector('#pick-count');
const lockoutBanner = document.querySelector('#lockout-banner');

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
	loadFromLocalStorage();
	renderCategories();
	setupTabs();
	setupSubmit();
	checkLockout();
	updatePickCount();
	// Results tab always visible
});

// --- Tabs ---
function setupTabs() {
	for (const tab of document.querySelectorAll('.tab')) {
		tab.addEventListener('click', () => {
			for (const t of document.querySelectorAll('.tab')) {
				t.classList.remove('active');
			}

			for (const tc of document.querySelectorAll('.tab-content')) {
				tc.classList.remove('active');
			}

			tab.classList.add('active');
			const targetId = tab.dataset.tab + '-tab';
			document.getElementById(targetId).classList.add('active');

			if (tab.dataset.tab === 'results') {
				loadResults();
			}
		});
	}
}

// --- LocalStorage ---
function loadFromLocalStorage() {
	const savedName = localStorage.getItem('oscar_name');
	if (savedName) {
		playerNameInput.value = savedName;
	}

	const savedPicks = localStorage.getItem('oscar_picks');
	if (savedPicks) {
		try {
			currentPicks = JSON.parse(savedPicks);
		} catch {
			currentPicks = {};
		}
	}

	playerNameInput.addEventListener('input', () => {
		localStorage.setItem('oscar_name', playerNameInput.value.trim());
	});
}

function savePicks() {
	localStorage.setItem('oscar_picks', JSON.stringify(currentPicks));
}

// --- Lockout ---
function isLocked() {
	return Date.now() >= LOCKOUT_TIME;
}

function checkLockout() {
	if (isLocked()) {
		lockoutBanner.classList.remove('hidden');
		submitBtn.disabled = true;
		for (const r of document.querySelectorAll('#categories-list input[type="radio"]')) {
			r.disabled = true;
		}

		playerNameInput.disabled = true;
	}
}

// --- Render Categories ---
function renderCategories() {
	categoriesList.innerHTML = '';
	const categoryKeys = Object.keys(NOMINEES);

	for (const key of categoryKeys) {
		const cat = NOMINEES[key];
		const card = document.createElement('div');
		card.className = 'category-card';
		card.dataset.category = key;

		const currentPick = currentPicks[key] || '';
		let indicatorHtml = '';
		if (currentPick && hasWinner(key)) {
			indicatorHtml = isWinner(key, currentPick)
				? '<span class="pick-indicator correct">&#10003;</span>'
				: '<span class="pick-indicator wrong">&#10007;</span>';
		}
		const pickDisplay = currentPick
			? `${indicatorHtml}<span class="category-pick">${escapeHtml(currentPick)}</span>`
			: '';

		card.innerHTML = `
            <div class="category-header">
                <span class="category-title">${cat.label}</span>
                <div style="display:flex;align-items:center;">
                    ${pickDisplay}
                    <span class="category-chevron">&#9660;</span>
                </div>
            </div>
            <div class="category-body">
                ${cat.nominees.map((nom, i) => `
                    <label class="nominee-option">
                        <input type="radio" name="${key}" value="${escapeHtml(nom)}"
                            ${currentPick === nom ? 'checked' : ''}
                            ${isLocked() ? 'disabled' : ''}>
                        <span class="nominee-label">${nom}</span>
                    </label>
                `).join('')}
            </div>
        `;

		const header = card.querySelector('.category-header');
		header.addEventListener('click', () => {
			card.classList.toggle('open');
		});

		for (const radio of card.querySelectorAll('input[type="radio"]')) {
			radio.addEventListener('change', e => {
				currentPicks[key] = e.target.value;
				savePicks();
				updatePickDisplay(card, key);
				updatePickCount();
			});
		}

		categoriesList.append(card);
	}
}

function updatePickDisplay(card, key) {
	const pick = currentPicks[key] || '';
	let pickSpan = card.querySelector('.category-pick');
	if (pick) {
		if (!pickSpan) {
			pickSpan = document.createElement('span');
			pickSpan.className = 'category-pick';
			card.querySelector('.category-header div').prepend(pickSpan);
		}

		pickSpan.textContent = pick;
	} else if (pickSpan) {
		pickSpan.remove();
	}
}

function refreshPickIndicators() {
	for (const card of categoriesList.querySelectorAll('.category-card')) {
		const key = card.dataset.category;
		const pick = currentPicks[key];
		const headerDiv = card.querySelector('.category-header div');

		let indicator = card.querySelector('.pick-indicator');
		if (pick && hasWinner(key)) {
			const isCorrect = isWinner(key, pick);
			if (!indicator) {
				indicator = document.createElement('span');
				headerDiv.prepend(indicator);
			}
			indicator.className = `pick-indicator ${isCorrect ? 'correct' : 'wrong'}`;
			indicator.innerHTML = isCorrect ? '&#10003;' : '&#10007;';
		} else if (indicator) {
			indicator.remove();
		}
	}
}

function updatePickCount() {
	const total = Object.keys(NOMINEES).length;
	const picked = Object.keys(currentPicks).length;
	pickCount.textContent = `${picked} / ${total} categories picked`;
}

function truncate(string_, length) {
	return string_.length > length ? string_.slice(0, length) + '...' : string_;
}

// --- Submit ---
function setupSubmit() {
	submitBtn.addEventListener('click', submitPicks);
}

async function submitPicks() {
	const name = playerNameInput.value.trim();
	if (!name) {
		showStatus('Please enter your name.', 'error');
		return;
	}

	if (Object.keys(currentPicks).length === 0) {
		showStatus('Please make at least one pick.', 'error');
		return;
	}

	if (isLocked()) {
		showStatus('Picks are locked.', 'error');
		return;
	}

	submitBtn.disabled = true;
	showStatus('Submitting...', '');

	try {
		const resp = await fetch(`${API_BASE}/vote`, {
			method: 'POST',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify({name, picks: currentPicks}),
		});

		if (!resp.ok) {
			const data = await resp.json().catch(() => ({}));
			throw new Error(data.error || `HTTP ${resp.status}`);
		}

		showStatus('Picks submitted!', 'success');
	} catch (error) {
		showStatus(`Error: ${error.message}`, 'error');
	} finally {
		if (!isLocked()) {
			submitBtn.disabled = false;
		}
	}
}

function showStatus(message, type) {
	submitStatus.textContent = message;
	submitStatus.className = 'status-msg' + (type ? ` ${type}` : '');
}

// --- Results ---
let resultsLoaded = false;
let pollInterval = null;

async function loadResults() {
	const loading = document.querySelector('#results-loading');

	try {
		const [votesResp, winnersResp] = await Promise.all([
			fetch(`${API_BASE}/votes`),
			fetch(`${API_BASE}/winners`),
		]);

		allVotes = await votesResp.json();
		winners = await winnersResp.json();

		loading.classList.add('hidden');
		renderScorecard();
		renderScoreTracker();
		renderResultsTable();
		renderLeaderboard();
		renderCategoryAccuracy();
		renderConsensus();
		renderH2HSection();
		refreshPickIndicators();

		document.querySelector('#leaderboard-section').classList.remove('hidden');
		document.querySelector('#picks-table-section').classList.remove('hidden');
		document.querySelector('#consensus-section').classList.remove('hidden');

		resultsLoaded = true;

		// Poll for winner updates during ceremony
		if (!pollInterval && isLocked()) {
			pollInterval = setInterval(pollWinners, 60_000);
		}
	} catch {
		loading.textContent = 'Could not load results. API may not be deployed yet.';
	}
}

async function pollWinners() {
	try {
		const resp = await fetch(`${API_BASE}/winners`);
		const newWinners = await resp.json();
		if (JSON.stringify(newWinners) !== JSON.stringify(winners)) {
			winners = newWinners;
			renderScorecard();
			renderScoreTracker();
			renderResultsTable();
			renderLeaderboard();
			renderCategoryAccuracy();
			renderConsensus();
			refreshPickIndicators();
		}
	} catch {
		// Silently retry next interval
	}
}

// --- Render Results Table ---
function renderResultsTable() {
	const wrapper = document.querySelector('#picks-table-wrapper');
	const players = Object.keys(allVotes).sort();

	if (players.length === 0) {
		wrapper.innerHTML = '<p>No picks submitted yet.</p>';
		return;
	}

	const categoryKeys = Object.keys(NOMINEES);
	let html = '<table class=\'picks-table\'><thead><tr><th>Category</th>';
	for (const p of players) {
		html += `<th>${escapeHtml(p)}</th>`;
	}

	html += '</tr></thead><tbody>';

	for (const key of categoryKeys) {
		const cat = NOMINEES[key];
		const winnerDisplay = hasWinner(key) ? (Array.isArray(winners[key]) ? winners[key].map(w => truncate(w, 20)).join(' / ') : truncate(winners[key], 20)) : '';
		html += `<tr><td>${cat.label}${winnerDisplay ? ` <span class="winner-badge">W: ${winnerDisplay}</span>` : ''}</td>`;

		for (const player of players) {
			const pick = allVotes[player]?.[key] || '—';
			let cls = '';
			if (hasWinner(key)) {
				cls = isWinner(key, pick) ? 'pick-correct' : 'pick-wrong';
			}

			html += `<td class="${cls}">${escapeHtml(truncate(pick, 25))}</td>`;
		}

		html += '</tr>';
	}

	html += '</tbody></table>';
	wrapper.innerHTML = html;
}

// --- Leaderboard Chart ---
let leaderboardChart = null;

function renderLeaderboard() {
	const players = Object.keys(allVotes).sort();
	const winnerKeys = Object.keys(winners).filter(k => hasWinner(k));

	if (winnerKeys.length === 0 && players.length > 0) {
		// No winners yet — show pick counts instead
		const canvas = document.querySelector('#leaderboard-chart');
		const ctx = canvas.getContext('2d');
		const data = players.map(p => Object.keys(allVotes[p] || {}).length);

		if (leaderboardChart) {
			leaderboardChart.destroy();
		}

		leaderboardChart = new Chart(ctx, {
			type: 'bar',
			data: {
				labels: players,
				datasets: [{
					label: 'Categories Picked',
					data,
					backgroundColor: '#d4af37',
				}],
			},
			options: chartOptions('Categories Picked'),
		});
		return;
	}

	const scores = players.map(player => {
		let correct = 0;
		for (const key of winnerKeys) {
			if (isWinner(key, allVotes[player]?.[key])) {
				correct++;
			}
		}

		return correct;
	});

	// Sort by score descending
	const sorted = players.map((p, i) => ({name: p, score: scores[i]}))
		.sort((a, b) => b.score - a.score);

	const canvas = document.querySelector('#leaderboard-chart');
	const ctx = canvas.getContext('2d');

	if (leaderboardChart) {
		leaderboardChart.destroy();
	}

	const barColors = sorted.map((_, i) => {
		const alpha = 1 - (i / Math.max(sorted.length, 1)) * 0.6;
		return `rgba(212, 175, 55, ${alpha})`;
	});

	leaderboardChart = new Chart(ctx, {
		type: 'bar',
		data: {
			labels: sorted.map(s => s.name),
			datasets: [{
				label: 'Correct Picks',
				data: sorted.map(s => s.score),
				backgroundColor: barColors,
			}],
		},
		options: chartOptions('Correct Picks'),
	});
}

// --- Consensus Chart ---
let consensusChart = null;

function renderConsensus() {
	const players = Object.keys(allVotes);
	if (players.length === 0) {
		return;
	}

	const categoryKeys = Object.keys(NOMINEES);
	const labels = [];
	const data = [];

	for (const key of categoryKeys) {
		const tally = {};
		for (const player of players) {
			const pick = allVotes[player]?.[key];
			if (pick) {
				tally[pick] = (tally[pick] || 0) + 1;
			}
		}

		const topPick = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
		if (topPick) {
			labels.push(NOMINEES[key].label);
			data.push(Math.round((topPick[1] / players.length) * 100));
		}
	}

	const canvas = document.querySelector('#consensus-chart');
	const ctx = canvas.getContext('2d');

	if (consensusChart) {
		consensusChart.destroy();
	}

	const conColors = data.map(v =>
		v >= 70 ? '#d4af37' : v >= 40 ? '#6a5acd' : '#444'
	);

	consensusChart = new Chart(ctx, {
		type: 'bar',
		data: {
			labels,
			datasets: [{
				label: 'Consensus %',
				data,
				backgroundColor: conColors,
			}],
		},
		options: {
			...chartOptions('Consensus %'),
			indexAxis: 'y',
		},
	});
}

// --- Scorecard ---
function renderScorecard() {
	const section = document.querySelector('#scorecard-section');
	const content = document.querySelector('#scorecard-content');
	const name = playerNameInput.value.trim();
	const match = findPlayerPicks(name);
	const picks = match?.picks || currentPicks;

	if (!name || Object.keys(picks).length === 0) {
		content.innerHTML = '<p style="color:#888;">Submit your picks to see your scorecard.</p>';
		section.classList.remove('hidden');
		return;
	}

	const sc = getPlayerScorecard(picks);
	const announced = sc.correct.length + sc.wrong.length;
	const total = announced + sc.pending.length;

	const correctPct = total > 0 ? (sc.correct.length / total) * 100 : 0;
	const wrongPct = total > 0 ? (sc.wrong.length / total) * 100 : 0;
	const pendingPct = total > 0 ? (sc.pending.length / total) * 100 : 0;

	let html = `
		<div class="scorecard-summary">
			<div>
				<div class="scorecard-score">${sc.score}${announced > 0 ? ` / ${announced}` : ''}</div>
				<div class="scorecard-score-label">${announced > 0 ? 'correct' : 'no winners yet'}${sc.pending.length > 0 ? ` &middot; ${sc.pending.length} pending` : ''}</div>
			</div>
		</div>
		<div class="scorecard-progress">
			<div class="correct" style="width:${correctPct}%"></div>
			<div class="wrong" style="width:${wrongPct}%"></div>
			<div class="pending" style="width:${pendingPct}%"></div>
		</div>
	`;

	if (sc.correct.length > 0) {
		html += '<div class="scorecard-list"><h3 style="color:#4caf50;">Got Right</h3>';
		for (const key of sc.correct) {
			html += `<div class="scorecard-item correct"><strong>${NOMINEES[key].label}</strong> &mdash; ${escapeHtml(picks[key])}</div>`;
		}
		html += '</div>';
	}

	if (sc.wrong.length > 0) {
		html += '<div class="scorecard-list"><h3 style="color:#ff6b6b;">Got Wrong</h3>';
		for (const key of sc.wrong) {
			html += `<div class="scorecard-item wrong"><strong>${NOMINEES[key].label}</strong> &mdash; ${escapeHtml(picks[key])}</div>`;
		}
		html += '</div>';
	}

	content.innerHTML = html;
	section.classList.remove('hidden');
}

// --- Score Tracker ---
let scoreTrackerChart = null;

// 98th Academy Awards ceremony presentation order
const CEREMONY_ORDER = [
	'best_supporting_actress',
	'best_animated_feature',
	'best_animated_short',
	'best_costume_design',
	'best_makeup_hairstyling',
	'best_casting',
	'best_live_action_short',
	'best_supporting_actor',
	'best_adapted_screenplay',
	'best_original_screenplay',
	'best_production_design',
	'best_visual_effects',
	'best_documentary_short',
	'best_documentary_feature',
	'best_original_score',
	'best_sound',
	'best_film_editing',
	'best_cinematography',
	'best_international_feature',
	'best_original_song',
	'best_director',
	'best_actor',
	'best_actress',
	'best_picture',
];

function renderScoreTracker() {
	const section = document.querySelector('#score-tracker-section');
	const announcedKeys = CEREMONY_ORDER.filter(k => hasWinner(k));

	if (announcedKeys.length === 0) {
		section.classList.add('hidden');
		return;
	}

	const players = Object.keys(allVotes).sort();
	const currentNormalized = normalizeKey(playerNameInput.value);

	const datasets = players.map((player, i) => {
		let cumulative = 0;
		const data = announcedKeys.map(key => {
			if (isWinner(key, allVotes[player]?.[key])) {
				cumulative++;
			}
			return cumulative;
		});

		const isCurrentUser = normalizeKey(player) === currentNormalized;
		const color = isCurrentUser ? '#d4af37' : PLAYER_COLORS[i % PLAYER_COLORS.length];

		return {
			label: player,
			data,
			borderColor: color,
			backgroundColor: color,
			tension: 0.3,
			pointRadius: 4,
			borderWidth: isCurrentUser ? 3 : 2,
		};
	});

	const canvas = document.querySelector('#score-tracker-chart');
	const ctx = canvas.getContext('2d');

	if (scoreTrackerChart) {
		scoreTrackerChart.destroy();
	}

	scoreTrackerChart = new Chart(ctx, {
		type: 'line',
		data: {
			labels: announcedKeys.map(k => NOMINEES[k].label),
			datasets,
		},
		options: {
			...chartOptions('Score'),
			plugins: {
				legend: {display: true, labels: {color: '#aaa'}},
				tooltip: {
					backgroundColor: '#1a1a1a',
					titleColor: '#d4af37',
					bodyColor: '#e0e0e0',
					borderColor: '#333',
					borderWidth: 1,
				},
			},
			scales: {
				x: {
					ticks: {color: '#aaa', maxRotation: 45, font: {size: 10}},
					grid: {color: '#222'},
				},
				y: {
					ticks: {color: '#aaa', stepSize: 1},
					grid: {color: '#222'},
					beginAtZero: true,
				},
			},
			animation: {duration: 800, easing: 'easeOutQuart'},
		},
	});

	section.classList.remove('hidden');
}

// --- Category Accuracy ---
let accuracyChart = null;

function renderCategoryAccuracy() {
	const section = document.querySelector('#accuracy-section');
	const announcedKeys = Object.keys(NOMINEES).filter(k => hasWinner(k));

	if (announcedKeys.length === 0) {
		section.classList.add('hidden');
		return;
	}

	const players = Object.keys(allVotes);
	const labels = [];
	const data = [];

	for (const key of announcedKeys) {
		const correctCount = players.filter(p => isWinner(key, allVotes[p]?.[key])).length;
		labels.push(NOMINEES[key].label);
		data.push(Math.round((correctCount / players.length) * 100));
	}

	const bgColors = data.map(v =>
		v >= 60 ? '#4caf50' : v >= 30 ? '#ff9800' : '#ff6b6b'
	);

	const canvas = document.querySelector('#accuracy-chart');
	const ctx = canvas.getContext('2d');

	if (accuracyChart) {
		accuracyChart.destroy();
	}

	accuracyChart = new Chart(ctx, {
		type: 'bar',
		data: {
			labels,
			datasets: [{
				label: 'Accuracy %',
				data,
				backgroundColor: bgColors,
			}],
		},
		options: {
			...chartOptions('Accuracy %'),
			indexAxis: 'y',
			animation: {duration: 800, easing: 'easeOutQuart'},
		},
	});

	section.classList.remove('hidden');
}

// --- Head to Head ---
function renderH2HSection() {
	const section = document.querySelector('#h2h-section');
	const players = Object.keys(allVotes).sort();

	if (players.length < 2) {
		section.classList.add('hidden');
		return;
	}

	const select1 = document.querySelector('#h2h-player1');
	const select2 = document.querySelector('#h2h-player2');
	const currentName = playerNameInput.value.trim();

	// Only populate if empty (avoid resetting user selection)
	if (select1.options.length <= 1) {
		for (const p of players) {
			select1.add(new Option(p, p));
			select2.add(new Option(p, p));
		}
		const match = findPlayerPicks(currentName);
		if (match) {
			select1.value = match.player;
		}
		select1.addEventListener('change', renderH2HComparison);
		select2.addEventListener('change', renderH2HComparison);
	}

	section.classList.remove('hidden');
	renderH2HComparison();
}

function renderH2HComparison() {
	const content = document.querySelector('#h2h-content');
	const p1 = document.querySelector('#h2h-player1').value;
	const p2 = document.querySelector('#h2h-player2').value;

	if (!p1 || !p2) {
		content.innerHTML = '<p style="color:#888;">Select two players to compare.</p>';
		return;
	}

	if (p1 === p2) {
		content.innerHTML = '<p style="color:#888;">Select two different players.</p>';
		return;
	}

	const picks1 = allVotes[p1] || {};
	const picks2 = allVotes[p2] || {};
	const categoryKeys = Object.keys(NOMINEES);

	let agreed = 0;
	let p1Score = 0;
	let p2Score = 0;
	const announced = Object.keys(winners).filter(k => hasWinner(k)).length;

	for (const key of categoryKeys) {
		if (picks1[key] && picks1[key] === picks2[key]) agreed++;
		if (hasWinner(key)) {
			if (isWinner(key, picks1[key])) p1Score++;
			if (isWinner(key, picks2[key])) p2Score++;
		}
	}

	let html = `
		<div class="h2h-stats">
			<div class="h2h-stat">
				<div class="h2h-stat-value">${agreed}</div>
				<div class="h2h-stat-label">Agree</div>
			</div>
			${announced > 0 ? `
				<div class="h2h-stat">
					<div class="h2h-stat-value">${p1Score}</div>
					<div class="h2h-stat-label">${escapeHtml(p1)}</div>
				</div>
				<div class="h2h-stat">
					<div class="h2h-stat-value">${p2Score}</div>
					<div class="h2h-stat-label">${escapeHtml(p2)}</div>
				</div>
			` : ''}
		</div>
		<div class="table-wrapper">
		<table class="h2h-table">
			<thead><tr>
				<th>Category</th>
				<th>${escapeHtml(p1)}</th>
				<th>${escapeHtml(p2)}</th>
			</tr></thead>
			<tbody>
	`;

	for (const key of categoryKeys) {
		const pick1 = picks1[key] || '—';
		const pick2 = picks2[key] || '—';
		const match = pick1 === pick2 && pick1 !== '—';
		const announced = hasWinner(key);

		let cls1 = '';
		let cls2 = '';
		if (announced) {
			cls1 = isWinner(key, pick1) ? 'pick-correct' : 'pick-wrong';
			cls2 = isWinner(key, pick2) ? 'pick-correct' : 'pick-wrong';
		}

		const rowCls = match ? ' class="h2h-agree"' : '';
		html += `<tr${rowCls}>
			<td>${NOMINEES[key].label}${announced ? ` <span class="winner-badge">W</span>` : ''}</td>
			<td class="${cls1}">${escapeHtml(pick1)}</td>
			<td class="${cls2}">${escapeHtml(pick2)}</td>
		</tr>`;
	}

	html += '</tbody></table></div>';
	content.innerHTML = html;
}

// --- Chart Helpers ---
function chartOptions(label) {
	return {
		responsive: true,
		animation: {duration: 800, easing: 'easeOutQuart'},
		plugins: {
			legend: {display: false},
			tooltip: {
				backgroundColor: '#1a1a1a',
				titleColor: '#d4af37',
				bodyColor: '#e0e0e0',
				borderColor: '#333',
				borderWidth: 1,
			},
		},
		scales: {
			x: {
				ticks: {color: '#aaa'},
				grid: {color: '#222'},
			},
			y: {
				ticks: {color: '#aaa'},
				grid: {color: '#222'},
				beginAtZero: true,
			},
		},
	};
}

// --- Utils ---
const PLAYER_COLORS = ['#6a5acd', '#4caf50', '#ff6b6b', '#00bcd4', '#ff9800', '#e91e63', '#8bc34a', '#42a5f5', '#ab47bc'];

function normalizeKey(name) {
	return name.trim().toLowerCase().replace(/[\u{0080}-\u{FFFF}]/gu, '').replace(/\s+/g, ' ').trim();
}

function findPlayerPicks(name) {
	const key = normalizeKey(name);
	for (const [player, picks] of Object.entries(allVotes)) {
		if (normalizeKey(player) === key) return {player, picks};
	}
	return null;
}

function escapeHtml(string_) {
	const div = document.createElement('div');
	div.textContent = string_;
	return div.innerHTML.replaceAll('"', '&quot;');
}

function isWinner(category, pick) {
	const w = winners[category];
	if (!w) return false;
	if (Array.isArray(w)) return w.includes(pick);
	return pick === w;
}

function hasWinner(category) {
	const w = winners[category];
	if (Array.isArray(w)) return w.length > 0;
	return !!w;
}

function getPlayerScorecard(playerPicks) {
	const categoryKeys = Object.keys(NOMINEES);
	const result = {score: 0, correct: [], wrong: [], pending: []};
	for (const key of categoryKeys) {
		const pick = playerPicks?.[key];
		if (!pick) continue;
		if (!hasWinner(key)) {
			result.pending.push(key);
		} else if (isWinner(key, pick)) {
			result.correct.push(key);
			result.score++;
		} else {
			result.wrong.push(key);
		}
	}
	return result;
}
