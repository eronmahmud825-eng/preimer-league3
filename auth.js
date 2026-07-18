// auth.js — shared coach login/session logic
// Codes: 14252 = Eron (admin), 0040 = Arin, 0050 = Lawin
const COACHES = {
    "14252": { id: "eron",  name: "Eron",  isAdmin: true  },
    "0040":  { id: "arin",  name: "Arin",  isAdmin: false },
    "0050":  { id: "lawin", name: "Lawin", isAdmin: false }
};
// Handy lookup by id too (for "view another coach" dashboards)
const COACHES_BY_ID = Object.values(COACHES).reduce(function(acc, c) {
    acc[c.id] = c; return acc;
}, {});

function getLoggedInCoach() {
    try {
        const raw = localStorage.getItem("loggedInCoach");
        return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
}

function setLoggedInCoach(coach) {
    localStorage.setItem("loggedInCoach", JSON.stringify(coach));
}

function logoutCoach() {
    localStorage.removeItem("loggedInCoach");
}

// Call at the top of any protected page. Redirects to index.html if not
// logged in (or not admin, when requireAdmin is true) and returns null.
// On success returns the logged-in coach object.
function requireCoachLogin(requireAdmin) {
    const coach = getLoggedInCoach();
    if (!coach) {
        alert("🔒 Please log in first.");
        window.location.href = "index.html";
        return null;
    }
    if (requireAdmin && !coach.isAdmin) {
        alert("🔒 This page is only available to Eron.");
        window.location.href = "index.html";
        return null;
    }
    return coach;
}
