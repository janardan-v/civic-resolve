document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM loaded, initializing dynamic admin dashboard...');

    // --- CHART INSTANCES ---
    let categoryChart, resolutionChart;

    // --- GLOBAL STATE ---
    let allComplaints = []; // Will hold all complaints fetched from the API
    let filteredComplaints = [];
    let currentPage = 1;
    const itemsPerPage = 5;

    let map;
    let marker;

    // --- DOM ELEMENT SELECTION ---
    const statCardsContainer = document.querySelector('.stats-cards');
    const issuesTbody = document.getElementById('issues-tbody');
    const statusFilter = document.getElementById('status-filter');
    const categoryFilter = document.getElementById('category-filter');
    const priorityFilterBtn = document.querySelector('.priority-filter');
    const paginationContainer = document.querySelector('.pagination');
    const recentActivityList = document.querySelector('.recent-activity .activity-list');

    // --- INITIALIZATION ---
    async function initializeDashboard() {
        checkTokenExpiration(); // Your custom auth check
        initializeCharts(); // Create empty charts first
        setupModalFunctionality();
        setupFilters();

        try {
            // Fetch analytics and all reports data in parallel
            const [analyticsResponse, reportsResponse] = await Promise.all([
                window.analyticsAPI.getDashboardData(),
                window.reportsAPI.getAllReports()
            ]);

            // Populate page with fetched data
            if (analyticsResponse.success && analyticsResponse.data) {
                updateStatCards(analyticsResponse.data);
                updateCharts(analyticsResponse.data);
            }

            if (reportsResponse.success && reportsResponse.data) {
                allComplaints = reportsResponse.data;
                filteredComplaints = [...allComplaints];
                populateIssuesTable();
                setupPagination();
                renderRecentActivity(allComplaints);
            }
        } catch (error) {
            console.error("Failed to load dashboard data:", error);
            // You can add a user-facing error message here
        }

        initializeLogout(); // Your custom logout setup
    }

    // --- UI & CHART UPDATES ---
    function capitalizeFirstLetter(string) {
        if (!string) return '';
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.getElementById('sidebar');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            menuToggle.classList.toggle('active');
        });
    }

    async function updateStatsWithCalculations() {
        const totalComplaintsThisMonthElement = document.getElementById('total-complaints-this-month');
        const resolvedThisWeekElement = document.getElementById('resolved-this-week');

        try {
            const response = await window.reportsAPI.getAllReports();
            if (response.success && response.data) {
                const allComplaints = response.data;

                // --- Perform the Calculations ---

                // Total Complaints
                const totalComplaints = allComplaints.length;

                // Complaints this month
                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const newThisMonth = allComplaints.filter(c => new Date(c.createdAt) >= startOfMonth).length;

                // Resolved this week
                const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
                const resolvedThisWeek = allComplaints.filter(c => c.status === 'resolved' && new Date(c.updatedAt) >= startOfWeek).length;

                // --- Update the UI ---
                totalComplaintsThisMonthElement.innerHTML = `<i class="fas fa-arrow-up"></i> ${newThisMonth} this month`;
                resolvedThisWeekElement.innerHTML = `<i class="fas fa-arrow-up"></i> ${resolvedThisWeek} this week`;

            } else {
                console.error('Failed to fetch complaints:', response.message);
            }
        } catch (error) {
            console.error('Error fetching or processing data:', error);
        }
    }

    function updateStatCards(analyticsData) {
        // 1. Select the container and individual cards for clarity.
        const statCardsContainer = document.querySelector('.stats-cards');
        if (!statCardsContainer) {
            console.error("Statistics card container not found!");
            return;
        }

        const totalCard = statCardsContainer.querySelector('.stat-card:nth-child(1)');
        const resolvedCard = statCardsContainer.querySelector('.stat-card:nth-child(2)');
        const pendingCard = statCardsContainer.querySelector('.stat-card:nth-child(3)');

        // 2. Safely extract data with fallbacks to prevent errors if a value is missing.
        const stats = {
            total: analyticsData.reportCount || 0,
            resolved: analyticsData.resolvedCount || 0,
            // Use a dedicated 'pending' value if available, otherwise calculate it.
            pending: analyticsData.pendingCount || (analyticsData.reportCount - analyticsData.resolvedCount) || 0,
            newThisMonth: analyticsData.newReportsThisMonth || 0,
            resolvedThisWeek: analyticsData.resolvedThisWeek || 0,
            // Ensure the average time is a number and format it to one decimal place.
            avgResolution: (typeof analyticsData.avgResolutionTime === 'number') ? analyticsData.avgResolutionTime.toFixed(1) : 'N/A',
            // Ensure satisfaction is a number and format it. Default to 'N/A'.
            satisfaction: (typeof analyticsData.satisfactionRating === 'number') ? analyticsData.satisfactionRating.toFixed(1) : 'N/A'
        };

        // 3. Update each card's main number (h2) and supplementary text (small).
        if (totalCard) {
            totalCard.querySelector('h2').textContent = stats.total;
            totalCard.querySelector('small').innerHTML = `<i class="fas fa-arrow-up"></i> ${stats.newThisMonth} this month`;
        }

        if (resolvedCard) {
            resolvedCard.querySelector('h2').textContent = stats.resolved;
            resolvedCard.querySelector('small').innerHTML = `<i class="fas fa-arrow-up"></i> ${stats.resolvedThisWeek} this week`;
        }

        if (pendingCard) {
            pendingCard.querySelector('h2').textContent = stats.pending;
            pendingCard.querySelector('small').textContent = `Avg. Resolve: ${stats.avgResolution} days`;
        }

        updateStatsWithCalculations();
    }

    function updateCharts(data) {
        if (data.reportsByCategory && categoryChart) {
            categoryChart.data.labels = data.reportsByCategory.map(c => c.name);
            categoryChart.data.datasets[0].data = data.reportsByCategory.map(c => c.count);
            categoryChart.update();
        }

        if (data.reportsByMonth && resolutionChart) {
            resolutionChart.data.datasets[0].data = data.reportsByMonth.avgResolutionTime || [];
            resolutionChart.data.datasets[1].data = data.reportsByMonth.newComplaints || [];
            resolutionChart.update();
        }
    }

    function renderRecentActivity(complaints) {
        if (!recentActivityList) return;
        recentActivityList.innerHTML = '';

        const recent = complaints
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.createdAt))
            .slice(0, 3); // Show top 3 most recent activities

        recent.forEach(activity => {
            const itemHTML = `
                <div class="activity-item">
                    <div class="activity-icon status-icon"><i class="fas fa-sync-alt"></i></div>
                    <div class="activity-details">
                        <h4>Status Updated: ${activity.title}</h4>
                        <p>Status for report #${activity.reportId.substring(0, 8)} changed to "${activity.status}".</p>
                        <small>${new Date(activity.updatedAt).toLocaleString('en-IN')}</small>
                    </div>
                </div>`;
            recentActivityList.insertAdjacentHTML('beforeend', itemHTML);
        });
    }

    // --- TABLE, FILTERS, & PAGINATION ---
    function populateIssuesTable() {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const issuesToShow = filteredComplaints.slice(startIndex, endIndex);

        issuesTbody.innerHTML = '';
        if (issuesToShow.length === 0) {
            issuesTbody.innerHTML = `<tr><td colspan="8" style="text-align: center;">No complaints match the current filters.</td></tr>`;
            return;
        }

        issuesToShow.forEach(issue => {
            const tr = document.createElement('tr');
            const capitalizedStatus = capitalizeFirstLetter(issue.status.replace('_', ' '));
            const statusBadge = `<span class="status-badge status-${issue.status.replace('_', '-')}">${capitalizedStatus}</span>`;
            const priorityBadge = `<span class="priority-badge priority-${issue.priority}" title="${issue.priority}"></span>`;
            const actionButtons = `
                <div class="action-buttons">
                    <button title="View Details" class="view-issue" data-id="${issue.reportId}"><i class="fas fa-eye"></i></button>
                    <button title="Edit Issue" class="edit-issue" data-id="${issue.reportId}"><i class="fas fa-edit"></i></button>
                </div>`;
            tr.innerHTML = `
                <td>${issue.reportId.substring(0, 12)}...</td>
                <td>${issue.title}</td>
                <td>${issue.userId?.name || 'N/A'}</td>
                <td>${capitalizeFirstLetter(issue.categoryId?.name) || 'N/A'}</td>
                <td>${new Date(issue.createdAt).toLocaleDateString('en-IN')}</td>
                <td>${statusBadge}</td>
                <td>${priorityBadge}</td>
                <td>${actionButtons}</td>`;
            issuesTbody.appendChild(tr);
        });
        attachActionButtonListeners();
    }

    function applyFilters() {
        const statusValue = statusFilter.value;
        const categoryValue = categoryFilter.value;
        const priorityValue = priorityFilterBtn.getAttribute('data-priority') || 'all';

        let filtered = [...allComplaints];
        if (statusValue !== 'all') filtered = filtered.filter(c => c.status === statusValue);
        if (categoryValue !== 'all') filtered = filtered.filter(c => c.categoryId?.name === categoryValue);
        if (priorityValue !== 'all') filtered = filtered.filter(c => c.priority === priorityValue);

        filteredComplaints = filtered;
        currentPage = 1;
        populateIssuesTable();
        setupPagination();
    }

    function setupFilters() {
        statusFilter.addEventListener('change', applyFilters);
        categoryFilter.addEventListener('change', applyFilters);
        // Assuming your priority filter logic calls applyFilters()
    }

    function setupPagination() {
        paginationContainer.innerHTML = '';
        const totalPages = Math.ceil(filteredComplaints.length / itemsPerPage);
        if (totalPages <= 1) return;

        // Previous button
        const prevButton = document.createElement('button');
        prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevButton.disabled = currentPage === 1;
        prevButton.addEventListener('click', () => { currentPage--; populateIssuesTable(); setupPagination(); });
        paginationContainer.appendChild(prevButton);

        // Page number buttons
        for (let i = 1; i <= totalPages; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            if (i === currentPage) pageButton.className = 'active';
            pageButton.addEventListener('click', () => { currentPage = i; populateIssuesTable(); setupPagination(); });
            paginationContainer.appendChild(pageButton);
        }

        // Next button
        const nextButton = document.createElement('button');
        nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextButton.disabled = currentPage === totalPages;
        nextButton.addEventListener('click', () => { currentPage++; populateIssuesTable(); setupPagination(); });
        paginationContainer.appendChild(nextButton);
    }

    // --- MODALS & ACTIONS ---
    function attachActionButtonListeners() {
        document.querySelectorAll('.view-issue, .edit-issue').forEach(button => {
            button.addEventListener('click', function () {
                const issueId = this.getAttribute('data-id');
                openIssueDetailModal(issueId);
            });
        });
    }

    function updateAudioInModal(issue) {
        const audioGallery = document.getElementById('audio-gallery');
        if (!audioGallery) return;

        if (issue.voice_recording_url) {
            audioGallery.innerHTML = `
            <audio id="detail-audio" controls>
                <source src="${issue.voice_recording_url}" type="audio/webm">
                Your browser does not support the audio element.
            </audio>
        `;
        } else {
            audioGallery.innerHTML = `<p>No audio description provided.</p>`;
        }
    }

    function openIssueDetailModal(issueId) {
        const issue = allComplaints.find(c => c.reportId === issueId);
        if (!issue) return;

        // Populate the modal with dynamic data
        document.getElementById('detail-id').textContent = issue.reportId;
        document.getElementById('detail-type').textContent = issue.title;
        document.getElementById('detail-reporter').textContent = issue.userId?.name || 'N/A';
        document.getElementById('detail-date').textContent = new Date(issue.createdAt).toLocaleString('en-IN');
        document.getElementById('detail-description').textContent = issue.description;
        document.getElementById('detail-image').src = issue.photo_url || 'https://via.placeholder.com/400x200?text=No+Image';

        document.getElementById('issue-status').textContent = capitalizeFirstLetter(issue.status.replace('_', ' '));
        document.getElementById('issue-priority').textContent = capitalizeFirstLetter(issue.priority);
        document.getElementById('issue-department').textContent = capitalizeFirstLetter(issue.categoryId?.name) || 'N/A';

        updateAudioInModal(issue);

        // --- New Map Logic ---
        const lat = issue.location_lat;
        const lng = issue.location_lng;

        // Update the text location as well
        document.getElementById('detail-location').textContent = `Lat: ${lat}, Lng: ${lng}`;

        // Show the modal
        const modal = document.getElementById('issue-detail-modal');
        modal.style.display = 'flex';

        // Check if the map is initialized. If not, create it.
        if (!map) {
            map = L.map('issue-map-container');
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);
        }

        // Set the map's view to the new coordinates
        map.setView([lat, lng], 16); // 16 is a good zoom level

        // If a marker already exists, remove it
        if (marker) {
            marker.remove();
        }

        // Add a new marker to the map
        marker = L.marker([lat, lng]).addTo(map);

        // IMPORTANT: Fix for maps in hidden divs (like modals)
        // We use a short timeout to ensure the modal is visible before resizing the map.
        setTimeout(function () {
            map.invalidateSize();
        }, 10);
        // --- End of New Map Logic ---

        modal = document.getElementById('issue-detail-modal');
        modal.style.display = 'flex';
    }

    // Wire up the existing modal close buttons
    function setupModalFunctionality() {
        const modal = document.getElementById('issue-detail-modal');
        const closeBtn = document.querySelector('.close-modal');
        if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');
        window.addEventListener('click', (event) => { if (event.target === modal) modal.style.display = 'none'; });
    }

    // --- CHART INITIALIZATION ---
    function initializeCharts() {
        // Category Chart
        const categoryCtx = document.getElementById('categoryChart').getContext('2d');
        const categoryChart = new Chart(categoryCtx, {
            type: 'doughnut',
            data: {
                labels: ['Infrastructure', 'Water Supply', 'Sanitation', 'Electricity', 'Roads', 'Others'],
                datasets: [{
                    label: 'Complaints by Category',
                    data: [65, 42, 58, 30, 25, 15],
                    backgroundColor: [
                        '#4e73df',
                        '#1cc88a',
                        '#f6c23e',
                        '#e74a3b',
                        '#36b9cc',
                        '#858796'
                    ],
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            padding: 10,
                            font: {
                                size: 10
                            }
                        }
                    }
                }
            }
        });

        // Resolution Performance Chart
        const resolutionCtx = document.getElementById('resolutionChart').getContext('2d');
        const resolutionChart = new Chart(resolutionCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
                datasets: [
                    {
                        label: 'Avg. Resolution Time (days)',
                        data: [5.2, 4.8, 4.5, 4.2, 3.8, 3.5, 3.2, 3.0, 2.8],
                        borderColor: '#1cc88a',
                        tension: 0.3,
                        fill: false
                    },
                    {
                        label: 'New Complaints',
                        data: [30, 35, 42, 38, 45, 50, 55, 48, 52],
                        borderColor: '#4e73df',
                        tension: 0.3,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            padding: 5,
                            font: {
                                size: 10
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            font: {
                                size: 10
                            }
                        }
                    },
                    x: {
                        ticks: {
                            font: {
                                size: 10
                            }
                        }
                    }
                }
            }
        });
    }

    // --- USER'S LOGOUT CODE (PRESERVED) ---
    function logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.clear();
        window.location.href = '../../index.html';
    }

    function initializeLogout() {
        const logoutLink = document.querySelector('.logout');
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                logout();
            });
        }
    }

    function checkTokenExpiration() {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '../../index.html';
            return;
        }
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.exp && payload.exp < (Date.now() / 1000)) {
                alert('Your session has expired.');
                logout();
            }
        } catch (error) {
            console.error('Malformed token, logging out.');
            logout();
        }
    }

    // --- START THE APPLICATION ---
    initializeDashboard();
});