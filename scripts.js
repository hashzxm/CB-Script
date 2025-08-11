// =================================================================================
// Global Variables and State
// =================================================================================

// This object will hold the data once it's fetched
const appData = {
    finalReport: null,
    schedule: null,
    batterAbs: null,
    dailyBatterScripts: null
};

// --- GLOBAL STATE ---
let allGamesData = [];
let masterPlayerList = [];
let myPicks = [];
let notebookSort = { key: 'recentProbValue', order: 'desc' };
let allNotebookSort = { key: 'home_run', order: 'desc' };
let userSettings = { highParkFactor: 105 };
let isNotebookFocusView = true;
let gameCardSorts = {}; // To store sort state for each game card table

const espnTeamAbbrMap = {
    'ARI': 'ARI', 'ATL': 'ATL', 'BAL': 'BAL', 'BOS': 'BOS', 'CHC': 'CHC',
    'CHW': 'CWS', 'CIN': 'CIN', 'CLE': 'CLE', 'COL': 'COL', 'DET': 'DET',
    'HOU': 'HOU', 'KC': 'KC', 'LAA': 'LAA', 'LAD': 'LAD', 'MIA': 'MIA',
    'MIL': 'MIL', 'MIN': 'MIN', 'NYM': 'NYM', 'NYY': 'NYY', 'OAK': 'OAK',
    'PHI': 'PHI', 'PIT': 'PIT', 'SD': 'SD', 'SEA': 'SEA', 'SF': 'SF',
    'STL': 'STL', 'TB': 'TB', 'TEX': 'TEX', 'TOR': 'TOR', 'WSH': 'WSH',
    // Full names from schedule
    'Diamondbacks': 'ARI', 'Braves': 'ATL', 'Orioles': 'BAL', 'Red Sox': 'BOS', 'Cubs': 'CHC',
    'White Sox': 'CWS', 'Reds': 'CIN', 'Guardians': 'CLE', 'Rockies': 'COL', 'Tigers': 'DET',
    'Astros': 'HOU', 'Royals': 'KC', 'Angels': 'LAA', 'Dodgers': 'LAD', 'Marlins': 'MIA',
    'Brewers': 'MIL', 'Twins': 'MIN', 'Mets': 'NYM', 'Yankees': 'NYY', 'Athletics': 'OAK',
    'Phillies': 'PHI', 'Pirates': 'PIT', 'Padres': 'SD', 'Mariners': 'SEA', 'Giants': 'SF',
    'Cardinals': 'STL', 'Rays': 'TB', 'Rangers': 'TEX', 'Blue Jays': 'TOR', 'Nationals': 'WSH'
};


// =================================================================================
// Data Fetching and Initialization
// =================================================================================

/**
 * Fetches all necessary JSON data from the server.
 */
async function fetchData() {
    // IMPORTANT GITHUB PAGES FIX:
    // The basePath must match your repository name exactly.
    const basePath = '/CB-Script'; // <--- FIXED THIS LINE

    try {
        // Use Promise.all to fetch all data files concurrently for speed.
        const [
            finalReportResponse,
            scheduleResponse,
            batterAbsResponse,
            dailyScriptsResponse
        ] = await Promise.all([
            fetch(`${basePath}/data/final_report.json`),
            fetch(`${basePath}/data/schedule.json`),
            fetch(`${basePath}/data/batter_abs.json`),
            fetch(`${basePath}/data/daily_scripts.json`)
        ]);

        // Check if any of the network requests failed.
        if (!finalReportResponse.ok || !scheduleResponse.ok || !batterAbsResponse.ok || !dailyScriptsResponse.ok) {
            // Create a detailed error message if any file fails to load.
            const errors = [];
            if (!finalReportResponse.ok) errors.push('final_report.json');
            if (!scheduleResponse.ok) errors.push('schedule.json');
            if (!batterAbsResponse.ok) errors.push('batter_abs.json');
            if (!dailyScriptsResponse.ok) errors.push('daily_scripts.json');
            throw new Error(`HTTP error! Could not load: ${errors.join(', ')}`);
        }

        // Parse the JSON from each response and store it in our appData object.
        appData.finalReport = await finalReportResponse.json();
        appData.schedule = await scheduleResponse.json();
        appData.batterAbs = await batterAbsResponse.json();
        appData.dailyBatterScripts = await dailyScriptsResponse.json();
        
        return true; // Indicate success

    } catch (error) {
        console.error("Fatal Error: Could not fetch or process initial data.", error);
        // Hide the main content and password modal to ensure the error is visible.
        const protectedContent = document.getElementById('protected-content');
        if (protectedContent) protectedContent.style.display = 'none';
        const passwordModal = document.getElementById('password-modal');
        if (passwordModal) passwordModal.style.display = 'none';

        // Create and inject a dedicated error message container into the page.
        let errorContainer = document.getElementById('error-container');
        if (!errorContainer) {
            errorContainer = document.createElement('div');
            errorContainer.id = 'error-container';
            errorContainer.className = 'fixed inset-0 flex items-center justify-center z-50 p-4';
            document.body.appendChild(errorContainer);
        }
        errorContainer.innerHTML = `<div class="bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-lg text-center">
                                        <h2 class="text-2xl font-bold mb-4 text-red-500">Error: Failed to Load Report Data</h2>
                                        <p class="text-gray-300">The application could not start because one or more data files are missing or could not be accessed.</p>
                                        <p class="text-gray-400 mt-4">Please check the following in your GitHub repository:</p>
                                        <ul class="text-left text-gray-400 list-disc list-inside mt-2 bg-gray-900 p-3 rounded-md">
                                            <li>A folder named <code class="bg-gray-700 px-1 rounded">data</code> exists in your repository's root directory.</li>
                                            <li>The <code class="bg-gray-700 px-1 rounded">data</code> folder contains all four required JSON files.</li>
                                            <li>File and folder names are all lowercase and match the code exactly.</li>
                                        </ul>
                                        <p class="text-gray-500 text-xs mt-4">Check the browser's developer console (F12) for specific "404 Not Found" errors.</p>
                                   </div>`;
        return false; // Indicate failure
    }
}

/**
 * Initializes the main application logic after data has been fetched.
 */
function initializePage() {
    loadSettings();
    loadPicks();
    
    // Process the fetched data to build the main data structures for the app
    allGamesData = processFinalReport(appData.finalReport, appData.schedule);
    masterPlayerList = createMasterPlayerList(allGamesData);
    
    // Populate UI elements that depend on the initial data
    populateAllNotebookGameFilter();
    
    // Render all the main views of the application
    renderAll();
    
    // Set up all the interactive event listeners
    setupEventListeners();
    
    // Set the initial view to the dashboard
    switchView('dashboard');
}


// =================================================================================
// DATA PROCESSING FUNCTIONS
// =================================================================================
function parseGameTime(timeStr) {
    if (!timeStr || !timeStr.includes(':')) return 2400; // Default for TBD games
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (period && period.toLowerCase().startsWith('pm') && hours !== 12) {
        hours += 12;
    }
    if (period && period.toLowerCase().startsWith('am') && hours === 12) {
        hours = 0;
    }
    return hours * 100 + minutes;
}

function processFinalReport(reportData, schedule) {
    if (!reportData || !reportData.daily_matchups) return [];
    const scheduleMap = new Map(schedule.games.map(game => [game.game_id, game]));
    const gamesMap = new Map();

    reportData.daily_matchups.forEach(player => {
        const gameId = player.game_id;
        if (!gameId) return;

        if (!gamesMap.has(gameId)) {
            const scheduleInfo = scheduleMap.get(gameId) || {};
            gamesMap.set(gameId, {
                id: gameId,
                title: `${scheduleInfo.away_team || 'Away'} @ ${scheduleInfo.home_team || 'Home'}`,
                time: scheduleInfo.time || 'N/A',
                awayTeam: scheduleInfo.away_team,
                homeTeam: scheduleInfo.home_team,
                parkFactor: scheduleInfo.park_factor_hr || 100,
                parkName: scheduleInfo.park_name,
                weather: scheduleInfo.weather || {},
                teams: new Map()
            });
        }

        const gameNode = gamesMap.get(gameId);
        const pitcherKey = `${player.pitcher_name}-${player.pitcher_team}`;

        if (!gameNode.teams.has(pitcherKey)) {
            gameNode.teams.set(pitcherKey, {
                title: `Batters vs. ${player.pitcher_name}`,
                pitcherName: player.pitcher_name,
                pitcherHand: player.pitcher_hand,
                players: []
            });
        }

        gameNode.teams.get(pitcherKey).players.push({
            batterId: player.batter_id,
            name: player.batter_hand ? `${player.batter_name} (${player.batter_hand}HB)` : player.batter_name,
            rawName: player.batter_name,
            status: player.batter_status_tags?.includes('HR Yesterday') ? '✅' : (player.batter_status_tags?.includes('Low PA') ? '🧊' : ''),
            simScoreStr: player.hr_sim_score ? player.hr_sim_score.toFixed(0) : 'N/A',
            recentProbStr: player.recent_hr_probability ? `${(player.recent_hr_probability * 100).toFixed(2)}%` : 'Low Data',
            twoYearProbStr: player.long_term_hr_probability ? `${(player.long_term_hr_probability * 100).toFixed(2)}%` : 'Low Data',
            simProfile: player.similarity_profile,
            simScoreValue: player.hr_sim_score || -1,
            recentProbValue: player.recent_hr_probability ? player.recent_hr_probability * 100 : -1,
            twoYearProbValue: player.long_term_hr_probability ? player.long_term_hr_probability * 100 : -1,
        });
    });

    const gamesArray = Array.from(gamesMap.values()).map(game => {
        const weather = game.weather || {};
        return {
            ...game,
            teams: Array.from(game.teams.values()),
            temp: weather.temp,
            humidity: weather.humidity,
            windSpeed: weather.wind_speed,
            description: weather.description,
        };
    });

    // Sort games by time
    gamesArray.sort((a,b) => parseGameTime(a.time) - parseGameTime(b.time));
    return gamesArray;
}

function processStrikeoutPredictions(dailyMatchups) {
    if (!dailyMatchups) return [];
    const pitcherMap = new Map();
    dailyMatchups.forEach(matchup => {
        const id = matchup.pitcher_id;
        if (!pitcherMap.has(id) && matchup.pitcher_stats?.predicted_strikeouts) {
            pitcherMap.set(id, {
                name: matchup.pitcher_name,
                k_pred: matchup.pitcher_stats.predicted_strikeouts,
                gameTitle: `${matchup.away_team_abbr} @ ${matchup.home_team_abbr}`
            });
        }
    });
    return Array.from(pitcherMap.values()).sort((a, b) => b.k_pred - a.k_pred);
}

function createMasterPlayerList(games) {
    const masterList = [];
    games.forEach(game => {
        game.teams.forEach(team => {
            team.players.forEach(player => {
                 masterList.push({
                    ...player,
                    pitcherName: team.pitcherName,
                    pitcherHand: team.pitcherHand,
                    gameTitle: game.title,
                    parkFactor: game.parkFactor
                });
            });
        });
    });
    return masterList;
}

// =================================================================================
// RENDERING FUNCTIONS
// =================================================================================
function getStatColorClass(value, type) {
    if (value === -1 || value === null || isNaN(value)) return '';
    if (type === 'prob' || type === 'pct') {
        if (value >= 10) return 'stat-hot';
        if (value >= 5) return 'stat-warm';
        if (value >= 2) return 'stat-cool';
    }
    if (type === 'sim') {
        if (value >= 80) return 'stat-hot';
        if (value >= 65) return 'stat-warm';
        if (value >= 50) return 'stat-cool';
    }
     if (type === 'hr') {
        if (value >= 20) return 'stat-color-high';
        if (value >= 10) return 'stat-color-medium';
        if (value >= 5) return 'stat-color-low';
    }
    return '';
}

function getHotStreakEmoji(batterId) {
    const batter = appData.batterAbs[batterId];
    if (!batter || !batter.last_5_abs || batter.last_5_abs.length < 5) return '';

    const hits = batter.last_5_abs.filter(ab =>
        ['single', 'double', 'triple', 'home_run'].includes(ab.result)
    ).length;

    return hits >= 2 ? '🔥' : '';
}

function getBatterStreak(batterId) {
    const batter = appData.batterAbs[batterId];
    if (!batter || !batter.last_5_abs || batter.last_5_abs.length === 0) return '';
    const last5 = batter.last_5_abs;
    let hits = 0;
    let hrs = 0;
    last5.forEach(ab => {
        if (['single', 'double', 'triple', 'home_run'].includes(ab.result)) hits++;
        if (ab.result === 'home_run') hrs++;
    });
    let result = `${hits}-for-${last5.length}`;
    if (hrs > 0) result += `, ${hrs} HR`;
    return `<span class="batter-streak">(${result})</span>`;
}

function buildGameCardHTML(game) {
    const weatherData = game.temp ? `data-temp="${game.temp.toFixed(0)}" data-humidity="${game.humidity}" data-wind="${game.windSpeed.toFixed(1)}" data-desc="${game.description}"` : '';
    const espnAbbr = (abbr) => espnTeamAbbrMap[abbr] || abbr;
    const homeLogo = `https://a.espncdn.com/i/teamlogos/mlb/500/${espnAbbr(game.homeTeam)}.png`;
    const awayLogo = `https://a.espncdn.com/i/teamlogos/mlb/500/${espnAbbr(game.awayTeam)}.png`;

    const teamsHtml = game.teams.map(team => {
        const sortKey = `${game.id}-${team.pitcherName}`;
        const currentSort = gameCardSorts[sortKey] || { key: 'recentProbValue', order: 'desc' };
        const getSortClass = (k) => k === currentSort.key ? (currentSort.order === 'asc' ? 'sort-asc' : 'sort-desc') : '';

        const sortedPlayers = [...team.players].sort((a, b) => {
            const valA = a[currentSort.key];
            const valB = b[currentSort.key];
            if (valA < valB) return currentSort.order === 'asc' ? -1 : 1;
            if (valA > valB) return currentSort.order === 'asc' ? 1 : -1;
            return 0;
        });

        const playersHtml = sortedPlayers.map(player => {
            const isStarred = myPicks.some(p => p.name === player.name && p.gameTitle === game.title);
            const allEmojis = player.status + getHotStreakEmoji(player.batterId);
            const recentProbColor = getStatColorClass(player.recentProbValue, 'prob');
            const twoYearProbColor = getStatColorClass(player.twoYearProbValue, 'prob');
            const simScoreColor = getStatColorClass(player.simScoreValue, 'sim');
            const batterStreak = getBatterStreak(player.batterId);

            return `<tr class="player-row" data-player-name="${player.rawName}">
                        <td class="py-2 px-4 border-b dark:border-gray-700 text-sm">
                            <div class="player-name-cell">
                                <button class="star-btn ${isStarred ? 'starred' : ''}" data-player-name="${player.name}" data-game-title="${game.title}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg></button>
                                <div>
                                    <button class="player-name-btn" data-player-name="${player.rawName}" data-batter-id="${player.batterId}">${player.name}</button>
                                    ${batterStreak}
                                </div>
                                <span class="ml-2">${allEmojis}</span>
                            </div>
                        </td>
                        <td class="py-2 px-4 border-b dark:border-gray-700 text-sm text-center"><span class="${recentProbColor}">${player.recentProbStr}</span></td>
                        <td class="py-2 px-4 border-b dark:border-gray-700 text-sm text-center"><span class="${twoYearProbColor}">${player.twoYearProbStr}</span></td>
                        <td class="py-2 px-4 border-b dark:border-gray-700 text-sm text-center"><span class="${simScoreColor}">${player.simScoreStr}</span></td>
                    </tr>`;
        }).join('');

        return `<div class="p-4">
                    <details open class="mb-2">
                        <summary class="font-semibold dark:text-gray-300 text-md mb-2 flex justify-between items-center">
                            <span>Batters vs. <button class="pitcher-name-btn" data-pitcher-name="${team.pitcherName}">${team.pitcherName} (${team.pitcherHand})</button></span>
                        </summary>
                        <div class="overflow-x-auto">
                            <table class="min-w-full bg-gray-800 rounded-lg">
                                <thead class="table-header"><tr>
                                    <th class="py-2 px-4 text-left text-xs font-medium uppercase tracking-wider sortable ${getSortClass('name')}" data-sort="name">Batter</th>
                                    <th class="py-2 px-4 text-center text-xs font-medium uppercase tracking-wider sortable ${getSortClass('recentProbValue')}" data-sort="recentProbValue">Recent Prob</th>
                                    <th class="py-2 px-4 text-center text-xs font-medium uppercase tracking-wider sortable ${getSortClass('twoYearProbValue')}" data-sort="twoYearProbValue">2-Yr Prob</th>
                                    <th class="py-2 px-4 text-center text-xs font-medium uppercase tracking-wider sortable ${getSortClass('simScoreValue')}" data-sort="simScoreValue">Sim Score</th>
                                </tr></thead>
                                <tbody class="dark:bg-gray-800 dark:divide-gray-700">${playersHtml}</tbody>
                            </table>
                        </div>
                    </details>
                </div>`;
    }).join('');

    return `<div id="game-${game.id}" class="card sliding-in-up border border-gray-700 rounded-lg shadow-md overflow-hidden" style="animation-delay: 100ms;">
                <div class="game-header p-4 flex justify-between items-center">
                    <div class="flex items-center gap-4">
                       <img src="${awayLogo}" alt="${game.awayTeam}" class="w-8 h-8 object-contain team-logo">
                       <h2 class="text-xl font-bold">${game.title} (${game.time})</h2>
                       <img src="${homeLogo}" alt="${game.homeTeam}" class="w-8 h-8 object-contain team-logo">
                    </div>
                    <button class="stadium-info-btn" data-park-name="${game.parkName}" data-park-factor="${game.parkFactor}" ${weatherData}>
                        <div class="text-xs text-right">
                            <span class="${game.parkFactor >= userSettings.highParkFactor ? 'text-green-400 font-bold' : ''}">🏟️</span>
                        </div>
                    </button>
                </div>
                ${teamsHtml}
            </div>`;
}

function renderDashboard() {
    const topHRProb = [...masterPlayerList].sort((a,b) => b.recentProbValue - a.recentProbValue).slice(0, 25);
    const topSimSluts = [...masterPlayerList].sort((a,b) => b.simScoreValue - a.simScoreValue).slice(0, 25);
    const kPreds = processStrikeoutPredictions(appData.finalReport.daily_matchups);

    const createPill = (item, rank, type) => {
        let value, colorClass, displayValue, name, allEmojis = '';
        if (type === 'prob' || type === 'sim') {
            value = (type === 'prob') ? item.recentProbValue : item.simScoreValue;
            colorClass = getStatColorClass(value, type);
            displayValue = (type === 'prob') ? item.recentProbStr : item.simScoreStr;
            name = item.name || item.rawName;
            allEmojis = item.status + getHotStreakEmoji(item.batterId);
        } else { // k_pred
            value = item.k_pred;
            displayValue = value.toFixed(2);
            name = item.name;
        }
        return `<div class="dashboard-pill"><div class="player-info"><span class="rank">#${rank}</span><div><p class="player-name">${name} <span class="ml-1">${allEmojis}</span></p><p class="secondary-info">${item.gameTitle || 'N/A'}</p></div></div><div class="stat-value ${colorClass}">${displayValue}</div></div>`;
    };

    document.getElementById('hr-prob-container').innerHTML = topHRProb.map((p, i) => createPill(p, i + 1, 'prob')).join('');
    document.getElementById('hr-sim-container').innerHTML = topSimSluts.map((p, i) => createPill(p, i + 1, 'sim')).join('');
    document.getElementById('k-preds-container').innerHTML = kPreds.map((p, i) => createPill(p, i + 1, 'k')).join('');
}

function renderAllGamesView() {
    const container = document.getElementById('game-list-view');
    const espnAbbr = (abbr) => espnTeamAbbrMap[abbr] || abbr;
    container.innerHTML = allGamesData.map(game => {
         const awayLogo = `https://a.espncdn.com/i/teamlogos/mlb/500/${espnAbbr(game.awayTeam)}.png`;
         const homeLogo = `https://a.espncdn.com/i/teamlogos/mlb/500/${espnAbbr(game.homeTeam)}.png`;
        return `
            <div class="game-list-box ${game.parkFactor >= userSettings.highParkFactor ? 'high-park-factor' : ''}" data-game-id="${game.id}">
                <div class="game-list-logos">
                    <img src="${awayLogo}" alt="${game.awayTeam}" class="team-logo" onerror="this.style.display='none'">
                    <span class="text-gray-400 font-bold">@</span>
                    <img src="${homeLogo}" alt="${game.homeTeam}" class="team-logo" onerror="this.style.display='none'">
                </div>
                <div class="game-list-info">
                    <h3>${game.awayTeam} @ ${game.homeTeam}</h3>
                    <p>${game.time} • ${game.parkName || 'N/A'} • ${game.parkFactor} HR PF</p>
                </div>
            </div>`;
    }).join('');
}

function renderGameTicker() {
    const container = document.getElementById('game-ticker-wrapper');
    const espnAbbr = (abbr) => espnTeamAbbrMap[abbr] || abbr;
    container.innerHTML = allGamesData.map(game => {
         const awayLogo = `https://a.espncdn.com/i/teamlogos/mlb/500/${espnAbbr(game.awayTeam)}.png`;
         const homeLogo = `https://a.espncdn.com/i/teamlogos/mlb/500/${espnAbbr(game.homeTeam)}.png`;
        return `<div class="ticker-item ${game.parkFactor >= userSettings.highParkFactor ? 'high-park-factor' : ''}" data-game-id="${game.id}">
                    <div class="flex items-center justify-center gap-2">
                        <img src="${awayLogo}" alt="${game.awayTeam}" class="ticker-logo team-logo" onerror="this.style.display='none'">
                        <img src="${homeLogo}" alt="${game.homeTeam}" class="ticker-logo team-logo" onerror="this.style.display='none'">
                    </div>
                    <p class="text-xs mt-2 text-gray-300">${game.awayTeam} @ ${game.homeTeam}</p>
                     <p class="text-xs mt-1 text-gray-400">${game.time}</p>
                </div>`
    }).join('');
}

function renderFocusView(gameId) {
    const game = allGamesData.find(g => g.id === gameId);
    if (!game) return;
    document.getElementById('focus-game').innerHTML = buildGameCardHTML(game);
    updateStarButtonsInScope(document.getElementById(`game-${game.id}`));
    addPlayerNameClickListeners(document.getElementById(`game-${game.id}`));
}

// =================================================================================
// NOTEBOOK FUNCTIONS
// =================================================================================
function applyNotebookFilters() {
    const search = document.getElementById('pf-search').value.toLowerCase();
    const minProb = parseFloat(document.getElementById('pf-min-prob').value) || 0;
    const minSim = parseFloat(document.getElementById('pf-min-sim').value) || 0;
    const minPF = parseFloat(document.getElementById('pf-min-pf').value) || 0;

    const filtered = masterPlayerList.filter(p => {
        const searchMatch = !search ||
            p.name.toLowerCase().includes(search) ||
            p.pitcherName.toLowerCase().includes(search) ||
            p.gameTitle.toLowerCase().includes(search);
        const probMatch = p.recentProbValue >= minProb;
        const simMatch = p.simScoreValue >= minSim;
        const pfMatch = p.parkFactor >= minPF;
        return searchMatch && probMatch && simMatch && pfMatch;
    });
    renderNotebookTable(filtered);
}

function renderNotebookTable(players) {
    const container = document.getElementById('notebook-table-container');
    if (players.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-400 p-8">No players match the current filters.</p>`;
        return;
    }

    const { key, order } = notebookSort;
    const sortedPlayers = [...players].sort((a, b) => {
        const valA = a[key];
        const valB = b[key];
        if (valA < valB) return order === 'asc' ? -1 : 1;
        if (valA > valB) return order === 'asc' ? 1 : -1;
        return 0;
    });

    const getSortClass = (k) => k === key ? (order === 'asc' ? 'sort-asc' : 'sort-desc') : '';

    const headers = [
        { key: 'name', label: 'Player' },
        { key: 'pitcherName', label: 'Pitcher' },
        { key: 'gameTitle', label: 'Game' },
        { key: 'recentProbValue', label: 'Recent Prob' },
        { key: 'simScoreValue', label: 'Sim Score' },
        { key: 'parkFactor', label: 'Park Factor' }
    ];

    const headersHtml = headers.map(h => `<th class="py-2 px-4 text-left text-xs font-medium uppercase tracking-wider sortable ${getSortClass(h.key)}" data-sort="${h.key}">${h.label}</th>`).join('');

    const rowsHtml = sortedPlayers.map(p => {
        const isStarred = myPicks.some(pick => pick.name === p.name && pick.gameTitle === p.gameTitle);
        const recentProbColor = getStatColorClass(p.recentProbValue, 'prob');
        const simScoreColor = getStatColorClass(p.simScoreValue, 'sim');
        const allEmojis = p.status + getHotStreakEmoji(p.batterId);
        return `<tr class="player-row" data-player-name="${p.rawName}">
                    <td class="py-2 px-4 border-b dark:border-gray-700 text-sm">
                        <div class="player-name-cell">
                            <button class="star-btn ${isStarred ? 'starred' : ''}" data-player-name="${p.name}" data-game-title="${p.gameTitle}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg></button>
                            <button class="player-name-btn" data-player-name="${p.rawName}" data-batter-id="${p.batterId}">${p.name}</button>
                            <span class="ml-2">${allEmojis}</span>
                        </div>
                    </td>
                    <td class="py-2 px-4 border-b dark:border-gray-700 text-sm"><button class="pitcher-name-btn" data-pitcher-name="${p.pitcherName}">${p.pitcherName}</button></td>
                    <td class="py-2 px-4 border-b dark:border-gray-700 text-sm">${p.gameTitle}</td>
                    <td class="py-2 px-4 border-b dark:border-gray-700 text-sm"><span class="${recentProbColor}">${p.recentProbStr}</span></td>
                    <td class="py-2 px-4 border-b dark:border-gray-700 text-sm"><span class="${simScoreColor}">${p.simScoreStr}</span></td>
                    <td class="py-2 px-4 border-b dark:border-gray-700 text-sm"><span class="${p.parkFactor >= userSettings.highParkFactor ? 'text-green-400 font-bold' : ''}">${p.parkFactor}</span></td>
                </tr>`;
    }).join('');

    container.innerHTML = `<div class="overflow-x-auto"><table class="min-w-full bg-gray-800 rounded-lg">
        <thead class="table-header"><tr>${headersHtml}</tr></thead>
        <tbody class="dark:bg-gray-800 dark:divide-gray-700">${rowsHtml}</tbody>
    </table></div>`;

    updateStarButtonsInScope(container);
    addPlayerNameClickListeners(container);
}

function populateAllNotebookGameFilter() {
    const select = document.getElementById('an-game-filter');
    if (!select || allGamesData.length === 0) return;

    // Clear existing options except the first one
    while (select.options.length > 1) {
        select.remove(1);
    }

    // allGamesData is already sorted by time
    allGamesData.forEach(game => {
        const option = document.createElement('option');
        option.value = game.title;
        option.textContent = `${game.title} (${game.time}) - ${game.parkFactor} PF`;
        select.appendChild(option);
    });
}

function renderAllNotebookTable(filterGameTitle = 'all') {
    const container = document.getElementById('all-notebook-table-container');

    let players;
    if (filterGameTitle && filterGameTitle !== 'all') {
        const playersInGame = masterPlayerList
            .filter(p => p.gameTitle === filterGameTitle)
            .map(p => p.rawName);
        players = playersInGame.filter(name => appData.dailyBatterScripts[name]);
    } else {
        players = Object.keys(appData.dailyBatterScripts);
    }

    if (players.length === 0) {
         container.innerHTML = `<p class="text-center text-gray-400 p-8">No scripted data available for this selection.</p>`;
         return;
    }

    const { key, order } = allNotebookSort;

    const sortedPlayers = players.sort((a, b) => {
        const dataA = appData.dailyBatterScripts[a];
        const dataB = appData.dailyBatterScripts[b];
        if (!dataA || !dataB) return 0;

        const keyMap = {
            'hr': 'home_run', 'double': 'double', 'single': 'single',
            'walk': 'walk', 'strikeout': 'strikeout', 'field_out': 'field_out'
        };
        const dataKey = keyMap[key] || 'home_run';

        const valA = parseFloat((dataA[dataKey] || "0").replace('%',''));
        const valB = parseFloat((dataB[dataKey] || "0").replace('%',''));

        if (valA < valB) return order === 'asc' ? -1 : 1;
        if (valA > valB) return order === 'asc' ? 1 : -1;
        return 0;
    });

    const getSortClass = (k) => k === key ? (order === 'asc' ? 'sort-asc' : 'sort-desc') : '';

    const headers = [
        { key: 'player', label: 'Player'},
        { key: 'hr', label: 'HR %'},
        { key: 'double', label: '2B %'},
        { key: 'single', label: '1B %'},
        { key: 'walk', label: 'BB %'},
        { key: 'strikeout', label: 'K %'},
        { key: 'field_out', label: 'Out %'},
    ];
    const headersHtml = headers.map(h => `<th class="py-2 px-4 text-left text-xs font-medium uppercase tracking-wider ${h.key !== 'player' ? 'sortable' : ''}" data-sort-all="${h.key}">${h.label}</th>`).join('');

    const rowsHtml = sortedPlayers.map(name => {
        const data = appData.dailyBatterScripts[name];
        if (!data) return '';

        const playerInfo = masterPlayerList.find(p => p.rawName === name);
        const batterId = playerInfo?.batterId;
        const allEmojis = playerInfo ? (playerInfo.status + getHotStreakEmoji(playerInfo.batterId)) : '';

        const createCell = (key) => {
            const value = parseFloat((data[key] || "0").replace('%',''));
            const colorClass = getStatColorClass(value, 'hr');
            return `<td class="py-2 px-4 border-b dark:border-gray-700 text-sm ${colorClass}">${data[key] || '0.0%'}</td>`;
        }

        return `<tr class="player-row" data-player-name="${name}">
            <td class="py-2 px-4 border-b dark:border-gray-700 text-sm">
                <div class="player-name-cell">
                    <button class="player-name-btn" data-player-name="${name}" data-batter-id="${batterId || ''}">${name}</button>
                     <span class="ml-2">${allEmojis}</span>
                </div>
            </td>
            ${createCell('home_run')}
            ${createCell('double')}
            ${createCell('single')}
            ${createCell('walk')}
            ${createCell('strikeout')}
            ${createCell('field_out')}
        </tr>`;
    }).join('');

    container.innerHTML = `<div class="overflow-x-auto"><table class="min-w-full bg-gray-800 rounded-lg">
        <thead class="table-header"><tr>${headersHtml}</tr></thead>
        <tbody class="dark:bg-gray-800 dark:divide-gray-700">${rowsHtml}</tbody>
    </table></div>`;
    addPlayerNameClickListeners(container);
}

// =================================================================================
// MODAL AND POPOVER FUNCTIONS
// =================================================================================
function populateBatterModal(playerName, batterId) {
    const contentEl = document.getElementById('batter-stats-content');
    document.getElementById('batter-modal-name').textContent = playerName;

    const player = masterPlayerList.find(p => p.rawName === playerName);
    let html = '';
    const abData = appData.batterAbs[batterId];

    if (player) {
        html += `<div class="flex justify-end mb-4"><button class="action-btn swap-to-pitcher-btn" data-pitcher-name="${player.pitcherName}" data-batter-id="${batterId}" data-batter-name="${playerName}">View ${player.pitcherName}</button></div>`;
    }

    html += '<h3 class="font-bold text-lg mb-2 text-gray-100">Recent At-Bats</h3>';
    if (abData && abData.last_5_abs && abData.last_5_abs.length > 0) {
        html += '<ul class="space-y-2 mb-6">';
        abData.last_5_abs.forEach(ab => {
            let resultClass = 'text-gray-400';
            if (['single', 'double', 'triple', 'home_run'].includes(ab.result)) resultClass = 'result-hit';
            else if (['strikeout', 'field_out', 'double_play', 'grounded_into_double_play', 'sac_fly', 'force_out', 'fielders_choice', 'fielders_choice_out'].includes(ab.result)) resultClass = 'result-out';
            else if (ab.result === 'walk') resultClass = 'result-walk';

            html += `<li class="bg-gray-700 p-3 rounded-md text-sm">
                        <div class="flex justify-between items-center font-semibold">
                            <span>${ab.game_date} vs. ${ab.pitcher_name}</span>
                            <span class="${resultClass}">${ab.result.replace(/_/g, ' ')}</span>
                        </div>
                        <div class="text-gray-400 mt-1">
                            <span class="font-mono">(${ab.pitch_type || 'N/A'})</span> "${ab.description}"
                        </div>
                     </li>`;
        });
        html += '</ul>';
    } else {
         html += '<p class="text-gray-400 text-center mb-6">No recent at-bat data available.</p>';
    }

    html += '<h3 class="font-bold text-lg mb-2 mt-6 text-gray-100">Pitch Mix Vulnerabilities</h3>';
    if (player && abData && abData.pitch_mix_report) {
         const createPitchMixTable = (pitchMixData, title, isFacing) => {
            if (!pitchMixData || pitchMixData.length === 0) {
                return `<div class="mb-4"><h4 class="font-semibold text-md mb-1 text-gray-300">${title}</h4><p class="text-sm text-gray-500">No pitch mix data.</p></div>`;
            }
            let tableHtml = `<div class="mb-4 p-2 ${isFacing ? 'highlight-hand' : ''}"><h4 class="font-semibold text-md mb-1 text-gray-300">${title}</h4>
                <table class="min-w-full text-sm">
                    <thead class="text-xs text-gray-400 uppercase"><tr>
                        <th class="text-left py-1 px-2">Pitch</th>
                        <th class="text-right py-1 px-2">Seen</th>
                        <th class="text-right py-1 px-2">SLG</th>
                        <th class="text-right py-1 px-2">HR</th>
                        <th class="text-right py-1 px-2">Whiff %</th>
                    </tr></thead><tbody class="bg-gray-700/50">`;

            pitchMixData.sort((a, b) => b.Seen - a.Seen);

            for (const pitch of pitchMixData) {
                tableHtml += `<tr>
                    <td class="border-t border-gray-700 py-1 px-2">${pitch.pitch_name}</td>
                    <td class="border-t border-gray-700 py-1 px-2 text-right">${pitch.Seen || 'N/A'}</td>
                    <td class="border-t border-gray-700 py-1 px-2 text-right">${pitch.SLG !== null && !isNaN(pitch.SLG) ? pitch.SLG.toFixed(3) : 'N/A'}</td>
                    <td class="border-t border-gray-700 py-1 px-2 text-right">${pitch.HR !== null ? pitch.HR : 'N/A'}</td>
                    <td class="border-t border-gray-700 py-1 px-2 text-right">${pitch['WHIFF%'] !== null && !isNaN(pitch['WHIFF%']) ? pitch['WHIFF%'].toFixed(1) + '%' : 'N/A'}</td>
                </tr>`;
            }
            tableHtml += `</tbody></table></div>`;
            return tableHtml;
        };

        html += '<div class="grid grid-cols-1 gap-y-4">';
        html += createPitchMixTable(abData.pitch_mix_report.vs_lhp, 'vs. LHP', player.pitcherHand === 'L');
        html += createPitchMixTable(abData.pitch_mix_report.vs_rhp, 'vs. RHP', player.pitcherHand === 'R');
        html += '</div>';

    } else {
        html += '<p class="text-gray-400 text-center mb-6">No pitch mix data available.</p>';
    }

    const scriptedData = appData.dailyBatterScripts[playerName];
    if (scriptedData) {
        html += '<h3 class="font-bold text-lg mb-3 mt-6 text-indigo-300">It\'s Scripted...</h3>';
        html += '<div class="grid grid-cols-2 md:grid-cols-3 gap-4 bg-gray-700/50 p-4 rounded-lg">';
        const outcomes = { 'home_run': 'HR', 'double': '2B', 'single': '1B', 'walk': 'Walk', 'strikeout': 'Strikeout', 'field_out': 'Out' };
        Object.entries(outcomes).forEach(([key, label]) => {
            const value = scriptedData[key] || '0.0%';
            html += `<div class="text-center">
                        <p class="text-sm text-gray-400">${label}</p>
                        <p class="text-xl font-bold text-gray-100">${value}</p>
                     </div>`;
        });
        html += '</div>';
    } else {
         html += '<p class="text-gray-400 text-center mt-6">No scripted data for this player today.</p>';
    }

    contentEl.innerHTML = html;
    document.getElementById('modal-container').style.display = 'flex';
    document.getElementById('batter-stats-modal').style.display = 'flex';
    document.getElementById('pitcher-stats-modal').style.display = 'none';
}

function populatePitcherModal(pitcherName, fromBatterName, fromBatterId) {
    const contentEl = document.getElementById('pitcher-stats-content');
    document.getElementById('pitcher-modal-name').textContent = pitcherName;

    const pitcherData = appData.finalReport.daily_matchups.find(p => p.pitcher_name === pitcherName);
    let html = '';

    if (fromBatterName && fromBatterId) {
         html += `<div class="flex justify-end mb-4"><button class="action-btn swap-to-batter-btn" data-batter-name="${fromBatterName}" data-batter-id="${fromBatterId}">View ${fromBatterName}</button></div>`;
    }

    if (pitcherData && pitcherData.pitcher_stats) {
        const stats = pitcherData.pitcher_stats;
        html += `<div class="space-y-6">
                    <div class="bg-gray-700/50 p-4 rounded-lg text-center">
                        <h4 class="font-semibold text-md text-gray-300 uppercase tracking-wider">Predicted Strikeouts</h4>
                        <p class="text-4xl font-bold text-indigo-400 mt-1">${stats.predicted_strikeouts ? stats.predicted_strikeouts.toFixed(2) : 'N/A'}</p>
                    </div>
                    <div>
                        <h4 class="font-semibold text-lg mb-2 text-gray-100">Recent Performance</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            ${createStatBoxHTML('Last 10 Starts', stats.last_10_starts)}
                            ${createStatBoxHTML('Last 5 Starts', stats.last_5_starts)}
                        </div>
                    </div>
                    ${createPitchMixReportHTML(stats.pitch_mix_report)}
                </div>`;
    } else {
         html += '<p class="text-center text-gray-400">No data available for this pitcher.</p>';
    }

    contentEl.innerHTML = html;
    document.getElementById('modal-container').style.display = 'flex';
    document.getElementById('pitcher-stats-modal').style.display = 'flex';
    document.getElementById('batter-stats-modal').style.display = 'none';
}

function createStatBoxHTML(title, data) {
    if (!data || data.status !== "OK") {
        return `<div class="bg-gray-700/50 p-4 rounded-lg"><h5 class="font-semibold text-gray-300">${title}</h5><p class="text-sm text-gray-500 mt-2">Low Data if this is a lie please let George know</p></div>`;
    }
    return `<div class="bg-gray-700/50 p-4 rounded-lg">
                <h5 class="font-semibold text-gray-300">${title}</h5>
                <ul class="text-sm space-y-1 mt-2">
                    <li><strong>K%:</strong> <span class="font-mono text-base">${(data.k_pct).toFixed(1)}%</span></li>
                    <li><strong>BB%:</strong> <span class="font-mono text-base">${(data.bb_pct).toFixed(1)}%</span></li>
                    <li><strong>HR%:</strong> <span class="font-mono text-base">${(data.hr_pct).toFixed(1)}%</span></li>
                    <li><strong>HR/FB (vL):</strong> <span class="font-mono text-base">${(data.hr_per_fb_vs_l).toFixed(1)}%</span></li>
                    <li><strong>HR/FB (vR):</strong> <span class="font-mono text-base">${(data.hr_per_fb_vs_r).toFixed(1)}%</span></li>
                </ul>
            </div>`;
}

function createPitchMixReportHTML(report) {
    if (!report || report.length === 0) return '';
    let tableRows = report.map(pitch => `
        <tr>
            <td class="py-2 px-2 border-t border-gray-700">${pitch.pitch_name}</td>
            <td class="py-2 px-2 border-t border-gray-700 text-right">${pitch.usage_pct.toFixed(1)}%</td>
            <td class="py-2 px-2 border-t border-gray-700 text-right">${pitch.velocity.toFixed(1)} mph</td>
            <td class="py-2 px-2 border-t border-gray-700 text-right">${pitch.hr_per_pitch_pct ? (pitch.hr_per_pitch_pct).toFixed(1) + '%' : '0.0%'}</td>
            <td class="py-2 px-2 border-t border-gray-700 text-right">${pitch.whiff_pct.toFixed(1)}%</td>
            <td class="py-2 px-2 border-t border-gray-700 text-right">${pitch.slugging.toFixed(3)}</td>
        </tr>
    `).join('');
    return `<div class="mt-4">
                <h4 class="font-semibold text-lg mb-2 text-gray-100">Pitch Mix</h4>
                <div class="overflow-x-auto"><table class="min-w-full text-sm mt-1">
                    <thead class="text-xs text-gray-400 uppercase bg-gray-700/30"><tr>
                        <th class="text-left py-2 px-2">Pitch</th>
                        <th class="text-right py-2 px-2">Usage</th>
                        <th class="text-right py-2 px-2">Velo</th>
                        <th class="text-right py-2 px-2">HR%</th>
                        <th class="text-right py-2 px-2">Whiff%</th>
                        <th class="text-right py-2 px-2">SLG</th>
                    </tr></thead>
                    <tbody class="bg-gray-700/50">${tableRows}</tbody>
                </table></div>
            </div>`;
}

// =================================================================================
// EVENT LISTENERS
// =================================================================================
function setupEventListeners() {
    document.querySelectorAll('.tab-item').forEach(tab => {
        tab.addEventListener('click', () => switchView(tab.dataset.view));
    });

     document.querySelectorAll('.dashboard-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.dashboard-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.dashboard-pane').forEach(p => p.classList.add('hidden'));
            e.currentTarget.classList.add('active');
            document.querySelector(e.currentTarget.dataset.target).classList.remove('hidden');
        });
    });

    document.getElementById('game-ticker-container').addEventListener('click', e => {
        const tickerItem = e.target.closest('.ticker-item');
        if (tickerItem) switchView('focus', { gameId: tickerItem.dataset.gameId });
    });

    document.getElementById('grid-container').addEventListener('click', e => {
        const gameBox = e.target.closest('.game-list-box');
        if (gameBox) switchView('focus', { gameId: gameBox.dataset.gameId });
    });

    document.getElementById('back-to-games-btn').addEventListener('click', () => switchView('grid'));

    // Notebook View Toggle
    const notebookViewSwapBtn = document.getElementById('notebook-view-swap-btn');
    notebookViewSwapBtn.addEventListener('click', () => {
        isNotebookFocusView = !isNotebookFocusView;
        if (isNotebookFocusView) {
            notebookViewSwapBtn.textContent = "View New Model All";
            document.getElementById('focus-notebook-content').classList.remove('hidden');
            document.getElementById('all-notebook-content').classList.add('hidden');
        } else {
            notebookViewSwapBtn.textContent = "View Stacked Model HR";
            document.getElementById('all-notebook-content').classList.remove('hidden');
            document.getElementById('focus-notebook-content').classList.add('hidden');
            document.getElementById('an-game-filter').value = 'all';
            renderAllNotebookTable();
        }
    });

    document.querySelectorAll('#notebook-filters input').forEach(input => {
        input.addEventListener('input', applyNotebookFilters);
    });

    document.getElementById('notebook-table-container').addEventListener('click', e => {
        const header = e.target.closest('.sortable');
        if (header) {
            const key = header.dataset.sort;
            if (notebookSort.key === key) {
                notebookSort.order = notebookSort.order === 'asc' ? 'desc' : 'asc';
            } else {
                notebookSort.key = key;
                notebookSort.order = 'desc';
            }
            applyNotebookFilters();
        }
    });

    document.getElementById('all-notebook-table-container').addEventListener('click', e => {
        const header = e.target.closest('.sortable');
        if (header) {
            const key = header.dataset.sortAll;
            if(key === 'player') return;
            if (allNotebookSort.key === key) {
                allNotebookSort.order = allNotebookSort.order === 'asc' ? 'desc' : 'asc';
            } else {
                allNotebookSort.key = key;
                allNotebookSort.order = 'desc';
            }
            const selectedGame = document.getElementById('an-game-filter').value;
            renderAllNotebookTable(selectedGame);
        }
    });

    document.getElementById('an-game-filter').addEventListener('change', e => {
        allNotebookSort = { key: 'home_run', order: 'desc' }; // Reset sort on filter change
        renderAllNotebookTable(e.target.value);
    });

    document.querySelectorAll('.modal-close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('modal-container').style.display = 'none';
        });
    });
    document.getElementById('stadium-close-btn').addEventListener('click', () => document.getElementById('stadium-modal').style.display = 'none');

    document.body.addEventListener('click', e => {
        const btn = e.target.closest('.stadium-info-btn');
        if (btn && btn.dataset.parkName) {
            document.getElementById('stadium-modal-name').textContent = btn.dataset.parkName;
            let weatherHtml = '<p class="text-gray-400">No weather data available for this game.</p>';
             if (btn.dataset.parkFactor) {
                weatherHtml = `<p class="mb-4"><strong>HR Park Factor:</strong> ${btn.dataset.parkFactor}</p>`
            }
            if (btn.dataset.temp) {
                 weatherHtml += `<div class="space-y-2 text-base">
                            <p><strong>Temperature:</strong> ${btn.dataset.temp}°F</p>
                            <p><strong>Humidity:</strong> ${btn.dataset.humidity}%</p>
                            <p><strong>Wind:</strong> ${btn.dataset.wind} mph</p>
                            <p><strong>Description:</strong> ${btn.dataset.desc}</p>
                        </div>`;
            }
            document.getElementById('stadium-modal-content').innerHTML = weatherHtml;
            document.getElementById('stadium-modal').style.display = 'flex';
        }
    });

    document.getElementById('settings-btn').addEventListener('click', () => {
        document.getElementById('thresh-parkfactor').value = userSettings.highParkFactor;
        document.getElementById('settings-modal').style.display = 'block';
    });
    document.getElementById('settings-close-btn').addEventListener('click', () => document.getElementById('settings-modal').style.display = 'none');
    document.getElementById('settings-cancel-btn').addEventListener('click', () => document.getElementById('settings-modal').style.display = 'none');
    document.getElementById('settings-save-btn').addEventListener('click', () => {
        userSettings.highParkFactor = Number(document.getElementById('thresh-parkfactor').value) || 105;
        localStorage.setItem('similaritySlutSettings', JSON.stringify(userSettings));
        document.getElementById('settings-modal').style.display = 'none';
        renderAll();
    });

    const picksFab = document.getElementById('my-picks-fab');
    const picksSlideout = document.getElementById('my-picks-slideout');
    const slideoutOverlay = document.getElementById('slideout-overlay');
    const closePicksBtn = document.getElementById('my-picks-close-btn');

    picksFab.addEventListener('click', () => {
        picksSlideout.classList.add('open');
        slideoutOverlay.classList.remove('hidden');
        slideoutOverlay.style.opacity = '1';
    });

    const closeSlideout = () => {
        picksSlideout.classList.remove('open');
        slideoutOverlay.style.opacity = '0';
        setTimeout(() => slideoutOverlay.classList.add('hidden'), 300);
    };
    closePicksBtn.addEventListener('click', closeSlideout);
    slideoutOverlay.addEventListener('click', closeSlideout);

    document.getElementById('zxm-button').addEventListener('click', () => {
        localStorage.removeItem('similaritySlutAuth');
        location.reload();
    });

    addPlayerNameClickListeners(document.body);

    document.body.addEventListener('click', e => {
        const pitcherBtn = e.target.closest('.pitcher-name-btn');
        if (pitcherBtn) {
            populatePitcherModal(pitcherBtn.dataset.pitcherName);
        }
        const swapToPitcherBtn = e.target.closest('.swap-to-pitcher-btn');
        if (swapToPitcherBtn) {
            populatePitcherModal(swapToPitcherBtn.dataset.pitcherName, swapToPitcherBtn.dataset.batterName, swapToPitcherBtn.dataset.batterId);
        }
        const swapToBatterBtn = e.target.closest('.swap-to-batter-btn');
        if (swapToBatterBtn) {
            populateBatterModal(swapToBatterBtn.dataset.batterName, swapToBatterBtn.dataset.batterId);
        }
    });

    // My Picks Actions
    document.getElementById('copy-picks-btn').addEventListener('click', copyPicksToClipboard);
    document.getElementById('download-picks-btn').addEventListener('click', downloadPicks);
    document.getElementById('remove-all-picks-btn').addEventListener('click', removeAllPicks);

    // Game Card Sorting
    document.getElementById('main-content').addEventListener('click', e => {
        const header = e.target.closest('.card .sortable');
        if (header) {
            const card = e.target.closest('.card');
            const gameId = card.id.replace('game-', '');
            const details = e.target.closest('details');
            const pitcherName = details.querySelector('.pitcher-name-btn').dataset.pitcherName;
            const sortKey = `${gameId}-${pitcherName}`;
            const key = header.dataset.sort;

            if (!gameCardSorts[sortKey]) {
                gameCardSorts[sortKey] = { key: 'recentProbValue', order: 'desc' };
            }

            if (gameCardSorts[sortKey].key === key) {
                gameCardSorts[sortKey].order = gameCardSorts[sortKey].order === 'asc' ? 'desc' : 'asc';
            } else {
                gameCardSorts[sortKey].key = key;
                gameCardSorts[sortKey].order = 'desc';
            }

            const game = allGamesData.find(g => g.id === gameId);
            if (game) {
                card.outerHTML = buildGameCardHTML(game);
                const newCard = document.getElementById(card.id);
                updateStarButtonsInScope(newCard);
                addPlayerNameClickListeners(newCard);
            }
        }
    });
}

function addPlayerNameClickListeners(scope) {
     scope.querySelectorAll('.player-name-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const playerName = e.currentTarget.dataset.playerName;
            const batterId = e.currentTarget.dataset.batterId;
            if (batterId) {
                populateBatterModal(playerName, batterId);
            }
        });
    });
}

// =================================================================================
// VIEW SWITCHING
// =================================================================================
function switchView(view, params = {}) {
    ['dashboard-container', 'notebook-container', 'grid-container', 'focus-view-container'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
    document.querySelectorAll('.tab-item').forEach(tab => tab.classList.remove('active'));
    const activeTab = document.querySelector(`.tab-item[data-view="${view === 'focus' ? 'grid' : view}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
        const slider = document.getElementById('tab-bar-slider');
        slider.style.left = `${activeTab.offsetLeft}px`;
        slider.style.width = `${activeTab.offsetWidth}px`;
    }

    if (view === 'dashboard') document.getElementById('dashboard-container').classList.remove('hidden');
    if (view === 'notebook') {
        document.getElementById('notebook-container').classList.remove('hidden');
        applyNotebookFilters();
    }
    if (view === 'grid') document.getElementById('grid-container').classList.remove('hidden');
    if (view === 'focus') {
        document.getElementById('focus-view-container').classList.remove('hidden');
        renderFocusView(params.gameId);
    }
}

// =================================================================================
// STAR/PICK MANAGEMENT
// =================================================================================
function togglePick(playerName, gameTitle) {
    const pickIndex = myPicks.findIndex(p => p.name === playerName && p.gameTitle === gameTitle);
    if (pickIndex > -1) {
        myPicks.splice(pickIndex, 1);
    } else {
        const player = masterPlayerList.find(p => p.name === playerName && p.gameTitle === gameTitle);
        if (player) myPicks.push(player);
    }
    savePicks();
    updatePicksUI();
}

function loadPicks() {
    myPicks = JSON.parse(localStorage.getItem('mySlutPicks')) || [];
}

function savePicks() {
    localStorage.setItem('mySlutPicks', JSON.stringify(myPicks));
}

function updatePicksUI() {
    updateStarButtonsInScope(document.body);
    renderMyPicksSlideout();
    updatePicksBadge();
}

function updateStarButtonsInScope(scope) {
    scope.querySelectorAll('.star-btn').forEach(btn => {
        const isStarred = myPicks.some(p => p.name === btn.dataset.playerName && p.gameTitle === btn.dataset.gameTitle);
        btn.classList.toggle('starred', isStarred);
    });
}

function updatePicksBadge() {
    const badge = document.getElementById('my-picks-badge');
    const count = myPicks.length;
    if (count > 0) {
        badge.textContent = count;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

function renderMyPicksSlideout() {
    const container = document.getElementById('my-picks-slideout-content');
    if (myPicks.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 p-8">You haven\'t picked any sluts yet. Click the star next to a player\'s name to add them.</p>';
        document.getElementById('my-picks-footer').style.display = 'none';
        return;
    }
    document.getElementById('my-picks-footer').style.display = 'flex';

    container.innerHTML = myPicks.map(p => {
        return `<div class="p-4 border-b border-gray-700 flex justify-between items-center">
                    <div>
                        <p class="font-bold">${p.name}</p>
                        <p class="text-sm text-gray-400">${p.gameTitle}</p>
                    </div>
                    <button class="remove-pick-btn text-red-500 hover:text-red-400" data-player-name="${p.name}" data-game-title="${p.gameTitle}">&times;</button>
                </div>`;
    }).join('');

    container.querySelectorAll('.remove-pick-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            togglePick(btn.dataset.playerName, btn.dataset.gameTitle);
        });
    });
}

function copyPicksToClipboard() {
    const textToCopy = myPicks.map(p => `${p.name} - ${p.gameTitle}`).join('\n');
    const textArea = document.createElement('textarea');
    textArea.value = textToCopy;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);

    const feedback = document.getElementById('copy-feedback');
    feedback.classList.remove('hidden');
    feedback.classList.add('show');
    setTimeout(() => {
        feedback.classList.remove('show');
        setTimeout(() => feedback.classList.add('hidden'), 500);
    }, 1500);
}

function downloadPicks() {
    const textToDownload = myPicks.map(p => `${p.name} - ${p.gameTitle}`).join('\n');
    const blob = new Blob([textToDownload], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my_slut_picks.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function removeAllPicks() {
    myPicks = [];
    savePicks();
    updatePicksUI();
}

document.body.addEventListener('click', e => {
    const starBtn = e.target.closest('.star-btn');
    if (starBtn) {
        e.stopPropagation();
        togglePick(starBtn.dataset.playerName, starBtn.dataset.gameTitle);
    }
});


// =================================================================================
// UTILITY FUNCTIONS
// =================================================================================
function loadSettings() {
    const saved = localStorage.getItem('similaritySlutSettings');
    if (saved) {
        userSettings = { ...userSettings, ...JSON.parse(saved) };
    }
}

function renderAll() {
    renderDashboard();
    renderAllGamesView();
    renderGameTicker();
    applyNotebookFilters();
    updatePicksUI();
}

// =================================================================================
// PAGE LOAD AND AUTHENTICATION
// =================================================================================
document.addEventListener('DOMContentLoaded', () => {
    const passwordModal = document.getElementById('password-modal');
    const protectedContent = document.getElementById('protected-content');
    const passwordForm = document.getElementById('password-form');
    const passwordInput = document.getElementById('password-input');
    const passwordError = document.getElementById('password-error');

    const correctPassword = "zxm";
    const authVersion = "v1.5";

    const attemptLogin = async () => {
        // Show a loading indicator in the modal while data fetches
        passwordModal.innerHTML = `<div class="text-white text-center">Loading Report Data...</div>`;
        const success = await fetchData();
        if (success) {
            localStorage.setItem('similaritySlutAuth', authVersion);
            passwordModal.style.display = 'none';
            protectedContent.classList.remove('hidden');
            initializePage();
        }
        // If fetch fails, an error is already shown on the page.
    };

    if (localStorage.getItem('similaritySlutAuth') === authVersion) {
        attemptLogin();
    } else {
        passwordInput.focus();
        passwordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (passwordInput.value === correctPassword) {
                passwordError.classList.add('hidden');
                attemptLogin();
            } else {
                passwordError.classList.remove('hidden');
                passwordInput.value = '';
                passwordInput.focus();
            }
        });
    }
});
" in the immersive artifact "scripts_js". what should i change the basepath 
