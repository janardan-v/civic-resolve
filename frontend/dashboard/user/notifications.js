document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    const currentDateEl = document.getElementById('current-date');
    const container = document.getElementById('notifications-container');
    const loadingSpinner = document.getElementById('loading-spinner');
    const errorMessage = document.getElementById('error-message');
    const markAllReadBtn = document.getElementById('mark-all-read-btn');

    let allNotifications = [];

    // --- DATA FETCHING & RENDERING ---

    async function loadNotifications() {
        showLoading(true);
        showError('');
        try {
            const response = await window.notificationsAPI.getMyNotifications();
            if (response.success && response.data) {
                allNotifications = response.data;
                renderNotifications(allNotifications);
            } else {
                renderNotifications([]);
            }
        } catch (error) {
            console.error('Failed to load notifications:', error);
            showError('Could not load notifications. Please try again.');
        } finally {
            showLoading(false);
        }
    }

    function renderNotifications(notifications) {
        if (!container) return;
        container.innerHTML = '';

        if (notifications.length === 0) {
            container.innerHTML = `
                <div class="no-notifications">
                    <i class="bi bi-check-circle"></i>
                    <h3>You're all caught up!</h3>
                    <p>You have no new notifications.</p>
                </div>`;
            return;
        }

        notifications.forEach(notification => {
            const notificationEl = createNotificationElement(notification);
            container.appendChild(notificationEl);
        });
    }

    function createNotificationElement(notification) {
        const el = document.createElement('div');
        el.className = `notification-item ${notification.status}`; // status will be 'read' or 'unread'
        el.dataset.id = notification.notificationId; // Use the UUID for actions

        const iconClass = getIconForType(notification.type);
        const timeAgo = formatTimeAgo(notification.createdAt);

        el.innerHTML = `
            <div class="icon">
                <i class="bi ${iconClass}"></i>
            </div>
            <div class="content">
                <p>${notification.message}</p>
                <div class="meta">
                    <span>Relates to report: <strong>${notification.reportId.title}</strong></span>
                    <span style="margin-left: 10px;">- ${timeAgo}</span>
                </div>
            </div>
            <div class="actions">
                ${notification.status !== 'read' ? `<button class="mark-read-btn" title="Mark as read"><i class="bi bi-check-lg"></i></button>` : ''}
            </div>
        `;

        // Add event listener for the mark-as-read button
        const markReadBtn = el.querySelector('.mark-read-btn');
        if (markReadBtn) {
            markReadBtn.addEventListener('click', async (e) => {
                e.stopPropagation(); // Prevent any parent click events
                await markOneAsRead(notification.notificationId, el);
            });
        }

        return el;
    }

    // --- ACTIONS ---

    async function markOneAsRead(notificationId, element) {
        try {
            const response = await window.notificationsAPI.markAsRead(notificationId);
            if (response.success) {
                element.classList.remove('unread');
                element.classList.add('read');
                const button = element.querySelector('.mark-read-btn');
                if (button) button.remove(); // Remove the button after marking as read
            }
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    }

    async function markAllAsRead() {
        const unreadNotifications = allNotifications.filter(n => n.status !== 'read');
        if (unreadNotifications.length === 0) {
            return;
        }

        // Create a list of promises for all the API calls
        const promises = unreadNotifications.map(n => window.notificationsAPI.markAsRead(n.notificationId));

        try {
            await Promise.all(promises);
            // If all promises resolve, reload the notifications from the server
            await loadNotifications();
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
        }
    }


    // --- HELPERS ---
    function updateDateTime() {
        if (currentDateEl) {
            const now = new Date();
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            currentDateEl.textContent = now.toLocaleDateString('en-IN', options);
        }
    }

    function showLoading(show) { if (loadingSpinner) loadingSpinner.style.display = show ? 'block' : 'none'; }
    function showError(message) { if (errorMessage) { errorMessage.textContent = message; errorMessage.style.display = message ? 'block' : 'none'; } }

    function getIconForType(type) {
        switch (type) {
            case 'reminder': return 'bi-alarm';
            case 'status_update': return 'bi-arrow-repeat';
            case 'new_assignment': return 'bi-person-check';
            default: return 'bi-bell';
        }
    }

    function formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";
        return Math.floor(seconds) + " seconds ago";
    }

    // Function to capitalize the first letter of the role
    function capitalize(roleString) {
        if (typeof roleString !== 'string' || roleString.length === 0) {
            return '';
        }
        return roleString.charAt(0).toUpperCase() + roleString.slice(1);
    }

    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.getElementById('sidebar');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            menuToggle.classList.toggle('active');
        });
    }

    async function updateProfileHeader() {
        const userNameElement = document.getElementById('user-name');
        const userRoleElement = document.getElementById('user-role');

        // Initial check for element existence
        if (!userNameElement || !userRoleElement) {
            console.error('User profile elements not found in the DOM.');
            return;
        }

        try {
            // Call the getCurrentUser API method
            const response = await window.authAPI.getCurrentUser();

            // Check if the API call was successful
            if (response.success && response.data) {
                const userData = response.data;

                // Update the text content of the HTML elements
                userNameElement.textContent = userData.name || userData.username || 'User';
                userRoleElement.textContent = capitalize(userData.role) || 'Unknown Role';

            } else {
                // Handle unsuccessful response
                console.error('Failed to fetch user data:', response.message);
                userNameElement.textContent = 'Guest';
                userRoleElement.textContent = '';
            }
        } catch (error) {
            // Handle network or other errors
            console.error('Error fetching user profile:', error);
            userNameElement.textContent = 'Guest';
            userRoleElement.textContent = '';
        }
    }

    // Call the function on page load
    updateProfileHeader();

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


    // --- EVENT LISTENERS ---

    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', markAllAsRead);
    }

    // --- ADD THIS LOGOUT LOGIC ---
    const logoutButton = document.querySelector('.sidebar .logout');

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
        });
    }

    // Initial Load
    loadNotifications();
    updateDateTime();
});