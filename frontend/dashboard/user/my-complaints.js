document.addEventListener('DOMContentLoaded', function () {
    console.log('EXECUTION: my-complaints.js is running. Checking for window.api:', window.api);

    // --- DOM ELEMENT SELECTION ---
    const complaintsContainer = document.getElementById('complaints-container');
    const loadingSpinner = document.getElementById('loading-spinner');
    const errorMessage = document.getElementById('error-message');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const searchInput = document.getElementById('search-input');
    const currentDateEl = document.getElementById('current-date');
    const userProfileName = document.querySelector('.user-info h4');
    const userProfileRole = document.querySelector('.user-info p');
    const logoutButton = document.querySelector('.sidebar-nav .logout');

    let allComplaints = [];

    // --- DATA FETCHING & INITIALIZATION ---

    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.getElementById('sidebar');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            menuToggle.classList.toggle('active');
        });
    }

    // Main function to initialize the page
    async function initializePage() {
        updateDateTime();
        await loadUserData(); // Load user data first for the header
        await loadComplaints(); // Then load the complaints
    }

    // Fetches current user data to update the header
    async function loadUserData() {
        try {
            const response = await window.authAPI.getCurrentUser();
            if (response.success && response.data) {
                updateHeaderUI(response.data);
            }
        } catch (error) {
            console.error("Failed to load user data:", error);
            // The api-client will handle redirection on auth failure
        }
    }

    // Fetches and displays the user's complaints
    async function loadComplaints() {
        try {
            showLoading(true);
            showError(''); // Clear previous errors

            const response = await window.reportsAPI.getMyReports();

            if (response.success && response.data) {
                allComplaints = response.data;
                renderComplaints(allComplaints);
                updateStats(allComplaints);
            } else {
                renderComplaints([]);
                updateStats([]);
            }

        } catch (error) {
            console.error('Error loading complaints:', error);
            showError('Failed to load complaints. Please try again.');
        } finally {
            showLoading(false);
        }
    }

    // --- UI RENDERING & UPDATES ---
    // Function to capitalize the first letter of the role
    function capitalize(roleString) {
        if (typeof roleString !== 'string' || roleString.length === 0) {
            return '';
        }
        return roleString.charAt(0).toUpperCase() + roleString.slice(1);
    }

    // Updates the header with user's name and role
    function updateHeaderUI(user) {
        if (userProfileName) userProfileName.textContent = user.name || 'User';
        if (userProfileRole) userProfileRole.textContent = capitalize(user.role) || 'Citizen';
        // You might want to add a profile picture URL to your user model
        // if (userProfileImage && user.profileImageUrl) userProfileImage.src = user.profileImageUrl;
    }

    // Updates the date and time display
    function updateDateTime() {
        if (currentDateEl) {
            const now = new Date();
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            currentDateEl.textContent = now.toLocaleDateString('en-IN', options);
        }
    }

    // Renders the list of complaint tiles
    function renderComplaints(complaints) {
        if (!complaintsContainer) return;
        complaintsContainer.innerHTML = '';

        if (complaints.length === 0) {
            complaintsContainer.innerHTML = `
                <div class="no-complaints">
                    <i class="bi bi-inbox"></i>
                    <h3>No complaints found</h3>
                    <p>You haven't filed any complaints yet, or none match your filter.</p>
                    <a href="new-complaint.html" class="btn-primary">File New Complaint</a>
                </div>
            `;
            return;
        }

        complaints.forEach(complaint => {
            const complaintTile = createComplaintTile(complaint);
            complaintsContainer.appendChild(complaintTile);
        });
    }

    // Creates the HTML for a single complaint tile
    function createComplaintTile(complaint) {
        const tile = document.createElement('div');
        tile.className = 'complaint-tile';
        tile.dataset.complaintId = complaint._id;

        const createdDate = new Date(complaint.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
        const updatedDate = new Date(complaint.updatedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });

        const statusConfig = getStatusConfig(complaint.status);
        const priorityConfig = getPriorityConfig(complaint.priority);
        const categoryDisplayName = getCategoryDisplayName(complaint.categoryId);

        tile.innerHTML = `
            <div class="complaint-header">
                <div class="complaint-id">
                    <h4>#${complaint.reportId}</h4>
                    <span class="complaint-date">${createdDate}</span>
                </div>
                <div class="complaint-actions">
                    <button class="action-btn" onclick="toggleComplaintDetails('${complaint._id}')" title="View Details"><i class="bi bi-eye"></i></button>
                    <button class="action-btn" onclick="shareComplaint('${complaint._id}')" title="Share"><i class="bi bi-share"></i></button>
                    <div class="dropdown">
                        <button class="action-btn dropdown-toggle" onclick="toggleDropdown(this)"><i class="bi bi-three-dots-vertical"></i></button>
                        <div class="dropdown-menu">
                            <a href="#" onclick="downloadComplaint('${complaint._id}')"><i class="bi bi-download"></i> Download</a>
                            <a href="#" onclick="trackComplaint('${complaint._id}')"><i class="bi bi-geo-alt"></i> Track</a>
                        </div>
                    </div>
                </div>
            </div>
            <div class="complaint-content">
                <div class="complaint-image">
                    ${complaint.photo_url ? `<img src="${complaint.photo_url}" alt="Complaint photo" onclick="openImageModal('${complaint.photo_url}')">` : `<div class="no-image"><i class="bi bi-image"></i></div>`}
                </div>
                <div class="complaint-info">
                    <h3 class="complaint-title">${complaint.title || 'Untitled Complaint'}</h3>
                    <p class="complaint-description">${truncateText(complaint.description, 120)}</p>
                    <div class="complaint-meta">
                        <div class="meta-item"><i class="bi bi-tag"></i><span>${capitalize(categoryDisplayName)}</span></div>
                        <div class="meta-item"><i class="bi bi-geo-alt"></i><span>Lat: ${complaint.location_lat?.toFixed(4) || 'N/A'}, Lng: ${complaint.location_lng?.toFixed(4) || 'N/A'}</span></div>
                        <div class="meta-item"><i class="bi bi-clock"></i><span>Updated: ${updatedDate}</span></div>
                    </div>
                </div>
            </div>
            <div class="complaint-footer">
                <div class="status-priority">
                    <span class="status-badge status-${statusConfig.class}"><i class="bi bi-${statusConfig.icon}"></i> ${statusConfig.text}</span>
                    <span class="priority-badge priority-${priorityConfig.class}"><i class="bi bi-${priorityConfig.icon}"></i> ${priorityConfig.text}</span>
                </div>
                <div class="complaint-progress">
                    <div class="progress-bar"><div class="progress-fill" style="width: ${getProgressPercentage(complaint.status)}%"></div></div>
                    <span class="progress-text">${getProgressPercentage(complaint.status)}% Complete</span>
                </div>
            </div>
            <div class="complaint-details" id="details-${complaint._id}" style="display: none;">
                <div class="details-content">
                    <h4>Full Description</h4>
                    <p>${complaint.description}</p>
                    <button onclick="openMap(${complaint.location_lat}, ${complaint.location_lng})" class="btn-secondary"><i class="bi bi-map"></i> View on Map</button>
                </div>
            </div>
        `;
        return tile;
    }

    // Updates the stat cards at the top of the page
    function updateStats(complaints) {
        const stats = {
            total: complaints.length,
            pending: complaints.filter(c => c.status === 'pending').length,
            inProgress: complaints.filter(c => c.status === 'in_progress').length,
            resolved: complaints.filter(c => c.status === 'resolved').length
        };
        Object.keys(stats).forEach(key => {
            const el = document.getElementById(`stat-${key}`);
            if (el) el.textContent = stats[key];
        });
    }

    // --- UTILITY & HELPER FUNCTIONS ---

    function getCategoryDisplayName(categoryObject) {
        if (!categoryObject || typeof categoryObject !== 'object') return 'Uncategorized';
        return categoryObject.name || 'Unknown Category';
    }

    function getStatusConfig(status) {
        const configs = { 'pending': { class: 'pending', icon: 'clock', text: 'Pending' }, 'in_progress': { class: 'progress', icon: 'gear', text: 'In Progress' }, 'resolved': { class: 'resolved', icon: 'check-circle', text: 'Resolved' }, 'rejected': { class: 'rejected', icon: 'x-circle', text: 'Rejected' } };
        return configs[status] || configs['pending'];
    }

    function getPriorityConfig(priority) {
        const configs = { 'low': { class: 'low', icon: 'chevron-down', text: 'Low' }, 'medium': { class: 'medium', icon: 'dash', text: 'Medium' }, 'high': { class: 'high', icon: 'chevron-up', text: 'High' }, 'urgent': { class: 'urgent', icon: 'exclamation-triangle', text: 'Urgent' } };
        return configs[priority] || configs['medium'];
    }

    function getProgressPercentage(status) {
        const progress = { 'pending': 25, 'in_progress': 60, 'resolved': 100, 'rejected': 0 };
        return progress[status] || 0;
    }

    function truncateText(text, length) {
        if (!text) return 'No description provided.';
        return text.length > length ? text.substring(0, length) + '...' : text;
    }

    function showLoading(show) { if (loadingSpinner) loadingSpinner.style.display = show ? 'block' : 'none'; }
    function showError(message) { if (errorMessage) { errorMessage.textContent = message; errorMessage.style.display = message ? 'block' : 'none'; } }

    const notificationButton = document.getElementById('notification-link');

    notificationButton.addEventListener('click', () => {
        window.location.href = 'notifications.html';
    });

    // Logout function
    function initializeLogoutButtons() {
        // Find all possible logout elements
        const logoutButtons = document.querySelectorAll('.logout, .logout-btn, [data-action="logout"]');
        const logoutLinks = document.querySelectorAll('a[href*="logout"], a.logout');

        // Attach logout to all logout buttons
        logoutButtons.forEach(button => {
            button.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                logout();
            });
        });

        // Attach logout to all logout links
        logoutLinks.forEach(link => {
            link.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                logout();
            });
        });

        // Add keyboard shortcut for logout (Ctrl+Alt+L)
        document.addEventListener('keydown', function (e) {
            if (e.ctrlKey && e.altKey && e.key === 'l') {
                e.preventDefault();
                logout();
            }
        });

        console.log(`Logout functionality attached to ${logoutButtons.length + logoutLinks.length} elements`);
    }


    // Auto-logout on token expiration
    function checkTokenExpiration() {
        const token = localStorage.getItem('token');

        if (!token) {
            console.log('No token found, redirecting to login');
            window.location.href = '../../login.html';
            return;
        }

        try {
            // Decode JWT token to check expiration
            const payload = JSON.parse(atob(token.split('.')[1]));
            const currentTime = Math.floor(Date.now() / 1000);

            if (payload.exp && payload.exp < currentTime) {
                console.log('Token expired, auto-logging out');
                alert('Your session has expired. Please log in again.');
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '../../login.html';
            }
        } catch (error) {
            console.error('Error checking token expiration:', error);
            // If token is malformed, clear it and redirect
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '../../login.html';
        }
    }

    // Initialize logout functionality
    initializeLogoutButtons();

    // Check token expiration immediately
    checkTokenExpiration();

    // Check token expiration every hour
    setInterval(checkTokenExpiration, 60 * 60 * 1000);

    console.log('Token expiration check initialized');
    // --- INTERACTIVE FUNCTIONS (attached to window for inline HTML onclick) ---

    window.toggleComplaintDetails = function (complaintId) {
        const detailsElement = document.getElementById(`details-${complaintId}`);
        if (!detailsElement) return;
        const isVisible = detailsElement.style.display !== 'none';
        document.querySelectorAll('.complaint-details').forEach(details => { if (details !== detailsElement) details.style.display = 'none'; });
        detailsElement.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) detailsElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    window.shareComplaint = function (complaintId) { /* ... implementation ... */ };
    window.downloadComplaint = function (complaintId) { alert(`Downloading report for complaint ID: ${complaintId}`); };
    window.trackComplaint = function (complaintId) { alert(`Tracking complaint ID: ${complaintId}`); };

    window.toggleDropdown = function (button) {
        const dropdown = button.nextElementSibling;
        const isOpen = dropdown.style.display === 'block';
        document.querySelectorAll('.dropdown-menu').forEach(menu => menu.style.display = 'none');
        if (!isOpen) dropdown.style.display = 'block';
    };

    window.openImageModal = function (imageUrl) { /* ... implementation ... */ };

    window.openMap = function (lat, lng) {
        const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
        window.open(mapUrl, '_blank');
    };

    // --- EVENT LISTENERS ---

    // Filter buttons
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const filter = button.dataset.filter;
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const filtered = (filter === 'all') ? allComplaints : allComplaints.filter(c => c.status === filter);
            renderComplaints(filtered);
        });
    });

    // Search input
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const searchResults = allComplaints.filter(c =>
                c.title?.toLowerCase().includes(searchTerm) ||
                c.description?.toLowerCase().includes(searchTerm) ||
                c.reportId?.toLowerCase().includes(searchTerm) ||
                getCategoryDisplayName(c.categoryId).toLowerCase().includes(searchTerm)
            );
            renderComplaints(searchResults);
        });
    }

    // Logout button
    if (logoutButton) {
        logoutButton.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                // Clear all authentication data from localStorage
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('refreshToken');

                // Clear all session storage
                sessionStorage.clear();

                // Clear any cached data
                allComplaints = [];

                // Clear any cookies (if using httpOnly cookies)
                document.cookie.split(";").forEach(function (c) {
                    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                });

                console.log('User logged out successfully - all data cleared');

                // Redirect to login page
                window.location.href = '../../index.html';

            } catch (error) {
                console.error('Logout error:', error);

                // Even if there's an error, clear local data and redirect
                localStorage.clear();
                sessionStorage.clear();
                console.log('Forced logout due to error - all data cleared');
                alert('Logged out successfully');
                window.location.href = '../../login.html';
            }
        }
        );
    }

    // Global click listener to close dropdowns
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown-menu').forEach(menu => menu.style.display = 'none');
        }
    });

    // --- INITIALIZE THE PAGE ---
    initializePage();
});