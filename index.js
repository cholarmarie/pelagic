// index.js (External JavaScript file)

// --- Authentication UI Control ---
function checkAuthState() {
    const user = sessionStorage.getItem('pelagic_user');
    const navAuthBtn = document.getElementById('nav-auth-btn');
    const logoutBtn = document.getElementById('logout-btn');
    
    if (user) {
        // User is logged in
        const userName = JSON.parse(user).name || 'User';
        
        // Show personalized welcome/profile link
        navAuthBtn.textContent = `Welcome, ${userName}`;
        navAuthBtn.href = "profile.html"; 
        navAuthBtn.style.display = 'inline-block';

        // Show the Logout button
        logoutBtn.style.display = 'inline-block';
        
    } else {
        // User is logged out
        navAuthBtn.textContent = 'Log In / Register';
        navAuthBtn.href = "profile.html"; 
        navAuthBtn.style.display = 'inline-block';

        // Hide the Logout button
        logoutBtn.style.display = 'none';
    }
}

function handleLogout() {
    sessionStorage.removeItem('pelagic_user');
    alert('You have been logged out.');
    checkAuthState(); // Update the navigation bar immediately
}

// --- Room Fetching Logic ---
async function renderIndexRooms() {
    const list = document.getElementById('rooms-list');
    list.innerHTML = '<div style="text-align:center; width:100%; grid-column:1/-1;">Loading rooms from the server...</div>';

    try {
        const response = await fetch('/.netlify/functions/get-rooms');
        
        if (!response.ok) {
             throw new Error(`Failed to fetch rooms: ${response.statusText || response.status}. Check Netlify logs/MONGO_URI.`);
        }

        const rooms = await response.json();
        
        if (rooms.length === 0) {
            list.innerHTML = '<div style="text-align:center; grid-column:1/-1;">No rooms currently available in the database.</div>';
            return;
        }

        const placeholder = "https://via.placeholder.com/400x250?text=Room+Photo";
        list.innerHTML = ''; // Clear loading message

        rooms.forEach(r => {
            const card = document.createElement('article');
            card.className = 'room-card';

            const bookingLink = `profile.html?room=${r._id}`;

            card.innerHTML = `
                <img src="${r.image && r.image.length > 100 ? r.image : placeholder}" alt="${r.name}">
                <div class="card-body">
                    <h3>${r.name}</h3>
                    <p class="room-desc">${r.desc}</p>
                    <div class="room-amenities">${r.amenities ? r.amenities.split(',').map(a => `<span>${a.trim()}</span>`).join('') : ''}</div>
                    <div class="price-info">
                        <span class="price">₱ ${Number(r.price).toLocaleString()}</span> / ${r.type === 'overnight' ? 'Night' : 'Day'}
                    </div>
                    <a href="${bookingLink}" class="btn book-btn small-btn" style="float:right;">Book This Room</a>
                </div>
            `;
            list.appendChild(card);
        });

    } catch (error) {
        console.error("Error loading rooms:", error);
        list.innerHTML = `<div style="text-align:center; color:red; grid-column:1/-1; padding:20px;">
            Error fetching rooms. Please check your Netlify Function configuration.
        </div>`;
    }
}


// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Render Rooms on the homepage
    if (document.getElementById('rooms-list')) {
        renderIndexRooms();
    }
    
    // 2. Set up Auth State
    checkAuthState();

    // 3. Attach Logout Listener
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
});
