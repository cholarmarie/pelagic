// ============================
// dashboard.js (Admin Overview)
// ============================

import {
    getFirestore,
    collection,
    query,
    orderBy,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

// ------------------------------
// FIREBASE INIT
// ------------------------------
const firebaseConfig = {
    apiKey: "AIzaSyCTF9CrRbUvYxNTlI1r02LMgtJtEHfeBfY",
    authDomain: "pelagics-33950.firebaseapp.com",
    projectId: "pelagics-33950",
    storageBucket: "pelagics-33950.firebasestorage.app",
    messagingSenderId: "764984436106",
    appId: "1:764984436106:web:20323e7ce2b3fcfe1c5473"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ------------------------------
// DOM SHORTCUT
// ------------------------------
const $ = (id) => document.getElementById(id);

// Stat fields
const statTotal     = $("stat-total-bookings");
const statCompleted = $("stat-completed");
const statPending   = $("stat-pending");
const statCancelled = $("stat-cancelled");
const statUsers     = $("stat-users");

// Chart instances
let chartMonthly = null;
let chartYearly  = null;
let chartWeekly  = null;

// ===============================
// WAIT FOR ADMIN + OVERVIEW PAGE
// ===============================
let chartsLoaded = false;

document.addEventListener("admin:pageChange", (e) => {
    if (e.detail === "overview" && !chartsLoaded) {
        chartsLoaded = true;
        setTimeout(initDashboard, 150); // ensures DOM is visible
    }
});

onAuthStateChanged(auth, (user) => {
    if (!user) return;
});

// ------------------------------
// INITIALIZE DASHBOARD
// ------------------------------
function initDashboard() {
    loadDashboardStats();
    loadCharts();
}

// ------------------------------
// REALTIME STAT COUNTERS
// ------------------------------
function loadDashboardStats() {
    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));

    onSnapshot(q, (snap) => {
        const bookings = snap.docs.map(d => d.data());

        statTotal.textContent     = bookings.length;
        statCompleted.textContent = bookings.filter(b => b.status === "confirmed").length;
        statPending.textContent   = bookings.filter(b => b.status === "pending").length;
        statCancelled.textContent = bookings.filter(b => b.status === "cancelled").length;
    });

    // Users count
    onSnapshot(collection(db, "users"), (snap) => {
        statUsers.textContent = snap.size;
    });
}

// -----------------------------------------
// LOAD CHART DATA (REALTIME)
// -----------------------------------------
function loadCharts() {
    const q = query(collection(db, "bookings"), orderBy("createdAt"));

    onSnapshot(q, (snap) => {
        const data = snap.docs.map(d => d.data());
        renderCharts(data);
    });
}

function renderCharts(data) {
    updateMonthlyChart(data);
    updateYearlyChart(data);
    updateWeeklyChart(data);
}

// ===========================================
// MONTHLY CHART
// ===========================================
function updateMonthlyChart(bookings) {
    const canvas = document.getElementById("chart-monthly");
    if (!canvas) return console.warn("Missing canvas: chart-monthly");

    const months = Array(12).fill(0);

    bookings.forEach(b => {
        if (!b.createdAt) return;
        months[b.createdAt.toDate().getMonth()]++;
    });

    if (chartMonthly) chartMonthly.destroy();

    chartMonthly = new Chart(canvas.getContext("2d"), {
        type: "bar",
        data: {
            labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
            datasets: [{
                label: "Bookings",
                data: months,
                backgroundColor: "#4cc9f0"
            }]
        }
    });
}

// ===========================================
// YEARLY CHART
// ===========================================
function updateYearlyChart(bookings) {
    const canvas = document.getElementById("chart-yearly");
    if (!canvas) return console.warn("Missing canvas: chart-yearly");

    const map = {};

    bookings.forEach(b => {
        if (!b.createdAt) return;
        const y = b.createdAt.toDate().getFullYear();
        map[y] = (map[y] || 0) + 1;
    });

    if (chartYearly) chartYearly.destroy();

    chartYearly = new Chart(canvas.getContext("2d"), {
        type: "line",
        data: {
            labels: Object.keys(map),
            datasets: [{
                label: "Yearly Bookings",
                data: Object.values(map),
                borderColor: "#3a0ca3",
                tension: 0.3
            }]
        }
    });
}

// ===========================================
// WEEKLY CHART
// ===========================================
function updateWeeklyChart(bookings) {
    const canvas = document.getElementById("chart-weekly");
    if (!canvas) return console.warn("Missing canvas: chart-weekly");

    const labels = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const counts = Array(7).fill(0);

    bookings.forEach(b => {
        if (!b.createdAt) return;
        counts[b.createdAt.toDate().getDay()]++;
    });

    if (chartWeekly) chartWeekly.destroy();

    chartWeekly = new Chart(canvas.getContext("2d"), {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Weekly Activity",
                data: counts,
                backgroundColor: "#f72585"
            }]
        }
    });
}
