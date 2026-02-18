const table = document.getElementById("table");
let teams = JSON.parse(localStorage.getItem("leagueTeams"));

teams.sort((a, b) => b.pts - a.pts);

let html = `<tr>
<th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th>
</tr>`;

teams.forEach((t, i) => {
    html += `<tr>
    <td>${i+1}</td>
    <td>${t.name}</td>
    <td>${t.played}</td>
    <td>${t.win}</td>
    <td>${t.draw}</td>
    <td>${t.lose}</td>
    <td>${t.gf}</td>
    <td>${t.ga}</td>
    <td>${t.gf - t.ga}</td>
    <td>${t.pts}</td>
    </tr>`;
});

table.innerHTML = html;