const API_BASE = 'https://oscar-picks-api.austin-brian.workers.dev';
const LOCKOUT_TIME = new Date('2026-03-15T19:00:00-04:00').getTime();

// --- State ---
let currentPicks = {};
let allVotes = {};
let winners = {};

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
		const pickDisplay = currentPick
			? `<span class="category-pick">${escapeHtml(currentPick)}</span>`
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
		renderResultsTable();
		renderLeaderboard();
		renderConsensus();

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
			renderResultsTable();
			renderLeaderboard();
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
		const winner = winners[key];
		html += `<tr><td>${cat.label}${winner ? ` <span class="winner-badge">W: ${truncate(winner, 20)}</span>` : ''}</td>`;

		for (const player of players) {
			const pick = allVotes[player]?.[key] || '—';
			let cls = '';
			if (winner) {
				cls = pick === winner ? 'pick-correct' : 'pick-wrong';
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
	const winnerKeys = Object.keys(winners);

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
			if (allVotes[player]?.[key] === winners[key]) {
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

	leaderboardChart = new Chart(ctx, {
		type: 'bar',
		data: {
			labels: sorted.map(s => s.name),
			datasets: [{
				label: 'Correct Picks',
				data: sorted.map(s => s.score),
				backgroundColor: '#d4af37',
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

	consensusChart = new Chart(ctx, {
		type: 'bar',
		data: {
			labels,
			datasets: [{
				label: 'Consensus %',
				data,
				backgroundColor: '#6a5acd',
			}],
		},
		options: {
			...chartOptions('Consensus %'),
			indexAxis: 'y',
		},
	});
}

// --- Chart Helpers ---
function chartOptions(label) {
	return {
		responsive: true,
		plugins: {
			legend: {display: false},
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
function escapeHtml(string_) {
	const div = document.createElement('div');
	div.textContent = string_;
	return div.innerHTML.replaceAll('"', '&quot;');
}
