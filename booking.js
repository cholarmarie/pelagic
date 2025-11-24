// bookings.js — FINAL ULTIMATE ADMIN BOOKINGS PANEL (2025 EDITION)
// Lahat nandito pa rin: View, Approve, Reject, Delete, Search, Filter, Full Guest Info
// Zero error, super safe, super fast, super clean — pero walang tinanggal!

import { getApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

/* ------------------ Firebase Setup ------------------ */
const app = getApp();
const auth = getAuth(app);
const db = getFirestore(app);

/* ------------------ DOM Elements ------------------ */
const tbody = document.getElementById("bookings-tbody");
const searchInput = document.getElementById("booking-search");
const filterStatus = document.getElementById("filter-status");
const refreshBtn = document.getElementById("refresh-bookings");

const modal = document.getElementById("booking-modal");
const modalClose = document.getElementById("close-booking-modal");

/* Modal Fields — Lahat nandito pa rin, safe na safe */
const fields = {
  id:       document.getElementById("modal-booking-id"),
  guest:    document.getElementById("modal-guest"),
  email:    document.getElementById("modal-email"),
  phone:    document.getElementById("modal-phone"),
  room:     document.getElementById("modal-room"),
  nights:   document.getElementById("modal-nights"),
  checkin:  document.getElementById("modal-checkin"),
  checkout: document.getElementById("modal-checkout"),
  total:    document.getElementById("modal-total"),
  status:   document.getElementById("modal-status"),
  created:  document.getElementById("modal-created")
};

/* ------------------ State & Listener ------------------ */
let ALL_BOOKINGS = [];
let unsubscribeBookings = null;

/* ------------------ Safe Helpers ------------------ */
function formatDate(ts) {
  if (!ts) return "-";
  try {
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  } catch {
    return "-";
  }
}

function escapeHtml(text = "") {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function setField(el, value) {
  if (el) el.textContent = value ?? "--";
}

/* ------------------ Render Table ------------------ */
function render() {
  const query = (searchInput?.value || "").toLowerCase().trim();
  const statusFilter = filterStatus?.value || "";

  const filtered = ALL_BOOKINGS.filter(b => {
    const searchStr = `${b.userName || ""} ${b.userEmail || ""} ${b.room || ""} ${b.id || ""}`.toLowerCase();
    const matchesSearch = query === "" || searchStr.includes(query);
    const matchesStatus = statusFilter === "" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#999; padding:40px;">No bookings found</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(b => `
    <tr>
      <td>${b.id.slice(-8)}</td>
      <td>${escapeHtml(b.userName || b.userEmail?.split("@")[0] || "Guest")}</td>
      <td>${escapeHtml(b.room || "--")}</td>
      <td>${formatDate(b.checkin)}</td>
      <td>${formatDate(b.checkout)}</td>
      <td><strong>${b.nights || 1}</strong> night${(b.nights || 1) > 1 ? "s" : ""}</td>
      <td><strong>₱${Number(b.total || 0).toLocaleString()}</strong></td>
      <td>
        <span class="status-badge ${b.status || "pending"}">
          ${(b.status || "pending").toUpperCase()}
        </span>
      </td>
      <td>
        <button class="small-btn view-btn" data-docid="${b.id}">View</button>
      </td>
    </tr>
  `).join("");
}

/* ------------------ Real-time Listener ------------------ */
function startListener() {
  if (unsubscribeBookings) unsubscribeBookings();

  const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
  unsubscribeBookings = onSnapshot(q, snap => {
    ALL_BOOKINGS = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
  }, err => {
    console.error("Failed to load bookings:", err);
    tbody.innerHTML = `<tr><td colspan="9" style="color:red;">Error loading bookings</td></tr>`;
  });
}

/* ------------------ Auth Guard ------------------ */
onAuthStateChanged(auth, user => {
  if (!user) {
    ALL_BOOKINGS = [];
    render();
    if (unsubscribeBookings) unsubscribeBookings();
    return;
  }
  console.log("Admin active — loading bookings...");
  startListener();
});

/* ------------------ Open Modal — Full Details ------------------ */
tbody.addEventListener("click", async e => {
  const btn = e.target.closest(".view-btn");
  if (!btn) return;

  const booking = ALL_BOOKINGS.find(b => b.id === btn.dataset.docid);
  if (!booking) return;

  modal.dataset.docid = booking.id;

  // Fill all fields safely
  setField(fields.id, booking.id.slice(-8));
  setField(fields.room, booking.room);
  setField(fields.nights, `${booking.nights || 1} night${(booking.nights || 1) > 1 ? "s" : ""}`);
  setField(fields.checkin, formatDate(booking.checkin));
  setField(fields.checkout, formatDate(booking.checkout));
  setField(fields.total, `₱${Number(booking.total || 0).toLocaleString()}`);
  setField(fields.status, (booking.status || "pending").toUpperCase());
  setField(fields.created, formatDate(booking.createdAt));

  // Load guest info
  setField(fields.guest, "Loading guest...");
  setField(fields.email, booking.userEmail || "--");
  setField(fields.phone, "--");

  try {
    if (booking.userId) {
      const snap = await getDoc(doc(db, "users", booking.userId));
      if (snap.exists()) {
        const u = snap.data();
        setField(fields.guest, u.name || "Guest");
        setField(fields.email, u.email || booking.userEmail);
        setField(fields.phone, u.phone || "--");
      } else {
        setField(fields.guest, booking.userEmail?.split("@")[0] || "Guest");
      }
    }
  } catch (err) {
    console.error("Failed to load user:", err);
    setField(fields.guest, "Guest");
  }

  modal.classList.remove("hidden");
});

/* ------------------ Close Modal ------------------ */
modalClose?.addEventListener("click", () => modal.classList.add("hidden"));
window.addEventListener("click", e => {
  if (e.target === modal) modal.classList.add("hidden");
});

/* ------------------ Booking Actions ------------------ */
async function changeStatus(status) {
  const id = modal.dataset.docid;
  if (!id) return;
  try {
    await updateDoc(doc(db, "bookings", id), { status });
    modal.classList.add("hidden");
  } catch (err) {
    alert("Failed to update status. Check permissions.");
  }
}

document.getElementById("btn-approve")?.addEventListener("click", () => changeStatus("confirmed"));
document.getElementById("btn-decline")?.addEventListener("click", () => changeStatus("cancelled"));

document.getElementById("btn-delete")?.addEventListener("click", async () => {
  const id = modal.dataset.docid;
  if (!id || !confirm("Permanently delete this booking?\nThis cannot be undone.")) return;
  try {
    await deleteDoc(doc(db, "bookings", id));
    modal.classList.add("hidden");
  } catch (err) {
    alert("Failed to delete booking.");
  }
});

/* ------------------ Search & Filter ------------------ */
searchInput?.addEventListener("input", render);
filterStatus?.addEventListener("change", render);
refreshBtn?.addEventListener("click", render);