// FILENAME: homepage.js
// COMBINED CODE: Pelagic Beach Resort Public Homepage + User Menu + Realtime Bookings + Booking Modal with Upload

// ==================== FIREBASE SETUP ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    updateProfile // For user registration name
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
    getFirestore,
    collection,
    query,
    onSnapshot,
    where,
    orderBy,
    limit,
    serverTimestamp,
    doc,
    setDoc,
    addDoc // For Booking submission
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL // For image upload
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";

// Firebase Config (User's provided config)
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
const storage = getStorage(app); // Initialize Storage
// DOM Helper
const $ = (id) => document.getElementById(id);


// ==================== AUTH MODAL (Login/Register) ====================
// Ito ang HTML para sa Login/Register Modal. Awtomatikong mag-i-inject ito sa body.
const modalHTML = `
<div id="auth-modal" class="modal hidden">
  <div class="modal-content">
    <span id="close-modal" style="float:right;cursor:pointer;font-size:28px;font-weight:bold;">&times;</span>
    
    <div id="login-view">
      <h2>Welcome Back</h2>
      <form id="login-form">
        <input type="email" id="login-email" placeholder="Email" required />
        <div style="position:relative">
          <input type="password" id="login-pass" placeholder="Password" required />
          <span class="eye-toggle">Show</span>
        </div>
        <button type="submit">Log In</button>
        <p style="margin:12px 0;font-size:14px;text-align:center;">
          New here? <a href="#" id="switch-to-register" style="color:#0b7db0;font-weight:600;">Create an account</a>
        </p>
      </form>
    </div>

    <div id="register-view" class="hidden">
      <h2>Create Account</h2>
      <form id="register-form">
        <input type="text" id="reg-name" placeholder="Full Name" required />
        <input type="email" id="reg-email" placeholder="Email" required />
        <input type="tel" id="reg-phone" placeholder="Phone (optional)" />
        <div style="position:relative">
          <input type="password" id="reg-pass" placeholder="Password (6+ chars)" minlength="6" required />
          <span class="eye-toggle">Show</span>
        </div>
        <div style="position:relative">
          <input type="password" id="reg-conf" placeholder="Confirm Password" required />
          <span class="eye-toggle">Show</span>
        </div>
        <button type="submit">Create Account</button>
        <p style="margin:12px 0;font-size:14px;text-align:center;">
          Have an account? <a href="#" id="switch-to-login" style="color:#0b7db0;font-weight:600;">Log in</a>
        </p>
      </form>
    </div>
  </div>
</div>`;

document.body.insertAdjacentHTML('beforeend', modalHTML + `
<style>
  .modal{position:fixed;inset:0;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;z-index:9999;opacity:0;pointer-events:none;transition:opacity .3s}
  .modal:not(.hidden){opacity:1;pointer-events:all}
  .modal-content{background:#fff;padding:32px;border-radius:16px;width:90%;max-width:420px;box-shadow:0 20px 40px rgba(0,0,0,0.2);position:relative;animation:modalIn .3s forwards}
  @keyframes modalIn{from{transform:scale(0.9);opacity:0}to{transform:scale(1);opacity:1}}
  .modal input, .modal button{width:100%;padding:14px;margin:10px 0;border-radius:10px;border:1px solid #ddd;font-size:15px}
  .modal button{background:#0b7db0;color:white;font-weight:700;cursor:pointer;transition:background .2s}
  .modal button:hover{background:#095a80}
  .eye-toggle{position:absolute;right:14px;top:50%;transform:translateY(-50%);cursor:pointer;color:#666;font-size:14px;user-select:none}
  .hidden{display:none!important}
</style>`);

// Elements
const authModal = $('#auth-modal');
const loginView = $('#login-view');
const registerView = $('#register-view');
const userLink = $('#user-icon-link');
const userDropdown = $('#user-dropdown');
const userDisplay = $('#user-name-display');
const menuLogin = $('#menu-login');
const menuLogout = $('#menu-logout');
const bookingsContainer = $('#dropdown-bookings-container');
const bookingsList = $('#dropdown-bookings-list');

let currentBookingData = {}; // Temp storage for room info
let currentUserData = {}; // Store user profile data

// --- AUTH MODAL CONTROLS ---
function openAuthModal() { authModal.classList.remove('hidden'); }
function closeAuthModal() { authModal.classList.add('hidden'); }
$('#close-modal')?.addEventListener('click', closeAuthModal);
authModal.addEventListener('click', (e) => e.target === authModal && closeAuthModal());

$('#switch-to-register')?.addEventListener('click', (e) => { e.preventDefault(); loginView.classList.add('hidden'); registerView.classList.remove('hidden'); });
$('#switch-to-login')?.addEventListener('click', (e) => { e.preventDefault(); registerView.classList.add('hidden'); loginView.classList.remove('hidden'); });

// --- DROPDOWN CONTROLS ---
userLink?.addEventListener('click', (e) => {
    e.preventDefault();
    userDropdown.style.display = userDropdown.style.display === 'block' ? 'none' : 'block';
});
document.addEventListener('click', (e) => {
    if (userLink && !userLink.contains(e.target) && userDropdown && !userDropdown.contains(e.target)) {
        userDropdown.style.display = 'none';
    }
});
menuLogin?.addEventListener('click', (e) => { e.preventDefault(); openAuthModal(); userDropdown.style.display = 'none'; });
menuLogout?.addEventListener('click', async (e) => { e.preventDefault(); await signOut(auth); userDropdown.style.display = 'none'; });

// --- REALTIME BOOKINGS SA DROPDOWN ---
let bookingsUnsub = null;
function loadUserBookings(user) {
    if (!bookingsList || !bookingsContainer) return;
    bookingsContainer.style.display = 'block';

    // 1. Fetch User Profile Data
    const userDocRef = doc(db, 'users', user.uid);
    onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
            currentUserData = docSnap.data();
            const name = currentUserData.name || user.email.split('@')[0];
            userDisplay.textContent = name.length > 14 ? name.substring(0, 14) + '..' : name;
        }
    });

    // 2. Fetch User Bookings
    if (bookingsUnsub) bookingsUnsub();
    const q = query(
        collection(db, 'bookings'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(5)
    );

    bookingsUnsub = onSnapshot(q, (snap) => {
        if (snap.empty) {
            bookingsList.innerHTML = `<div style="padding:16px;text-align:center;color:#999;font-size:13px;">No bookings yet</div>`;
            return;
        }
        bookingsList.innerHTML = '';
        snap.docs.forEach(doc => {
            const d = doc.data();
            const checkin = new Date(d.checkIn).toLocaleDateString();
            const checkout = new Date(d.checkOut).toLocaleDateString();
            const statusColor = { pending: '#e67e22', approved: '#27ae60', declined: '#e74c3c', completed: '#95a5a6' }[(d.status || 'pending').toLowerCase()];

            bookingsList.insertAdjacentHTML('beforeend', `
                <div class="booking-item">
                    <div style="font-weight:600;color:#2c3e50;">${d.roomName || 'Room'}</div>
                    <div style="color:#7f8c8d;font-size:12px;margin:3px 0;">
                        ${checkin} → ${checkout}
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
                        <span style="font-weight:700;color:#0b7db0;">${d.price}</span>
                        <span style="font-size:10px;padding:3px 8px;background:${statusColor};color:white;border-radius:4px;">
                            ${(d.status || 'pending').toUpperCase()}
                        </span>
                    </div>
                </div>
            `);
        });
    });
}

// --- AUTH STATE (MAIN LOGIC) ---
onAuthStateChanged(auth, (user) => {
    const nameInput = $('#inp-name');
    const contactInput = $('#inp-contact');

    if (user) {
        menuLogin.style.display = 'none';
        menuLogout.style.display = 'block';
        loadUserBookings(user);
        
        // Hide name/contact fields if present (assuming they are in the booking modal)
        if (nameInput) nameInput.closest('.form-group').classList.add('hidden');
        if (contactInput) contactInput.closest('.form-group').classList.add('hidden');
    } else {
        userDisplay.textContent = 'Guest';
        menuLogin.style.display = 'block';
        menuLogout.style.display = 'none';
        bookingsContainer.style.display = 'none';
        currentUserData = {};
        if (bookingsUnsub) { bookingsUnsub(); bookingsUnsub = null; }

        // Show name/contact fields
        if (nameInput) nameInput.closest('.form-group').classList.remove('hidden');
        if (contactInput) contactInput.closest('.form-group').classList.remove('hidden');
    }
});

// --- LOGIN & REGISTER HANDLERS ---
$('#login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#login-email').value.trim();
    const pass = $('#login-pass').value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        closeAuthModal();
    } catch (err) {
        alert('Invalid email or password');
    }
});

$('#register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#reg-name').value.trim() || 'Guest';
    const email = $('#reg-email').value.trim().toLowerCase();
    const phone = $('#reg-phone').value.trim();
    const pass = $('#reg-pass').value;
    const conf = $('#reg-conf').value;

    if (pass !== conf) return alert("Passwords don't match");
    if (pass.length < 6) return alert("Password too short");

    try {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        await updateProfile(cred.user, { displayName: name });
        await setDoc(doc(db, 'users', cred.user.uid), { 
            name, 
            email, 
            phone: phone || 'N/A', 
            role: 'user', 
            createdAt: serverTimestamp() 
        });
        alert('Welcome to Pelagic Beach Resort!');
        closeAuthModal();
    } catch (err) {
        alert(err.code === 'auth/email-already-in-use' ? 'Email already registered' : 'Registration failed');
    }
});


// ==================== BOOKING MODAL LOGIC (New Design & Upload) ====================

// Modal Functions (Global scope para magamit ng HTML onclick)
window.openBookingModal = function(name, price, imageUrl) {
    currentBookingData = { name, price, imageUrl };

    document.getElementById('bookingModal').style.display = 'flex';
    document.getElementById('popup-room-name').innerText = name;
    document.getElementById('popup-price').innerText = '₱ ' + price.toLocaleString();
    document.getElementById('popup-image').src = imageUrl;
    
    const now = new Date().toISOString().slice(0, 16);
    document.getElementById('inp-checkin').min = now;
    
    // Autofill guest info if logged in
    const user = auth.currentUser;
    if (user && currentUserData.name) {
        $('#inp-name').value = currentUserData.name;
        $('#inp-contact').value = currentUserData.phone || 'N/A';
    } else {
        $('#inp-name').value = '';
        $('#inp-contact').value = '';
    }
}

window.closeModal = function() {
    document.getElementById('bookingModal').style.display = 'none';
}

window.setStayType = function(type, btn) {
    document.getElementById('inp-stay-type').value = type;
    document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

window.updateFileName = function(input) {
    if(input.files && input.files[0]) {
        document.getElementById('file-label').innerText = "Selected: " + input.files[0].name;
    }
}

// --- SUBMIT BOOKING LOGIC ---
document.getElementById('booking-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) {
        alert("Please log in or register first before completing your booking.");
        closeModal(); 
        openAuthModal(); 
        return;
    }

    const btn = document.getElementById('btn-submit');
    const msg = document.getElementById('loading-msg');
    btn.disabled = true;
    btn.innerText = "Processing...";
    msg.style.display = 'block';

    try {
        // 1. Upload Image First
        const fileInput = document.getElementById('inp-receipt');
        const file = fileInput.files[0];
        if (!file) { 
            alert("Please upload proof of payment (GCash receipt)."); 
            btn.disabled = false; btn.innerText = "Book Now"; msg.style.display = 'none';
            return; 
        }

        const storageRef = ref(storage, `receipts/${user.uid}/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);

        // 2. Save Data to Firestore (Database)
        const bookingData = {
            userId: user.uid, // ⭐ Attach User ID ⭐
            roomName: currentBookingData.name,
            price: currentBookingData.price.toLocaleString(),
            guestName: $('#inp-name').value || (currentUserData.name || user.displayName),
            contact: $('#inp-contact').value || (currentUserData.phone || 'N/A'),
            email: user.email, 
            stayType: document.getElementById('inp-stay-type').value,
            checkIn: document.getElementById('inp-checkin').value,
            checkOut: document.getElementById('inp-checkout').value,
            extraCharge: document.getElementById('inp-extra').value,
            senderGcashName: document.getElementById('inp-sender-name').value,
            senderGcashNo: document.getElementById('inp-sender-no').value,
            proofOfPaymentUrl: downloadURL,
            status: 'Pending',
            createdAt: serverTimestamp() // Use Firestore Server Timestamp
        };

        await addDoc(collection(db, "bookings"), bookingData);

        alert("Booking Successful! Please wait for confirmation.");
        closeModal();
        document.getElementById('booking-form').reset();
        document.getElementById('file-label').innerText = "Upload screenshot of receipt";
        
        loadUserBookings(user); 

    } catch (error) {
        console.error("Booking Error:", error);
        alert("Something went wrong during booking. Please try again.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Book Now";
        msg.style.display = 'none';
    }
});

console.log("Pelagic Homepage Fully Loaded — Professional & Ready!");