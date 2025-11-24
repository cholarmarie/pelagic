// ==============================================
// rooms.js — SUPER CLEAN ROOM MANAGEMENT (2025)
// ==============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDoc,           // ← IDAGDAG MO ‘TO
    onSnapshot,
    serverTimestamp,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyCTF9CrRbUvYxNTlI1r02LMgtJtEHfeBfY",
    authDomain: "pelagics-33950.firebaseapp.com",
    projectId: "pelagics-33950",
    storageBucket: "pelagics-33950.firebasestorage.app",
    messagingSenderId: "764984436106",
    appId: "1:764984436106:web:20323e7ce2b3fcfe1c5473"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// DOM
const $ = id => document.getElementById(id);
const form = $("room-form");
const roomIdField = $("room-id");
const roomNameField = $("room-name");
const roomDescField = $("room-desc");
const roomRateField = $("room-rate");
const tableBody = $("rooms-table-body");

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        console.warn("❌ No user — blocking admin access");
        return;
    }

    // Load admin role from Firestore
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists() || snap.data().role !== "admin") {
        console.warn("❌ User is NOT an admin — blocking access");
        alert("Access denied. Admin only.");
        return;
    }

    console.log("✅ Admin verified:", user.uid);

    // Allow the rest of the admin page to load
    document.dispatchEvent(new Event("admin-logged-in"));
});

// Load Rooms (Realtime)
function loadRooms() {
    const q = query(collection(db, "rooms"), orderBy("createdAt", "desc"));

    onSnapshot(q, (snap) => {
        tableBody.innerHTML = "";

        if (snap.empty) {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#999;">No rooms yet.</td></tr>`;
            return;
        }

        snap.forEach(docSnap => {
            const r = docSnap.data();
            const id = docSnap.id;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${r.name}</strong></td>
                <td>₱${Number(r.rate).toLocaleString()}</td>
                <td>${r.description || "<em>No description</em>"}</td>
                <td>
                    <button class="btn-edit" data-id="${id}">Edit</button>
                    <button class="btn-delete" data-id="${id}">Delete</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    });
}

loadRooms();

// Save Room (Add or Update)
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = roomNameField.value.trim();
    const rate = parseFloat(roomRateField.value);
    const desc = roomDescField.value.trim();

    if (!name || !rate || rate <= 0) {
        return alert("Please fill Room Name and valid Price.");
    }

    const roomData = {
        name,
        rate,
        description: desc || "",
        createdAt: serverTimestamp()
    };

    try {
        if (roomIdField.value) {
            await updateDoc(doc(db, "rooms", roomIdField.value), roomData);
            alert("Room updated!");
        } else {
            await addDoc(collection(db, "rooms"), roomData);
            alert("Room added!");
        }

        form.reset();
        roomIdField.value = "";
    } catch (err) {
        console.error(err);
        alert("Failed to save room.");
    }
});

// EDIT BUTTON — 100% SAFE NA (hindi na mag-e-error kahit deleted na yung room)
tableBody.addEventListener("click", async (e) => {
    const btn = e.target.closest(".btn-edit");
    if (!btn) return;

    const id = btn.dataset.id;

    try {
        const snap = await getDoc(doc(db, "rooms", id));
        
        if (!snap.exists()) {
            alert("This room no longer exists. Refreshing list...");
            return; // hindi na magfi-fill ng form
        }

        const r = snap.data();
        roomIdField.value = id;
        roomNameField.value = r.name || "";
        roomRateField.value = r.rate || "";
        roomDescField.value = r.description || "";

        document.querySelector(".room-form").scrollIntoView({ behavior: "smooth" });

    } catch (err) {
        console.error(err);
        alert("Room not found or already deleted.");
    }
});

// DELETE BUTTON — AUTO-REFRESH PAG SUCCESS (hindi na magkakaron ng ghost rows)
tableBody.addEventListener("click", async (e) => {
    const btn = e.target.closest(".btn-delete");
    if (!btn) return;

    const id = btn.dataset.id;
    const roomName = btn.closest("tr")?.querySelector("td:first-child")?.textContent?.trim() || "this room";

    if (!confirm(`Permanently delete "${roomName}"?`)) return;

    btn.disabled = true;
    btn.textContent = "Deleting...";

    try {
        await deleteDoc(doc(db, "rooms", id));
        // Walang alert — mawawala agad sa list kasi realtime
    } catch (err) {
        console.error(err);
        alert("Failed to delete. Maybe it was already removed.");
        btn.disabled = false;
        btn.textContent = "Delete";
    }
});