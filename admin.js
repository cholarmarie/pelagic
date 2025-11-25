// --- ADMIN.JS CORE LOGIC ---

// Utility function to switch dashboard panels
window.switchTab = function(tabName) {
    // 1. Hide all panels and remove active class from all buttons
    document.querySelectorAll('.panel').forEach(panel => panel.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    // 2. Show the selected panel and set the button active
    document.getElementById(`panel-${tabName}`).classList.remove('hidden');
    document.querySelector(`.tab-btn[onclick="switchTab('${tabName}')"]`).classList.add('active');

    // 3. Render tables for the active tab (important for gallery)
    if (tabName === 'gallery') {
        renderGalleryTable();
    }
    // You'd add calls here for other tables like renderBookingTable(), renderRoomTable(), etc.
}

// Utility function to close a modal
window.closeModal = function(modalId) {
    document.getElementById(modalId).classList.add('hidden');
    // Reset forms on close
    if (modalId === 'gallery-modal') {
        document.getElementById('gallery-form').reset();
        document.getElementById('g-preview').style.display = 'none';
    }
    // You would add resets for other modals here
}

// --- GALLERY MANAGEMENT FUNCTIONS ---

// Initializes the gallery photos from localStorage, or an empty array if none exist.
let galleryPhotos = JSON.parse(localStorage.getItem('galleryPhotos')) || [
    // Pre-populate with some sample data using placeholders (Base64 data is heavy, so we use placeholders)
    { id: 101, url: 'https://via.placeholder.com/80x50?text=Beach', caption: 'The beautiful beachfront', date: '2025-01-10' },
    { id: 102, url: 'https://via.placeholder.com/80x50?text=Room', caption: 'Luxury Suite Interior', date: '2025-02-15' }
];

// Saves the current galleryPhotos array back to localStorage.
function saveGalleryPhotos() {
    localStorage.setItem('galleryPhotos', JSON.stringify(galleryPhotos));
    renderGalleryTable();
}

// Renders the list of photos in the admin table.
function renderGalleryTable() {
    const tableBody = document.getElementById('gallery-table');
    tableBody.innerHTML = ''; // Clear previous rows

    if (galleryPhotos.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No gallery photos found.</td></tr>';
        return;
    }

    galleryPhotos.forEach(photo => {
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${photo.id}</td>
            <td><img src="${photo.url}" alt="${photo.caption}" class="gallery-img-thumb"></td>
            <td>${photo.caption}</td>
            <td>${photo.date}</td>
            <td>
                <button class="btn btn-small" onclick="editGalleryPhoto(${photo.id})">Edit</button>
                <button class="btn btn-small btn-danger" onclick="deleteGalleryPhoto(${photo.id})">Delete</button>
            </td>
        `;
    });
}

// Function to open the Add/Edit Modal
window.openGalleryModal = function(photoId = null) {
    document.getElementById('gallery-modal').classList.remove('hidden');
    const title = document.getElementById('gallery-modal-title');
    const idField = document.getElementById('edit-gallery-id');
    const captionField = document.getElementById('g-caption');
    const photoField = document.getElementById('g-photo');
    const preview = document.getElementById('g-preview');
    
    // Reset modal fields first
    document.getElementById('gallery-form').reset();
    preview.style.display = 'none';
    photoField.setAttribute('required', 'required');

    if (photoId) {
        const photo = galleryPhotos.find(p => p.id === photoId);
        if (photo) {
            title.textContent = 'Edit Photo';
            idField.value = photoId;
            captionField.value = photo.caption;
            photoField.removeAttribute('required'); // Don't require file upload on edit
            preview.src = photo.url;
            preview.style.display = 'block';
        }
    } else {
        title.textContent = 'Add Gallery Photo';
        idField.value = '';
    }
}

// Alias for edit button
window.editGalleryPhoto = function(id) {
    openGalleryModal(id);
}

// Function to delete a photo
window.deleteGalleryPhoto = function(id) {
    if (confirm('Are you sure you want to delete this photo? This cannot be undone.')) {
        // Filter out the photo with the matching ID
        galleryPhotos = galleryPhotos.filter(p => p.id !== id);
        saveGalleryPhotos();
        alert('Photo deleted.');
    }
}

// Handles file input change for showing the preview image
document.getElementById('g-photo').addEventListener('change', function(event) {
    const preview = document.getElementById('g-preview');
    if (event.target.files && event.target.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(event.target.files[0]); // Read file as Data URL (Base64)
    } else {
        preview.style.display = 'none';
        preview.src = '';
    }
});


// Form submission handler for saving/editing photos
document.getElementById('gallery-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const id = document.getElementById('edit-gallery-id').value;
    const caption = document.getElementById('g-caption').value;
    const photoFile = document.getElementById('g-photo').files[0];
    
    // Use the FileReader to handle the file asynchronously
    const handleSave = (url) => {
        if (id) {
            // EDIT: Update existing photo
            const index = galleryPhotos.findIndex(p => p.id === parseInt(id));
            if (index !== -1) {
                galleryPhotos[index].caption = caption;
                if (url) {
                    galleryPhotos[index].url = url; // Update URL only if a new file was uploaded
                }
            }
        } else {
            // ADD: Create new photo
            const newPhoto = {
                id: Date.now(), // Unique ID
                url: url,
                caption: caption,
                date: new Date().toLocaleDateString('en-US'),
            };
            galleryPhotos.unshift(newPhoto);
        }
        saveGalleryPhotos();
        closeModal('gallery-modal');
    };

    if (photoFile) {
        // If a new file is uploaded (or adding a new photo)
        const reader = new FileReader();
        reader.onload = function(e) {
            handleSave(e.target.result);
        };
        reader.readAsDataURL(photoFile);
    } else if (id) {
        // If editing but no new file is uploaded (only changing caption)
        handleSave(null);
    } else {
        // Should not happen if 'required' attribute is set correctly on add
        alert('Please select a photo to upload.');
    }
});


// --- ADMIN LOGIN SIMULATION (Keep this logic if it exists) ---
document.addEventListener('DOMContentLoaded', () => {
    // Check for a simulated logged-in admin
    const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn') === 'true';
    if (isAdminLoggedIn) {
        document.getElementById('admin-login').classList.add('hidden');
        document.getElementById('admin-dashboard').classList.remove('hidden');
    }

    // Admin Login Form
    document.getElementById('admin-login-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('admin-email').value;
        const password = document.getElementById('admin-pass').value;

        // Simple hardcoded admin check
        if (email === 'admin@pelagic.com' && password === 'admin123') {
            localStorage.setItem('isAdminLoggedIn', 'true');
            window.location.reload(); // Reloads to show dashboard
        } else {
            alert('Invalid Admin Credentials');
        }
    });

    // Admin Logout Button
    document.getElementById('admin-logout')?.addEventListener('click', () => {
        localStorage.removeItem('isAdminLoggedIn');
        window.location.reload();
    });

    // Initial render for the Gallery table (in case the Gallery tab is the default)
    renderGalleryTable();
});

// Add these to ensure the modals and utility functions are globally available
window.openRoomModal = function() {
    document.getElementById('room-modal').classList.remove('hidden');
    // Add logic here to load room data for editing
}
window.saveBackground = function() {
    alert('Saving background image is simulated. In a real app, this would upload the file.');
}
