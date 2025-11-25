/**
 * ADMIN SIDE LOGIC
 * Handles Room CRUD, Booking Approval, Gallery, Feedback
 */

const DB = {
    get: (key) => JSON.parse(localStorage.getItem(key)) || [],
    set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
    getObj: (key) => JSON.parse(localStorage.getItem(key)) || {},
};

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

document.addEventListener('DOMContentLoaded', () => {
    // Check if admin is already logged in on page load
    if(sessionStorage.getItem('pelagic_admin')) showDashboard();
});

// FIX: Updated element IDs to 'admin-email' and 'admin-pass'
document.getElementById('admin-login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('admin-email').value;
    const pass = document.getElementById('admin-pass').value;

    if(email === 'admin@pelagic.com' && pass === 'superadmin123') {
        sessionStorage.setItem('pelagic_admin', 'true');
        showDashboard();
    } else {
        alert('Invalid Admin Credentials');
    }
});

document.getElementById('admin-logout')?.addEventListener('click', () => {
    sessionStorage.removeItem('pelagic_admin');
    window.location.reload();
});

function showDashboard() {
    document.getElementById('admin-login').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.remove('hidden');
    loadBookings(); loadRooms(); loadFeedback(); loadGallery();
}

window.switchTab = function(tabName) {
    document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('panel-'+tabName).classList.remove('hidden');
    
};

// --- 1. ROOM MANAGEMENT ---

window.openRoomModal = function(id = null) {
    const modal = document.getElementById('room-modal');
    const form = document.getElementById('room-form');
    form.reset();
    document.getElementById('r-preview').style.display = 'none';
    if (id) {
        const r = DB.get('pelagic_rooms').find(room => room.id === id);
        document.getElementById('edit-room-id').value = r.id;
        document.getElementById('r-name').value = r.name;
        document.getElementById('r-price').value = r.price;
        document.getElementById('r-desc').value = r.desc;
        document.getElementById('r-amenities').value = r.amenities;
        document.getElementById('room-modal-title').innerText = "Edit Room";
        if(r.image) {
            document.getElementById('r-preview').src = r.image;
            document.getElementById('r-preview').style.display = 'block';
        }
    } else {
        document.getElementById('edit-room-id').value = '';
        document.getElementById('room-modal-title').innerText = "Add Room";
    }
    modal.classList.remove('hidden');
};

document.getElementById('room-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-room-id').value;
    const file = document.getElementById('r-photo').files[0];
    let rooms = DB.get('pelagic_rooms');
    let imageBase64 = "";
    if (id) {
        const idx = rooms.findIndex(r => r.id === id);
        imageBase64 = rooms[idx].image;
        if (file) imageBase64 = await toBase64(file);
        rooms[idx] = { id, name: document.getElementById('r-name').value, price: document.getElementById('r-price').value, desc: document.getElementById('r-desc').value, amenities: document.getElementById('r-amenities').value, image: imageBase64 };
    } else {
        if (file) imageBase64 = await toBase64(file);
        rooms.push({ id: 'RM' + Date.now(), name: document.getElementById('r-name').value, price: document.getElementById('r-price').value, desc: document.getElementById('r-desc').value, amenities: document.getElementById('r-amenities').value, image: imageBase64 });
    }
    DB.set('pelagic_rooms', rooms);
    closeModal('room-modal');
    loadRooms();
});

function loadRooms() {
    document.getElementById('room-table').innerHTML = DB.get('pelagic_rooms').map(r => `
        <tr><td><img src="${r.image || ''}" style="width:50px; height:50px; object-fit:cover;"></td><td>${r.name}</td><td>₱${r.price}</td><td>${r.amenities}</td><td><button onclick="openRoomModal('${r.id}')" class="btn btn-small" style="background:#f39c12;">Edit</button> <button onclick="deleteRoom('${r.id}')" class="btn btn-small btn-danger">Delete</button></td></tr>
    `).join('');
}

window.deleteRoom = function(id) {
    if(confirm('Delete this room?')) {
        DB.set('pelagic_rooms', DB.get('pelagic_rooms').filter(r => r.id !== id));
        loadRooms();
    }
};

// --- 2. BOOKING MANAGEMENT ---

function loadBookings() {
    document.getElementById('booking-table').innerHTML = DB.get('pelagic_bookings').map(b => `
        <tr>
            <td>${b.id}</td>
            <td>${b.guestName}</td>
            <td>${b.roomName}</td>
            <td>${b.total}</td>
            <td style="font-weight:bold;text-transform:uppercase;color:${b.status==='approved'?'green':b.status==='declined'?'red':'orange'}">${b.status}</td>
            <td>
                <button onclick="viewBooking('${b.id}')" class="btn btn-small">View</button>
                <button onclick="deleteBooking('${b.id}')" class="btn btn-small btn-danger" style="margin-left:5px;">Delete</button>
            </td>
        </tr>
    `).join('');
}

window.deleteBooking = function(id) {
    if(confirm('Are you sure you want to permanently delete this booking record?')) {
        let bookings = DB.get('pelagic_bookings');
        bookings = bookings.filter(b => b.id !== id);
        DB.set('pelagic_bookings', bookings);
        loadBookings();
    }
};

// ───────────────────────────────
// Only modal + status update logic (no EmailJS code here)
// ───────────────────────────────

window.viewBooking = function (id) {
    const b = DB.get('pelagic_bookings').find(item => item.id === id);
    if (!b) return;

    document.getElementById('bd-content').innerHTML = `
        <p><strong>Guest:</strong> ${b.guestName}</p>
        <p><strong>Email:</strong> ${b.email ? b.email : '<i style="color:#e74c3c">No email</i>'}</p>
        <p><strong>Room:</strong> ${b.roomName}</p>
        <p><strong>Dates:</strong> ${new Date(b.in).toLocaleDateString()} – ${new Date(b.out).toLocaleDateString()}</p>
        <p><strong>GCash:</strong> ${b.gcash}</p>
        <p><strong>Receipt:</strong></p>
        <img src="${b.receipt}" class="receipt-img" style="max-width:100%; border-radius:8px; margin-top:8px;">
    `;

    document.getElementById('btn-approve').onclick = () => updateStatus(id, 'approved', b);
    document.getElementById('btn-decline').onclick = () => updateStatus(id, 'declined', b);

    document.getElementById('booking-modal').classList.remove('hidden');
};

function updateStatus(id, status, booking) {
    if (status === 'declined' && !confirm('Are you sure you want to decline this booking?')) return;

    // Update DB
    let bookings = DB.get('pelagic_bookings');
    const idx = bookings.findIndex(b => b.id === id);
    bookings[idx].status = status;
    DB.set('pelagic_bookings', bookings);

    // Send email using the global function defined in HTML
    if (typeof sendBookingEmail === 'function') {
        sendBookingEmail(booking, status);
    }

    // Refresh UI
    closeModal('booking-modal');
    loadBookings();
}

// --- 3. FEEDBACK ---
function loadFeedback() {
    document.getElementById('feedback-table').innerHTML = DB.get('pelagic_feedbacks').map((f, i) => `<tr><td>${f.guestName}</td><td>${f.rating}/5</td><td>${f.msg}</td><td>${f.date}</td><td><button onclick="deleteFeedback(${i})" class="btn btn-small btn-danger">Delete</button></td></tr>`).join('');
}

window.deleteFeedback = function(i) {
    let fb = DB.get('pelagic_feedbacks');
    fb.splice(i, 1);
    DB.set('pelagic_feedbacks', fb);
    loadFeedback();
};

// --- 4. GALLERY ---
function loadGallery() {
    const g = DB.getObj('pelagic_gallery');
    if(g.bg) document.getElementById('bg-preview').src = g.bg;
}

window.saveBackground = async function() {
    const file = document.getElementById('bg-upload').files[0];
    if(!file) return alert('Please choose a file');
    const b64 = await toBase64(file);
    DB.set('pelagic_gallery', { bg: b64 });
    document.getElementById('bg-preview').src = b64;
    alert('Background Updated!');
};

window.closeModal = function(id) { document.getElementById(id).classList.add('hidden'); };