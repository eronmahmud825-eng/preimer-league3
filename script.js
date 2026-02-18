// script.js - FIXED: suspension counts player's TEAM matches only, not global GW
const ADMIN_PASSWORD = "123321";
const teamsList = ["MANCHESTER CITY", "REAL MADRID", "BAYER MUNICH"];

/* ==========================================================
   SUSPENSION LOGIC — team-match countdown (fully automatic)

   Stored in Firestore "playerSuspensions" (1 doc per player):
     team, player,
     activeYellows   — yellows since last reset (0,1,2,3)
     yellowBanLeft   — how many of THIS TEAM'S matches left to miss (yellow ban)
     redBanLeft      — how many of THIS TEAM'S matches left to miss (red ban)

   KEY FIX:
   • Bans count only matches where the player's TEAM plays
   • Bayern vs Real Madrid does NOT reduce Haaland's (Man City) ban
   • Every time a match is saved, decrementBansForMatch(team1, team2) runs
     and reduces banLeft only for players from those two teams
   • When banLeft hits 0 → player is eligible → yellows reset automatically
   ========================================================== */

/* ---------- Helpers ---------- */
function docToMatch(doc) {
    const d = doc.data();
    return {
        id: doc.id,
        team1: d.team1,
        team2: d.team2,
        score1: Number(d.score1),
        score2: Number(d.score2),
        date: d.date || "",
        gameNumber: Number(d.gameNumber) || 0,
        savedAt: d.savedAt || ""
    };
}

function docToSuspension(doc) {
    const d = doc.data();
    return {
        id: doc.id,
        team: d.team,
        player: d.player,
        activeYellows: Number(d.activeYellows) || 0,
        yellowBanLeft: Number(d.yellowBanLeft) || 0,
        redBanLeft: Number(d.redBanLeft) || 0
    };
}

/* ---------- Match helpers ---------- */
function applyMatchToTeams(match, teams) {
    const a = teams.find(t => t.name === match.team1);
    const b = teams.find(t => t.name === match.team2);
    if (!a || !b) return;
    a.game++;
    b.game++;
    a.gf += match.score1;
    a.ga += match.score2;
    b.gf += match.score2;
    b.ga += match.score1;
    if (match.score1 > match.score2) { a.win++;
        b.lose++; } else if (match.score1 < match.score2) { b.win++;
        a.lose++; } else { a.draw++;
        b.draw++; }
}

function computeTeamsFromMatches(matches) {
    const teams = teamsList.map(name => ({
        name,
        game: 0,
        win: 0,
        lose: 0,
        draw: 0,
        ga: 0,
        gf: 0,
        diff: 0,
        point: 0
    }));
    matches.forEach(m => applyMatchToTeams(m, teams));
    teams.forEach(t => { t.diff = t.gf - t.ga;
        t.point = t.win * 3 + t.draw; });
    teams.sort((x, y) =>
        y.point !== x.point ? y.point - x.point :
        y.diff !== x.diff ? y.diff - x.diff :
        (y.gf || 0) - (x.gf || 0)
    );
    return teams;
}

function getTotalMatchCount(matches) {
    const nums = matches.map(m => m.gameNumber).filter(n => n > 0);
    return nums.length > 0 ? Math.max(...nums) : matches.length;
}

/* ==========================================================
   KEY FUNCTION: called every time a match is saved.
   Decrements ban counters ONLY for players from the two teams
   that just played. Other teams are not affected.
   ========================================================== */
function decrementBansForMatch(team1, team2) {
    if (!window.db) return Promise.resolve();
    return window.db.collection("playerSuspensions")
        .where("team", "in", [team1, team2])
        .get()
        .then(snap => {
            const batch = window.db.batch();
            let changed = false;
            snap.forEach(doc => {
                const d = doc.data();
                let yellowBanLeft = Number(d.yellowBanLeft) || 0;
                let redBanLeft = Number(d.redBanLeft) || 0;
                let activeYellows = Number(d.activeYellows) || 0;
                let updated = false;

                if (redBanLeft > 0) {
                    redBanLeft -= 1;
                    updated = true;
                    if (redBanLeft === 0) activeYellows = 0; // red ban done → reset yellows
                } else if (yellowBanLeft > 0) {
                    yellowBanLeft -= 1;
                    updated = true;
                    if (yellowBanLeft === 0) activeYellows = 0; // yellow ban done → reset yellows
                }

                if (updated) {
                    batch.update(doc.ref, { yellowBanLeft, redBanLeft, activeYellows });
                    changed = true;
                }
            });
            return changed ? batch.commit() : Promise.resolve();
        });
}

/* ---------- Render League Table ---------- */
function renderLeagueTable(matches) {
    const tbody = document.querySelector("#leagueTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    computeTeamsFromMatches(matches).forEach((t, idx) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td data-label="Rank"><span class="value">${idx+1}</span></td>
            <td data-label="Team"><span class="value">${t.name}</span></td>
            <td data-label="Game"><span class="value">${t.game}</span></td>
            <td data-label="Win"><span class="value">${t.win}</span></td>
            <td data-label="Lose"><span class="value">${t.lose}</span></td>
            <td data-label="Draw"><span class="value">${t.draw}</span></td>
            <td data-label="GA"><span class="value">${t.ga}</span></td>
            <td data-label="GF"><span class="value">${t.gf}</span></td>
            <td data-label="Diff"><span class="value">${t.diff}</span></td>
            <td data-label="Point"><span class="value">${t.point}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

/* ---------- Render History ---------- */
function renderHistoryList(matches) {
    const tbody = document.querySelector("#historyTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    matches.slice().reverse().forEach(m => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td data-label="GW"><span class="value">GW${m.gameNumber || '-'}</span></td>
            <td data-label="Date"><span class="value">${m.date}</span></td>
            <td data-label="Match"><span class="value">${m.team1} vs ${m.team2}</span></td>
            <td data-label="Score"><span class="value">${m.score1}-${m.score2}</span></td>
            <td data-label="Action"><span class="value"><button class="delete-btn" data-id="${m.id}">🗑 Delete</button></span></td>
        `;
        tbody.appendChild(tr);
    });
    tbody.querySelectorAll(".delete-btn").forEach(btn =>
        btn.addEventListener("click", () => onDeleteMatchClick(btn.getAttribute("data-id")))
    );
}

/* ---------- Render Card Warning Table ---------- */
function renderCardTable(suspensions) {
    const tbody = document.querySelector("#cardTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (suspensions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#888;padding:16px;">No card warnings yet</td></tr>`;
        return;
    }

    suspensions.forEach(susp => {
                const isBannedRed = susp.redBanLeft > 0;
                const isBannedYellow = susp.yellowBanLeft > 0;

                let badge = "";
                if (isBannedRed) {
                    badge = `<span style="background:#c0392b;color:#fff;padding:2px 8px;border-radius:10px;font-size:0.76em;margin-left:6px;vertical-align:middle;">🔴 BANNED — ${susp.redBanLeft} match(es) left</span>`;
                } else if (isBannedYellow) {
                    badge = `<span style="background:#b8860b;color:#fff;padding:2px 8px;border-radius:10px;font-size:0.76em;margin-left:6px;vertical-align:middle;">🟡 BANNED — ${susp.yellowBanLeft} match left</span>`;
                } else if (susp.activeYellows === 2) {
                    badge = `<span style="background:#5a4200;color:#ffe;padding:2px 8px;border-radius:10px;font-size:0.76em;margin-left:6px;vertical-align:middle;">⚠️ 1 more = ban</span>`;
                }

                const tr = document.createElement("tr");
                tr.innerHTML = `
            <td data-label="Team"><span class="value">${susp.team}</span></td>
            <td data-label="Player"><span class="value">${susp.player}${badge}</span></td>
            <td data-label="🟡 Yellows"><span class="value" style="${susp.activeYellows >= 3 ? 'color:#f1c40f;font-weight:bold;' : ''}">${susp.activeYellows}</span></td>
            <td data-label="Ban Left"><span class="value">
                ${isBannedRed ? `🔴 ${susp.redBanLeft} team match(es)` : isBannedYellow ? `🟡 ${susp.yellowBanLeft} team match` : '✅ Eligible'}
            </span></td>
            <td data-label="Actions" style="white-space:nowrap;">
                <button class="edit-btn" data-id="${susp.id}">✏️ Edit</button>
                <button class="delete-btn" data-id="${susp.id}" data-player="${susp.player}">🗑 Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    tbody.querySelectorAll(".edit-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const susp = suspensions.find(s => s.id === btn.getAttribute("data-id"));
            if (susp) openEditSuspensionModal(susp);
        });
    });
    tbody.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", () =>
            deleteSuspension(btn.getAttribute("data-id"), btn.getAttribute("data-player"))
        );
    });
}

/* ---------- Edit Suspension Modal ---------- */
function openEditSuspensionModal(susp) {
    let modal = document.getElementById("editSuspModal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "editSuspModal";
        modal.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;z-index:9999;`;
        modal.innerHTML = `
            <div style="background:#1e2a3a;padding:24px;border-radius:14px;min-width:320px;color:#fff;box-shadow:0 8px 40px #000c;">
                <h3 style="margin-top:0;">✏️ Edit Suspension</h3>
                <p id="editSuspLabel" style="color:#aaa;margin:0 0 14px;font-size:0.9em;"></p>
                <label style="display:block;margin:10px 0;font-size:0.9em;">🟡 Active Yellows (0–3):
                    <input id="editActiveYellow" type="number" min="0" max="3" style="margin-left:8px;width:55px;padding:5px;border-radius:6px;border:none;background:#2d3f55;color:#fff;"/>
                </label>
                <label style="display:block;margin:10px 0;font-size:0.9em;">🟡 Yellow Ban Matches Left (0 or 1):
                    <input id="editYellowBanLeft" type="number" min="0" max="1" style="margin-left:8px;width:55px;padding:5px;border-radius:6px;border:none;background:#2d3f55;color:#fff;"/>
                </label>
                <label style="display:block;margin:10px 0;font-size:0.9em;">🔴 Red Ban Matches Left (0–3):
                    <input id="editRedBanLeft" type="number" min="0" max="3" style="margin-left:8px;width:55px;padding:5px;border-radius:6px;border:none;background:#2d3f55;color:#fff;"/>
                </label>
                <p style="color:#888;font-size:0.8em;margin:8px 0 16px;">
                    ℹ️ These count <strong>only this player's team matches</strong> remaining.<br/>
                    Other teams playing does NOT reduce these numbers.
                </p>
                <div style="display:flex;gap:10px;">
                    <button id="saveEditSuspBtn" style="background:#27ae60;color:#fff;border:none;padding:9px 18px;border-radius:8px;cursor:pointer;">💾 Save</button>
                    <button id="cancelEditSuspBtn" style="background:#555;color:#fff;border:none;padding:9px 18px;border-radius:8px;cursor:pointer;">Cancel</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
    }
    document.getElementById("editSuspLabel").textContent = `${susp.player} (${susp.team})`;
    document.getElementById("editActiveYellow").value = susp.activeYellows;
    document.getElementById("editYellowBanLeft").value = susp.yellowBanLeft;
    document.getElementById("editRedBanLeft").value = susp.redBanLeft;
    modal.style.display = "flex";

    document.getElementById("cancelEditSuspBtn").onclick = () => { modal.style.display = "none"; };
    document.getElementById("saveEditSuspBtn").onclick = () => {
        if (!window.db) return;
        window.db.collection("playerSuspensions").doc(susp.id).update({
            activeYellows: Number(document.getElementById("editActiveYellow").value) || 0,
            yellowBanLeft: Number(document.getElementById("editYellowBanLeft").value) || 0,
            redBanLeft: Number(document.getElementById("editRedBanLeft").value) || 0
        }).then(() => { modal.style.display = "none"; alert("✅ Updated!"); })
          .catch(err => { console.error(err); alert("❌ Error updating"); });
    };
}

function deleteSuspension(id, player) {
    const pass = prompt(`Admin password to delete warnings for ${player}:`);
    if (pass !== ADMIN_PASSWORD) { alert("❌ Wrong password"); return; }
    if (!window.db) return;
    window.db.collection("playerSuspensions").doc(id).delete()
        .then(() => alert(`✅ Deleted warnings for ${player}`))
        .catch(err => { console.error(err); alert("❌ Error"); });
}

/* ---------- Get or create player suspension doc ---------- */
function getOrCreatePlayerSusp(team, player) {
    return window.db.collection("playerSuspensions")
        .where("team", "==", team).where("player", "==", player).get()
        .then(snap => {
            if (!snap.empty) {
                const doc = snap.docs[0];
                const d = doc.data();
                return { id: doc.id, team, player,
                    activeYellows: Number(d.activeYellows) || 0,
                    yellowBanLeft: Number(d.yellowBanLeft) || 0,
                    redBanLeft: Number(d.redBanLeft) || 0 };
            } else {
                return window.db.collection("playerSuspensions").add(
                    { team, player, activeYellows: 0, yellowBanLeft: 0, redBanLeft: 0 }
                ).then(ref => ({ id: ref.id, team, player, activeYellows: 0, yellowBanLeft: 0, redBanLeft: 0 }));
            }
        });
}

/* ---------- Save Card (radio button, called from matchweek) ---------- */
function saveCardWarning(matchTeam1, matchTeam2) {
    const team = document.getElementById("cardTeam").value;
    const player = document.getElementById("playerSelect").value;
    const cardTypeRadio = document.querySelector('input[name="cardType"]:checked');

    if (!team || !player) { alert("❌ Please select team and player"); return; }
    if (!cardTypeRadio) { alert("❌ Please select Yellow Card or Red Card"); return; }
    if (team !== matchTeam1 && team !== matchTeam2) {
        alert(`❌ Can only add cards for ${matchTeam1} or ${matchTeam2} players in this match`);
        return;
    }
    if (!window.db) { alert("Database not initialized"); return; }

    const cardType = cardTypeRadio.value;

    getOrCreatePlayerSusp(team, player).then(susp => {
        let { activeYellows, yellowBanLeft, redBanLeft } = susp;

        if (cardType === "yellow") {
            activeYellows += 1;
            if (activeYellows >= 3) {
                yellowBanLeft = 1; // miss 1 of THIS TEAM's next matches
            }
        } else {
            // Red card → miss next 3 of THIS TEAM's matches
            redBanLeft = 3;
            activeYellows = 0;
            yellowBanLeft = 0;
        }

        return window.db.collection("playerSuspensions").doc(susp.id).update({
            activeYellows, yellowBanLeft, redBanLeft
        });
    }).then(() => {
        const msg = cardType === "yellow"
            ? `🟡 Yellow card added for ${player}${document.querySelector('input[name="cardType"]:checked') && (() => { getOrCreatePlayerSusp(document.getElementById("cardTeam").value, player); return ""; })() || ""}`
            : `🔴 Red card added for ${player} — banned for next 3 ${team} matches`;
        alert(`✅ ${cardType === "red" ? `🔴 Red card — ${player} banned for next 3 ${team} matches` : `🟡 Yellow card added for ${player}`}`);
        document.getElementById("cardTeam").value = "";
        document.getElementById("playerSelect").innerHTML = '<option value="">Select Player</option>';
        document.querySelectorAll('input[name="cardType"]').forEach(r => r.checked = false);
    }).catch(err => { console.error(err); alert("❌ Error saving card"); });
}

/* ---------- Load Players for Team ---------- */
function loadPlayersForTeam(selectedTeam) {
    const playerSelect = document.getElementById("playerSelect");
    if (!playerSelect || !window.db) return;
    playerSelect.innerHTML = '<option value="">Select Player</option>';
    if (!selectedTeam) return;
    window.db.collection("players").where("team", "==", selectedTeam).get()
        .then(snap => snap.forEach(doc => {
            const opt = document.createElement("option");
            opt.value = doc.data().player; opt.textContent = doc.data().player;
            playerSelect.appendChild(opt);
        }))
        .catch(err => console.error("Error loading players:", err));
}

/* ---------- Check Games ---------- */
function checkGameEligibility() {
    const team1 = document.getElementById("checkTeam1").value;
    const team2 = document.getElementById("checkTeam2").value;
    if (!team1 || !team2 || team1 === team2) { alert("❌ Please select two different teams"); return; }
    if (!window.db) { alert("Database not initialized"); return; }

    window.db.collection("playerSuspensions").get().then(snap => {
        const suspended = [];
        const warnings = [];

        snap.forEach(doc => {
            const s = docToSuspension(doc);
            if (s.team !== team1 && s.team !== team2) return;

            if (s.redBanLeft > 0) {
                suspended.push({ s, type: "red" });
            } else if (s.yellowBanLeft > 0) {
                suspended.push({ s, type: "yellow" });
            } else if (s.activeYellows === 2) {
                warnings.push(s);
            }
        });

        const resultDiv = document.getElementById("checkResult");
        const bannedList = document.getElementById("bannedList");
        let html = "";

        if (suspended.length === 0 && warnings.length === 0) {
            html += `<div style="background:#0a1f10;border-left:4px solid #2ecc71;padding:14px;border-radius:8px;">
                <span style="color:#2ecc71;font-size:1.05em;font-weight:bold;">✅ All players eligible for this match!</span>
            </div>`;
        }

        if (suspended.length > 0) {
            html += `<h4 style="color:#e74c3c;margin:0 0 8px;">⛔ Suspended Players:</h4>`;
            suspended.forEach(({ s, type }) => {
                if (type === "red") {
                    html += `
                    <div style="background:#1e0a0a;border-left:4px solid #e74c3c;padding:12px;margin:6px 0;border-radius:8px;">
                        <strong>${s.player}</strong> <span style="color:#999;font-size:0.85em;">(${s.team})</span><br/>
                        <span style="font-size:0.92em;">🔴 Red card ban — <strong>${s.redBanLeft} ${s.team} match(es) still to miss</strong></span><br/>
                        <span style="font-size:0.82em;color:#aaa;">⚠️ Only ${s.team} games count down this ban. Other teams' matches do NOT.</span><br/>
                        <span style="font-size:0.82em;color:#2ecc71;">✅ Eligible again after ${s.redBanLeft} more ${s.team} match(es)</span>
                    </div>`;
                } else {
                    html += `
                    <div style="background:#1a1400;border-left:4px solid #f1c40f;padding:12px;margin:6px 0;border-radius:8px;">
                        <strong>${s.player}</strong> <span style="color:#999;font-size:0.85em;">(${s.team})</span><br/>
                        <span style="font-size:0.92em;">🟡 3 yellow cards — <strong>banned for ${s.yellowBanLeft} more ${s.team} match</strong></span><br/>
                        <span style="font-size:0.82em;color:#2ecc71;">✅ Yellow count resets automatically after ban served</span>
                    </div>`;
                }
            });
        }

        if (warnings.length > 0) {
            html += `<h4 style="color:#f39c12;margin:14px 0 8px;">⚠️ Yellow Card Warning:</h4>`;
            warnings.forEach(s => {
                html += `
                <div style="background:#191100;border-left:4px solid #f39c12;padding:10px;margin:6px 0;border-radius:8px;">
                    <strong>${s.player}</strong> <span style="color:#999;font-size:0.85em;">(${s.team})</span><br/>
                    <span style="font-size:0.92em;">🟡 ${s.activeYellows}/3 yellows — <strong>1 more = 1 match ban!</strong></span>
                </div>`;
            });
        }

        bannedList.innerHTML = html;
        resultDiv.style.display = "block";
    }).catch(err => { console.error(err); alert("❌ Error checking eligibility"); });
}

/* ---------- Match Week ---------- */
let _matchTeam1 = "";
let _matchTeam2 = "";

function setupMatchWeek() {
    const saveBtn = document.getElementById("saveMatchBtn");
    const addCardBtn = document.getElementById("addCardBtn");
    const okBtn = document.getElementById("okBtn");
    const cardTeamSelect = document.getElementById("cardTeam");

    if (saveBtn) {
        saveBtn.addEventListener("click", () => {
            const pass = document.getElementById("adminPass").value || "";
            if (pass !== ADMIN_PASSWORD) { alert("❌ Wrong password"); return; }

            const team1 = document.getElementById("team1").value;
            const team2 = document.getElementById("team2").value;
            const score1 = Number(document.getElementById("score1").value);
            const score2 = Number(document.getElementById("score2").value);
            const date = document.getElementById("matchDate").value;

            if (!team1 || !team2 || team1 === team2) { alert("❌ Choose two different teams"); return; }
            if (!date) { alert("❌ Choose a date"); return; }
            if (!Number.isFinite(score1) || !Number.isFinite(score2)) { alert("❌ Enter valid scores"); return; }
            if (!window.db) { alert("Database not initialized"); return; }

            window.db.collection("matches").get().then(snap => {
                const gameNumber = snap.size + 1;
                return window.db.collection("matches").add({
                    team1, team2, score1, score2, date, gameNumber,
                    savedAt: new Date().toLocaleString()
                }).then(() => {
                    // ✅ CRITICAL FIX: decrement bans only for these two teams' players
                    return decrementBansForMatch(team1, team2).then(() => ({ team1, team2, gameNumber }));
                });
            }).then(({ team1, team2, gameNumber }) => {
                _matchTeam1 = team1;
                _matchTeam2 = team2;

                alert(`✅ Match #${gameNumber} saved`);
                document.getElementById("team1").value = "";
                document.getElementById("team2").value = "";
                document.getElementById("score1").value = "";
                document.getElementById("score2").value = "";
                document.getElementById("matchDate").value = "";
                document.getElementById("adminPass").value = "";
                document.getElementById("matchForm").style.display = "none";
                document.getElementById("cardForm").style.display = "block";

                const gwLabel = document.getElementById("currentGWLabel");
                if (gwLabel) gwLabel.textContent = `Match #${gameNumber}: ${team1} vs ${team2} — add cards from this match:`;

                // Only show the two teams that played in card dropdown
                const cardTeamEl = document.getElementById("cardTeam");
                if (cardTeamEl) {
                    cardTeamEl.innerHTML = `
                        <option value="">Select Team</option>
                        <option value="${team1}">${team1}</option>
                        <option value="${team2}">${team2}</option>
                    `;
                }
            }).catch(err => { console.error(err); alert("❌ Error saving match"); });
        });
    }

    if (cardTeamSelect) {
        cardTeamSelect.addEventListener("change", e => loadPlayersForTeam(e.target.value));
    }
    if (addCardBtn) {
        addCardBtn.addEventListener("click", () => saveCardWarning(_matchTeam1, _matchTeam2));
    }
    if (okBtn) {
        okBtn.addEventListener("click", () => {
            alert("✅ All data saved!");
            window.location.href = "index.html";
        });
    }
}

/* ---------- Admin Panel ---------- */
function setupAdminPanel() {
    const loginBtn = document.getElementById("loginBtn");
    const addPlayerBtn = document.getElementById("addPlayerBtn");

    if (loginBtn) {
        loginBtn.addEventListener("click", () => {
            const password = document.getElementById("adminPassword").value;
            if (password === ADMIN_PASSWORD) {
                document.getElementById("passwordForm").style.display = "none";
                document.getElementById("adminContent").style.display = "block";
                loadPlayersTable();
            } else {
                alert("❌ Wrong password");
            }
        });
    }

    if (addPlayerBtn) {
        addPlayerBtn.addEventListener("click", () => {
            const team = document.getElementById("adminTeam").value;
            const player = document.getElementById("adminPlayer").value;
            if (!team || !player) { alert("❌ Please select team and enter player name"); return; }
            if (!window.db) { alert("Database not initialized"); return; }
            window.db.collection("players").add({ team, player, addedAt: new Date().toLocaleString() })
                .then(() => {
                    alert("✅ Player added");
                    document.getElementById("adminTeam").value = "";
                    document.getElementById("adminPlayer").value = "";
                    loadPlayersTable();
                }).catch(err => { console.error(err); alert("❌ Error adding player"); });
        });
    }
}

function loadPlayersTable() {
    const tbody = document.querySelector("#playersTable tbody");
    if (!tbody || !window.db) return;
    window.db.collection("players").get().then(snapshot => {
        tbody.innerHTML = "";
        snapshot.forEach(doc => {
            const data = doc.data();
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td data-label="Team">${data.team}</td>
                <td data-label="Player">${data.player}</td>
                <td data-label="Action"><button class="delete-btn" onclick="deletePlayer('${doc.id}')">Delete</button></td>
            `;
            tbody.appendChild(tr);
        });
    }).catch(err => console.error(err));
}

window.deletePlayer = function(playerId) {
    const pass = prompt("Enter admin password to delete:");
    if (pass !== ADMIN_PASSWORD) { alert("❌ Wrong password"); return; }
    if (!window.db) return;
    window.db.collection("players").doc(playerId).delete()
        .then(() => { alert("✅ Player deleted"); loadPlayersTable(); })
        .catch(err => { console.error(err); alert("❌ Error deleting player"); });
};

function onDeleteMatchClick(docId) {
    const pass = prompt("Enter admin password to delete:");
    if (pass !== ADMIN_PASSWORD) { alert("❌ Wrong password"); return; }
    if (!window.db) return;
    window.db.collection("matches").doc(docId).delete()
        .then(() => alert("✅ Match deleted"))
        .catch(err => { console.error(err); alert("❌ Error deleting match"); });
}

function setupCheckGames() {
    const checkBtn = document.getElementById("checkBtn");
    if (checkBtn) checkBtn.addEventListener("click", checkGameEligibility);
}

/* ---------- Real-time Listeners ---------- */
function startRealtimeListeners() {
    if (!window.db) { console.error("db not available"); return; }

    window.db.collection("matches").onSnapshot(snapshot => {
        const matches = [];
        snapshot.forEach(doc => matches.push(docToMatch(doc)));
        renderLeagueTable(matches);
        renderHistoryList(matches);
        loadEncounters(matches);
    }, err => console.error("Matches error:", err));

    window.db.collection("playerSuspensions").onSnapshot(snapshot => {
        const suspensions = [];
        snapshot.forEach(doc => suspensions.push(docToSuspension(doc)));
        renderCardTable(suspensions);
    }, err => console.error("Suspensions error:", err));
}

/* ---------- Encounters ---------- */
function loadEncounters(matches = null) {
    const tbody = document.querySelector("#encountersTable tbody");
    if (!tbody || !matches) return;
    const results = {};
    matches.forEach(m => {
        const t1 = m.team1, t2 = m.team2;
        if (!results[t1]) results[t1] = {};
        if (!results[t2]) results[t2] = {};
        if (!results[t1][t2]) results[t1][t2] = { wins: 0, losses: 0 };
        if (!results[t2][t1]) results[t2][t1] = { wins: 0, losses: 0 };
        if (m.score1 > m.score2) { results[t1][t2].wins++; results[t2][t1].losses++; }
        else if (m.score2 > m.score1) { results[t2][t1].wins++; results[t1][t2].losses++; }
    });
    tbody.innerHTML = "";
    Object.keys(results).forEach(team => {
        Object.keys(results[team]).forEach(opp => {
            const { wins, losses } = results[team][opp];
            if (wins > 0 || losses > 0) {
                const tr = document.createElement("tr");
                tr.innerHTML = `<td>${team}</td><td>${opp}</td><td>${wins}</td><td>${losses}</td>`;
                tbody.appendChild(tr);
            }
        });
    });
}

/* ---------- Initialize ---------- */
document.addEventListener("DOMContentLoaded", () => {
    setupMatchWeek();
    setupAdminPanel();
    setupCheckGames();
    setTimeout(() => {
        if (window.db) startRealtimeListeners();
        else console.error("Database not available");
    }, 1000);
});