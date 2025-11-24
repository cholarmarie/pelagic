/**
 * MASTER JAVASCRIPT FILE
 * Handles Client Logic: Rooms, Auth, UI Updates
 */

// --- 1. DATABASE HELPER ---
const DB = {
    get: (key) => JSON.parse(localStorage.getItem(key)) || [],
    set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
    getObj: (key) => JSON.parse(localStorage.getItem(key)) || {},
};

// --- 2. INITIALIZATION & SEEDING ---
(function initData() {
    // Seed Rooms if empty
    if (!localStorage.getItem('pelagic_rooms')) {
        const defaultRooms = [
            { id: 'R1', name: 'Standard Room', price: 3500, type: 'overnight', desc: 'Cozy room for 2 pax with AC.', amenities: 'AC, Private Bath', image: '' },
            { id: 'V1', name: 'Ocean Villa', price: 5000, type: 'overnight', desc: 'Villa with balcony and kitchen.', amenities: 'Kitchen, Balcony, AC', image: '' }
        ];
        DB.set('pelagic_rooms', defaultRooms);
    }
})();

// --- 3. DOM EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    updateNavState(); 
    loadHeroBackground();

    if (document.getElementById('rooms-list')) {
        renderIndexRooms();
    }

    if (document.getElementById('auth-section')) {
        checkAuthState();
        setupTabs();
        setupDateRestrictions();
    }
});

// --- 4. UI & NAVIGATION LOGIC ---

function updateNavState() {
    const user = sessionStorage.getItem('pelagic_user');
    const loginBtn = document.getElementById('nav-login-btn');
    const bookBtn = document.getElementById('nav-book-btn');

    if (user) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (bookBtn) {
            bookBtn.textContent = "My Dashboard";
            bookBtn.href = "profile.html";
        }
    } else {
        if (loginBtn) loginBtn.style.display = 'inline-block';
        if (bookBtn) bookBtn.textContent = "Book Now";
    }
}

function loadHeroBackground() {
    const gallery = DB.getObj('pelagic_gallery');
    const heroSection = document.getElementById('hero-section');
    if (heroSection && gallery.bg) {
        heroSection.style.backgroundImage = `url(${gallery.bg})`;
    }
}

// --- 5. HOME PAGE: RENDER ROOMS ---
function renderIndexRooms() {
    const list = document.getElementById('rooms-list');
    const rooms = DB.get('pelagic_rooms');
    
    list.innerHTML = ''; 

    if (rooms.length === 0) {
        list.innerHTML = '<p style="text-align:center; grid-column:1/-1; padding:20px;">No rooms currently available.</p>';
        return;
    }

    const placeholder = "https://via.placeholder.com/400x250?text=Room+Photo";

    list.innerHTML = rooms.map(r => `
        <div class="room-card">
            <img src="${r.image && r.image.length > 100 ? r.image : placeholder}" alt="${r.name}">
            <div class="card-body">
                <h3>${r.name}</h3>
                <p class="room-desc">${r.desc}</p>
                <div class="room-amenities">${r.amenities ? r.amenities.split(',').map(a => `<span>${a.trim()}</span>`).join('') : ''}</div>
                <div class="price-info">₱ ${Number(r.price).toLocaleString()}</div> 
                <a href="profile.html?room=${r.id}" class="btn book-btn small-btn" style="float:right;">Book Now</a>
            </div>
        </div>
    `).join('');
}

// --- 6. PROFILE PAGE: AUTH & DASHBOARD ---

function checkAuthState() {
    const user = sessionStorage.getItem('pelagic_user');
    if (user) {
        const uObj = JSON.parse(user);
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('dashboard-section').classList.remove('hidden');
        document.getElementById('user-welcome').textContent = `Welcome, ${uObj.name}!`;
        
        loadBookingOptions(); 
        loadMyBookings(uObj.email);
        renderUserFeedbacks(); // Load feedbacks on login

        const urlParams = new URLSearchParams(window.location.search);
        const roomID = urlParams.get('room');
        if(roomID) {
            const select = document.getElementById('book-room');
            setTimeout(() => { select.value = roomID; select.dispatchEvent(new Event('change')); }, 100);
        }
    } else {
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('dashboard-section').classList.add('hidden');
    }
}

document.getElementById('show-register')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
});
document.getElementById('show-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
});

document.getElementById('login-form-data')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;
    const users = DB.get('pelagic_users');
    
    const validUser = users.find(u => u.email === email && u.pass === pass);

    if (validUser) {
        sessionStorage.setItem('pelagic_user', JSON.stringify(validUser));
        checkAuthState();
        updateNavState();
    } else {
        alert('Invalid email or password.');
    }
});

document.getElementById('register-form-data')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-pass').value;
    
    const users = DB.get('pelagic_users');
    if (users.find(u => u.email === email)) return alert('Email already registered.');

    users.push({ name, email, pass });
    DB.set('pelagic_users', users);
    alert('Account created successfully! Please log in.');
    document.getElementById('show-login').click();
});

document.getElementById('logout-btn')?.addEventListener('click', () => {
    sessionStorage.removeItem('pelagic_user');
    window.location.href = 'index.html'; 
});

// --- 7. BOOKING FORM LOGIC ---

function setupDateRestrictions() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const today = now.toISOString().slice(0, 16);

    const inInput = document.getElementById('book-in');
    const outInput = document.getElementById('book-out');

    if (inInput && outInput) {
        inInput.min = today;
        outInput.min = today;
        
        inInput.addEventListener('change', () => {
            outInput.min = inInput.value; 
        });
    }
}

function loadBookingOptions() {
    const rooms = DB.get('pelagic_rooms');
    const select = document.getElementById('book-room');
    
    select.innerHTML = '<option value="">Select a Room...</option>' + 
        rooms.map(r => `<option value="${r.id}" data-price="${r.price}">${r.name}</option>`).join('');
    
    select.addEventListener('change', () => {
        const opt = select.options[select.selectedIndex];
        const price = opt.getAttribute('data-price') || 0;
        document.getElementById('total-price').textContent = `Total: ₱${Number(price).toLocaleString()}`;
    });
}

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

document.getElementById('booking-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = JSON.parse(sessionStorage.getItem('pelagic_user'));
    const roomSelect = document.getElementById('book-room');
    const fileInput = document.getElementById('receipt-file');
    
    if (!roomSelect.value) return alert('Please select a room.');
    if (fileInput.files.length === 0) return alert('Please upload proof of payment.');

    const receiptBase64 = await toBase64(fileInput.files[0]);
    
    const booking = {
        id: 'BK' + Date.now().toString().slice(-6),
        userId: user.email, 
        guestName: user.name,
        guestEmail: user.email,
        roomID: roomSelect.value,
        roomName: roomSelect.options[roomSelect.selectedIndex].text,
        in: document.getElementById('book-in').value,
        out: document.getElementById('book-out').value,
        gcash: document.getElementById('gcash-name').value + ' (' + document.getElementById('gcash-no').value + ')',
        total: document.getElementById('total-price').textContent,
        receipt: receiptBase64,
        status: 'pending',
        dateSubmitted: new Date().toISOString()
    };

    const bookings = DB.get('pelagic_bookings');
    bookings.push(booking);
    DB.set('pelagic_bookings', bookings);

    alert('Booking Submitted! Wait for Admin Approval.');
    document.getElementById('booking-form').reset();
    document.querySelector('.tab-btn[data-tab="tab-my-bookings"]').click(); 
    loadMyBookings(user.email);
});

function loadMyBookings(email) {
    const list = document.getElementById('bookings-list');
    const bookings = DB.get('pelagic_bookings').filter(b => b.guestEmail === email);
    
    if (bookings.length === 0) {
        list.innerHTML = '<p>No bookings found.</p>';
        return;
    }

    list.innerHTML = bookings.map(b => `
        <div class="status-card status-${b.status}">
            <div style="display:flex; justify-content:space-between;">
                <h4>${b.roomName}</h4>
                <span style="text-transform:uppercase; font-weight:bold; font-size:0.9rem;">${b.status}</span>
            </div>
            <p style="margin:5px 0; font-size:0.9rem;">${new Date(b.in).toLocaleDateString()} - ${new Date(b.out).toLocaleDateString()}</p>
            <p style="margin:0; font-weight:bold;">${b.total}</p>
        </div>
    `).join('');
}

// --- 8. FEEDBACK LOGIC (FIXED) ---
document.getElementById('feedback-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = JSON.parse(sessionStorage.getItem('pelagic_user'));
    
    const rating = document.getElementById('fb-rating').value;
    const msg = document.getElementById('fb-msg').value;

    const fb = {
        id: Date.now(),
        userId: user.email,
        guestName: user.name,
        guestEmail: user.email,
        rating: rating,
        msg: msg,
        date: new Date().toLocaleDateString()
    };
    
    // Use standard key 'pelagic_feedbacks'
    const feeds = DB.get('pelagic_feedbacks');
    feeds.push(fb);
    DB.set('pelagic_feedbacks', feeds);
    
    alert('Feedback Sent!');
    document.getElementById('feedback-form').reset();
    renderUserFeedbacks();
});

function renderUserFeedbacks() {
    const user = JSON.parse(sessionStorage.getItem('pelagic_user'));
    const list = document.getElementById('my-feedbacks');
    // Use standard key 'pelagic_feedbacks'
    const feeds = DB.get('pelagic_feedbacks').filter(f => f.guestEmail === user.email);
    
    if(list) {
        list.innerHTML = feeds.length ? feeds.map(f => `
            <div class="status-card" style="border-left-color: #f39c12;">
                <div style="display:flex; justify-content:space-between;">
                    <strong>${f.rating}/5 Stars</strong>
                    <small>${f.date}</small>
                </div>
                <p style="margin-top:5px; font-style:italic;">"${f.msg}"</p>
            </div>
        `).join('') : '<p>You have not submitted any feedback yet.</p>';
    }
}

// --- 9. TABS LOGIC ---
function setupTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(t => {
        t.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
            t.classList.add('active');
            document.getElementById(t.dataset.tab).classList.remove('hidden');
        });
    });
}
