/* cup-fallback.js
 * Safety net for cup.html and cup-settings.html.
 * Load it AFTER cup-core.js. It only defines a helper if that helper does not
 * already exist, so your own cup-core.js always wins when it works.
 */
(function (G) {
    function def(name, fn) { if (typeof G[name] !== "function") G[name] = fn; }

    // ── login guard (uses getLoggedInCoach from auth.js) ─────────
    // cupRequireLogin(true)  -> admin (Eron) only
    // cupRequireLogin(false) -> any logged-in coach (Arin, Lawin, Eron)
    G.cupRequireLogin = function (adminOnly) {
        var coach = null;
        try { coach = (typeof getLoggedInCoach === "function") ? getLoggedInCoach() : null; } catch (e) {}
        if (!coach || (adminOnly && !coach.isAdmin)) {
            location.replace("index.html");
            return null;
        }
        return coach;
    };

    // ── wait for Firebase (window.db from firebase.js) ───────────
    G.cupWaitDB = function (ok, bad, n) {
        n = n || 0;
        if (G.db) { ok(); return; }
        if (n > 80) { if (bad) bad(new Error("Firebase is not available.")); return; }
        setTimeout(function () { G.cupWaitDB(ok, bad, n + 1); }, 100);
    };

    // ── helpers ──────────────────────────────────────────────────
    def("cupEsc", function (s) {
        return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    });
    def("cupName", function (s) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim(); });
    def("cupIsNum", function (v) { return v !== null && v !== undefined && v !== "" && isFinite(Number(v)); });

    def("cupPairs", function (drawn) {
        var out = [];
        for (var i = 0; i < (drawn || []).length; i += 2) out.push({ a: drawn[i], b: drawn[i + 1] || "" });
        return out;
    });

    // ── database ─────────────────────────────────────────────────
    def("cupRef", function () { return G.db.collection("cup").doc("season1"); });

    def("cupMerge", function (snap) {
        var s = (snap && snap.exists) ? (snap.data() || {}) : {};
        return {
            enabled: s.enabled === true,
            startGameweek: parseInt(s.startGameweek, 10) || 10,
            pool: Array.isArray(s.pool) ? s.pool : [],
            drawn: Array.isArray(s.drawn) ? s.drawn : [],
            playoffResults: (s.playoffResults && typeof s.playoffResults === "object") ? s.playoffResults : {},
            finalTeam1: s.finalTeam1 || "",
            finalTeam2: s.finalTeam2 || "",
            leg1: s.leg1 || null,
            leg2: s.leg2 || null,
            tiebreakWinner: s.tiebreakWinner || "",
            winner: s.winner || "",
            wonAt: s.wonAt || ""
        };
    });

    // run fn(currentData) inside a transaction; fn returns the fields to change
    def("cupTx", function (fn) {
        var ref = G.cupRef();
        return G.db.runTransaction(function (tx) {
            return tx.get(ref).then(function (snap) {
                var cur = G.cupMerge(snap);
                var patch = fn(cur) || {};
                var out = Object.assign({}, cur, patch);
                tx.set(ref, out);
                return out;
            });
        });
    });
    def("cupSave", function (patch) { return G.cupTx(function () { return patch; }); });


    // ── random numbers for the Lucky Spin ────────────────────────
    def("cupRandomFloat", function () {
        try {
            var a = new Uint32Array(1); G.crypto.getRandomValues(a);
            return a[0] / 4294967296;
        } catch (e) { return Math.random(); }
    });
    def("cupRandomInt", function (n) { return Math.floor(G.cupRandomFloat() * n); });

    // ── final (home & away) maths ────────────────────────────────
    def("cupFinalState", function (d) {
        var t1 = d.finalTeam1 || "", t2 = d.finalTeam2 || "";
        var l1 = d.leg1, l2 = d.leg2;
        var has1 = !!(l1 && G.cupIsNum(l1.t1) && G.cupIsNum(l1.t2));
        var has2 = !!(l2 && G.cupIsNum(l2.t1) && G.cupIsNum(l2.t2));
        var agg1 = (has1 ? Number(l1.t1) : 0) + (has2 ? Number(l2.t1) : 0);
        var agg2 = (has1 ? Number(l1.t2) : 0) + (has2 ? Number(l2.t2) : 0);
        var complete = !!(t1 && t2 && has1 && has2);
        var tie = complete && agg1 === agg2;
        var winner = "";
        if (complete) {
            if (agg1 > agg2) winner = t1;
            else if (agg2 > agg1) winner = t2;
            else if (d.tiebreakWinner === t1 || d.tiebreakWinner === t2) winner = d.tiebreakWinner;
        }
        return { t1: t1, t2: t2, has1: has1, has2: has2, agg1: agg1, agg2: agg2, complete: complete, tie: tie, winner: winner };
    });
})(window);
