// index.js (Logic for client profile, login, register, and booking)

// --- MOCK DATA STORE (Simulated Database) ---
let bookings = [
    { id: 'BKR1001', guest: 'Juan Dela Cruz', email: 'juan@example.com', room: 'Room 1 (2 Pax, ₱3500)', roomType: 'room1', checkin: '2025-12-10T14:00', checkout: '2025-12-11T12:00', type: 'overnight', total: 3500, status: 'approved', created: '2025-11-20', extra: 'none', gcashName: 'J.D. Cruz', gcashNo: '09171234567', phone: '09171234567', receipt: 'receipts/BKR1001.jpg' },
    { id: 'BKR1002', guest: 'Maria Santos', email: 'maria@example.com', room: 'Villa 1 (4 Pax, ₱4000)', roomType: 'villa1', checkin: '2025-12-25T14:00', checkout: '2025-12-28T12:00', type: 'overnight', total: 12000, status: 'pending', created: '2025-11-22', extra: 'extra_pax', gcashName: 'M. Santos', gcashNo: '09229876543', phone: '09229876543', receipt: 'receipts/BKR1002.jpg' }
];

// 🌟 CRITICAL: Ginawang Global para ma-share sa admin.js 🌟
window.globalBookings = bookings;

let loggedInUser = null; 

// --- HELPER FUNCTIONS ---

function showView(viewId) {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('booking-dashboard').classList.add('hidden');
    document.getElementById('booking-status-section').classList.add('hidden');
    
    // Hide booking alert by default
    document.getElementById('booking-alert').style.display = 'none';


    if (viewId === 'login-form') {
        document.getElementById('login-form').classList.remove('hidden');
        // Check if there are URL params (pending booking)
        if (new URLSearchParams(window.location.search).get('room')) {
             document.getElementById('booking-alert').style.display = 'block';
        }
    } else if (viewId === 'register-form') {
        document.getElementById('register-form').classList.remove('hidden');
    } else if (viewId === 'dashboard') {
        document.getElementById('booking-dashboard').classList.remove('hidden');
        document.getElementById('booking-status-section').classList.remove('hidden');
    }
}

function getBasePrice(roomId) {
    // Base prices (Must match options in profile.html)
    switch(roomId) {
        case 'room1': return 3500;
        case 'villa1': return 4000;
        case 'family': return 5000;
        case 'gray_cottage': 
        case 'red_cottage': return 1200;
        default: return 0;
    }
}

function getRoomName(roomId) {
    // Full name of the room
    const select = document.getElementById('room-type');
    for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].value === roomId) {
            return select.options[i].text;
        }
    }
    return 'N/A';
}

function calculateTotalPrice() {
    const roomType = document.getElementById('room-type').value;
    const checkin = document.getElementById('checkin').value;
    const checkout = document.getElementById('checkout').value;
    
    if (!roomType || !checkin || !checkout) {
        document.getElementById('total-display').textContent = 'Total: ₱0';
        return 0;
    }

    const basePrice = getBasePrice(roomType);
    const dateIn = new Date(checkin);
    const dateOut = new Date(checkout);

    if (dateOut <= dateIn) {
        document.getElementById('total-display').textContent = 'Total: ₱0 (Invalid Dates)';
        return 0;
    }

    const diffTime = Math.abs(dateOut - dateIn);
    const diffHours = diffTime / (1000 * 60 * 60);

    let total = 0;
    const isCottage = roomType.includes('cottage');
    
    if (isCottage) {
        // Cottage is a flat daytour rate
        total = basePrice;
    } else if (diffHours <= 24) {
        // Assume anything 24 hours or less is 1 night/day rate for non-cottage
        total = basePrice; 
    } else {
        // Calculate number of nights
        const diffDays = Math.ceil(diffHours / 24); 
        total = basePrice * diffDays; 
    }

    document.getElementById('total-display').textContent = `Total: ₱${total.toLocaleString('en-US')}`;
    return total;
}

// Auto-fill logic (Called after login/registration if parameters exist)
function autoFillBooking() {
    const params = new URLSearchParams(window.location.search);
    const sRoom = params.get('room');
    const sIn = params.get('checkin');
    const sOut = params.get('checkout');
    
    if (sRoom) document.getElementById('room-type').value = sRoom;
    if (sIn) document.getElementById('checkin').value = sIn;
    if (sOut) document.getElementById('checkout').value = sOut;
    
    // Remove URL parameters after filling to prevent re-fill on refresh
    history.replaceState(null, '', window.location.pathname);
    document.getElementById('booking-alert').style.display = 'none';

    calculateTotalPrice();
}

function updatePrice() {
    calculateTotalPrice();
}

function renderBookings() {
    if (!loggedInUser) return;
    
    const list = document.getElementById('booking-status-list');
    list.innerHTML = '';
    
    const userBookings = bookings
        .filter(b => b.email === loggedInUser.email)
        .sort((a, b) => new Date(b.created) - new Date(a.created)); 

    if (userBookings.length === 0) {
        list.innerHTML = '<div class="status-empty">No bookings found for this account.</div>';
        return;
    }

    userBookings.forEach(booking => {
        const statusText = booking.status.replace('_', ' ').toUpperCase();
        const statusClass = booking.status; // pending, approved, declined, checked_in, checked_out

        const card = document.createElement('div');
        card.className = `status-card ${statusClass}`;
        card.innerHTML = `
            <div class="status-header">
                <strong>Booking ID: ${booking.id}</strong>
                <span class="badge ${statusClass}">${statusText}</span>
            </div>
            <p><strong>Room:</strong> ${booking.room}</p>
            <p><strong>Check-in:</strong> ${formatDateTime(booking.checkin)}</p>
            <p><strong>Check-out:</strong> ${formatDateTime(booking.checkout)}</p>
            <p><strong>Total Paid:</strong> ₱${booking.total.toLocaleString('en-US')}</p>
        `;
        list.appendChild(card);
    });
}

function formatDateTime(isoString) {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// --- CORE FUNCTIONS ---

// 1. 🔑 LOGIN/REGISTER FUNCTIONS
document.getElementById('login-form-data').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-pass').value;

    // MOCK LOGIN: Pwede lang ang 'juan@example.com' at 'pass123' o 'maria@example.com' at 'pass123'
    if ((email === 'juan@example.com' || email === 'maria@example.com') && password === 'pass123') {
        loggedInUser = { 
            name: email === 'juan@example.com' ? 'Juan Dela Cruz' : 'Maria Santos', 
            email: email 
        };
        document.getElementById('dashboard-header').textContent = `Welcome, ${loggedInUser.name}!`;
        document.getElementById('guest-name').value = loggedInUser.name; // Pre-fill name
        showView('dashboard');
        autoFillBooking(); // Subukan i-autofill ang pending booking
        renderBookings(); // Ipakita ang booking history
    } else {
        alert('Invalid credentials. Try: juan@example.com / pass123');
    }
});

document.getElementById('register-form-data').addEventListener('submit', (e) => {
    e.preventDefault();
    // Sa real world, magre-register ito sa database.
    alert('Registration successful! Please login.');
    document.getElementById('login-email').value = document.getElementById('reg-email').value;
    showView('login-form');
});

// 2. 📝 NEW BOOKING SUBMISSION
document.getElementById('confirm-booking-btn').addEventListener('click', () => {
    const roomTypeSelect = document.getElementById('room-type');
    const checkin = document.getElementById('checkin').value;
    const checkout = document.getElementById('checkout').value;
    const guestName = document.getElementById('guest-name').value;
    const phone = document.getElementById('guest-phone').value;
    const total = calculateTotalPrice();

    if (!roomTypeSelect.value || !checkin || !checkout || !guestName || !phone || total === 0) {
        alert('Please fill out all required fields and ensure dates are valid.');
        return;
    }

    const roomFullName = getRoomName(roomTypeSelect.value);

    const newBooking = {
        id: 'BKR' + (Math.floor(Math.random() * 9000) + 1000), // Random ID
        guest: guestName,
        email: loggedInUser.email, 
        room: roomFullName,
        roomType: roomTypeSelect.value,
        checkin: checkin,
        checkout: checkout,
        type: roomTypeSelect.value.includes('cottage') ? 'daytour' : 'overnight',
        total: total,
        status: 'pending', // Default status upon creation
        created: new Date().toISOString(),
        extra: document.getElementById('guest-extra').value || 'None',
        gcashName: document.getElementById('guest-gcash-name').value,
        gcashNo: document.getElementById('guest-gcash-no').value,
        phone: phone,
        receipt: document.getElementById('guest-receipt').value || 'N/A'
    };

    // Add to mock database
    bookings.push(newBooking);
    window.globalBookings = bookings; // Update global array for admin.js

    alert(`Booking confirmed! ID: ${newBooking.id}. Please wait for admin approval (Pending status).`);
    document.getElementById('booking-form-data').reset();
    document.getElementById('guest-name').value = loggedInUser.name; // Restore name
    document.getElementById('total-display').textContent = 'Total: ₱0';
    renderBookings(); // Update history list
});


// 3. 🖱️ EVENT LISTENERS
document.getElementById('room-type').addEventListener('change', updatePrice);
document.getElementById('checkin').addEventListener('change', updatePrice);
document.getElementById('checkout').addEventListener('change', updatePrice);
document.getElementById('refresh-status-btn').addEventListener('click', renderBookings);

// Login/Register switch
document.getElementById('show-register').addEventListener('click', () => { showView('register-form'); });
document.getElementById('show-login').addEventListener('click', () => { showView('login-form'); });
document.getElementById('logout-link').addEventListener('click', () => { 
    loggedInUser = null; 
    showView('login-form'); 
    document.getElementById('login-form-data').reset();
    document.getElementById('total-display').textContent = 'Total: ₱0';
    document.getElementById('booking-alert').style.display = 'none'; // Hide alert on logout
});

// Initial Load: Check if there's a pending booking from URL
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const hasPending = params.get('room');

    if (hasPending) {
        showView('login-form'); 
        document.getElementById('booking-alert').style.display = 'block';
    } else {
        showView('login-form'); 
    }
    
    // Toggle Password Visibility
    document.querySelectorAll('.eye-toggle').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = this.closest('.password-group').querySelector('input');
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            this.querySelector('i').classList.toggle('fa-eye');
            this.querySelector('i').classList.toggle('fa-eye-slash');
        });
    });
});