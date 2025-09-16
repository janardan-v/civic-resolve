document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM loaded, initializing admin dashboard...');
    
    // Set current date
    const currentDate = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const dateElement = document.getElementById('current-date');
    if (dateElement) {
        dateElement.innerText = currentDate.toLocaleDateString('en-US', options);
    }

    // Initialize Charts
    initializeCharts();

    // Populate issues table initially
    populateIssuesTable(filteredIssues, 1);

    // Set up modal functionality
    setupModalFunctionality();

    // Set up filter functionality - MUST be after DOM is ready
    setTimeout(() => {
        setupFilters();
        console.log('Filters setup completed');
    }, 100);

    // Set up pagination
    setupPagination();
});

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

// Expanded list of issues data
const allIssuesData = [
    {
        id: 'CR-2023-0042',
        title: 'Water Leakage',
        location: 'Block C, Main Street',
        category: 'Water Supply',
        reportDate: '10 Sep 2023',
        status: 'in-progress',
        priority: 'medium'
    },
    {
        id: 'CR-2023-0041',
        title: 'Streetlight Not Working',
        location: 'Sector 5, Road No. 3',
        category: 'Infrastructure',
        reportDate: '15 Aug 2023',
        status: 'resolved',
        priority: 'low'
    },
    {
        id: 'CR-2023-0040',
        title: 'Garbage Not Collected',
        location: 'Sector 8, Residential Area',
        category: 'Sanitation',
        reportDate: '22 Sep 2023',
        status: 'new',
        priority: 'high'
    },
    {
        id: 'CR-2023-0039',
        title: 'Road Pothole',
        location: 'Highway Junction, Sector 10',
        category: 'Roads',
        reportDate: '18 Sep 2023',
        status: 'in-progress',
        priority: 'medium'
    },
    {
        id: 'CR-2023-0038',
        title: 'Power Outage',
        location: 'Sector 7, Commercial Zone',
        category: 'Electricity',
        reportDate: '20 Sep 2023',
        status: 'new',
        priority: 'critical'
    },
    {
        id: 'CR-2023-0037',
        title: 'Broken Traffic Signal',
        location: 'Main Road Intersection, Sector 3',
        category: 'Infrastructure',
        reportDate: '05 Sep 2023',
        status: 'resolved',
        priority: 'high'
    },
    {
        id: 'CR-2023-0036',
        title: 'Sewage Overflow',
        location: 'Near Central Park, Block D',
        category: 'Sanitation',
        reportDate: '12 Sep 2023',
        status: 'in-progress',
        priority: 'high'
    },
    {
        id: 'CR-2023-0035',
        title: 'Damaged Park Bench',
        location: 'City Park, Sector 9',
        category: 'Infrastructure',
        reportDate: '08 Sep 2023',
        status: 'new',
        priority: 'low'
    },
    {
        id: 'CR-2023-0034',
        title: 'Low Water Pressure',
        location: 'Apartments, Sector 12',
        category: 'Water Supply',
        reportDate: '15 Sep 2023',
        status: 'in-progress',
        priority: 'medium'
    },
    {
        id: 'CR-2023-0033',
        title: 'Illegal Dumping',
        location: 'Empty Plot, Sector 6',
        category: 'Sanitation',
        reportDate: '19 Sep 2023',
        status: 'new',
        priority: 'medium'
    },
    {
        id: 'CR-2023-0032',
        title: 'Drainage Blockage',
        location: 'Main Market Area, Sector 2',
        category: 'Sanitation',
        reportDate: '07 Sep 2023',
        status: 'resolved',
        priority: 'high'
    },
    {
        id: 'CR-2023-0031',
        title: 'Vandalized Public Property',
        location: 'Bus Stand, Central Area',
        category: 'Infrastructure',
        reportDate: '11 Sep 2023',
        status: 'closed',
        priority: 'low'
    },
    {
        id: 'CR-2023-0030',
        title: 'Public Toilet Maintenance',
        location: 'Community Center, Block A',
        category: 'Sanitation',
        reportDate: '14 Sep 2023',
        status: 'resolved',
        priority: 'medium'
    }
];

// Current page and items per page for pagination
let currentPage = 1;
const itemsPerPage = 5;
let filteredIssues = [...allIssuesData];

// Utility functions
function formatStatus(status) {
    switch (status) {
        case 'new': return 'New';
        case 'in-progress': return 'In Progress';
        case 'resolved': return 'Resolved';
        case 'closed': return 'Closed';
        default: return status;
    }
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function populateIssuesTable(issues = null, page = 1) {
    console.log('Populating table with:', issues ? issues.length : 0, 'issues');
    
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    // Use filtered issues if provided, otherwise use all issues
    const issuesToShow = issues ? issues.slice(startIndex, endIndex) : allIssuesData.slice(startIndex, endIndex);

    const tbody = document.getElementById('issues-tbody');
    if (!tbody) {
        console.error('Table tbody not found!');
        return;
    }
    
    tbody.innerHTML = '';

    if (issuesToShow.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="8" style="text-align: center; padding: 20px;">No issues found matching your filters.</td>`;
        tbody.appendChild(tr);
        return;
    }

    issuesToShow.forEach(issue => {
        const tr = document.createElement('tr');

        // Create status and priority badges
        const statusBadge = `<span class="status-badge status-${issue.status}">
            ${formatStatus(issue.status)}
        </span>`;

        const priorityBadge = `<span class="priority-badge priority-${issue.priority}" title="${capitalizeFirstLetter(issue.priority)}"></span>`;

        // Create action buttons
        const actionButtons = `
            <div class="action-buttons">
                <button title="View Details" class="view-issue" data-id="${issue.id}"><i class="fas fa-eye"></i></button>
                <button title="Edit Issue" class="edit-issue" data-id="${issue.id}"><i class="fas fa-edit"></i></button>
                <button title="Delete Issue" class="delete-issue" data-id="${issue.id}"><i class="fas fa-trash"></i></button>
            </div>
        `;

        tr.innerHTML = `
            <td>${issue.id}</td>
            <td>${issue.title}</td>
            <td>${issue.location}</td>
            <td>${issue.category}</td>
            <td>${issue.reportDate}</td>
            <td>${statusBadge}</td>
            <td>${priorityBadge}</td>
            <td>${actionButtons}</td>
        `;

        tbody.appendChild(tr);
    });

    // Add event listeners for action buttons
    attachActionButtonListeners();
}

function attachActionButtonListeners() {
    // Add event listeners for view buttons
    document.querySelectorAll('.view-issue').forEach(button => {
        button.addEventListener('click', function () {
            const issueId = this.getAttribute('data-id');
            openIssueDetailModal(issueId);
        });
    });

    // Add event listeners for edit buttons
    document.querySelectorAll('.edit-issue').forEach(button => {
        button.addEventListener('click', function () {
            const issueId = this.getAttribute('data-id');
            openIssueDetailModal(issueId);
        });
    });

    // Add event listeners for delete buttons
    document.querySelectorAll('.delete-issue').forEach(button => {
        button.addEventListener('click', function () {
            const issueId = this.getAttribute('data-id');
            if (confirm(`Are you sure you want to delete issue ${issueId}?`)) {
                alert(`Issue ${issueId} has been deleted.`);
                filteredIssues = filteredIssues.filter(issue => issue.id !== issueId);
                updatePaginationButtons();
                populateIssuesTable(filteredIssues, currentPage);
            }
        });
    });
}

function setupFilters() {
    console.log('Setting up filters...');
    
    const statusFilter = document.getElementById('status-filter');
    const categoryFilter = document.getElementById('category-filter');
    const priorityFilterBtn = document.querySelector('.priority-filter');

    console.log('Filter elements found:', {
        statusFilter: !!statusFilter,
        categoryFilter: !!categoryFilter,
        priorityFilterBtn: !!priorityFilterBtn
    });

    if (!statusFilter || !categoryFilter || !priorityFilterBtn) {
        console.error('One or more filter elements not found!');
        console.log('Available elements:', {
            statusFilter,
            categoryFilter,
            priorityFilterBtn
        });
        return;
    }

    // Remove any existing event listeners first
    statusFilter.removeEventListener('change', applyFilters);
    categoryFilter.removeEventListener('change', applyFilters);

    // Add change event listeners to filters
    statusFilter.addEventListener('change', function() {
        console.log('Status filter changed to:', this.value);
        applyFilters();
    });
    
    categoryFilter.addEventListener('change', function() {
        console.log('Category filter changed to:', this.value);
        applyFilters();
    });

    // Create a dropdown menu for priority filter
    let priorityMenuOpen = false;

    priorityFilterBtn.addEventListener('click', function (e) {
        e.stopPropagation();

        if (priorityMenuOpen) {
            removePriorityMenu();
        } else {
            createPriorityMenu();
        }

        priorityMenuOpen = !priorityMenuOpen;
    });

    // Close priority menu when clicking outside
    document.addEventListener('click', function () {
        if (priorityMenuOpen) {
            removePriorityMenu();
            priorityMenuOpen = false;
        }
    });

    function createPriorityMenu() {
        const menu = document.createElement('div');
        menu.className = 'priority-menu';
        menu.style.position = 'absolute';
        menu.style.backgroundColor = 'white';
        menu.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        menu.style.borderRadius = '4px';
        menu.style.padding = '10px';
        menu.style.zIndex = '5';

        const priorities = [
            { value: 'all', label: 'All Priorities' },
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
            { value: 'critical', label: 'Critical' }
        ];

        priorities.forEach(priority => {
            const item = document.createElement('div');
            item.style.padding = '8px 15px';
            item.style.cursor = 'pointer';
            item.style.borderBottom = '1px solid #f0f0f0';
            item.textContent = priority.label;

            item.addEventListener('click', function (e) {
                e.stopPropagation();

                // Store the selected priority as a data attribute on the button
                priorityFilterBtn.setAttribute('data-priority', priority.value);
                priorityFilterBtn.innerHTML = `<i class="fas fa-flag"></i> ${priority.label}`;

                removePriorityMenu();
                priorityMenuOpen = false;

                applyFilters();
            });

            menu.appendChild(item);
        });

        // Position the menu under the button
        const rect = priorityFilterBtn.getBoundingClientRect();
        menu.style.top = `${rect.bottom + window.scrollY}px`;
        menu.style.left = `${rect.left + window.scrollX}px`;

        document.body.appendChild(menu);
    }

    function removePriorityMenu() {
        const menu = document.querySelector('.priority-menu');
        if (menu) {
            menu.remove();
        }
    }

    console.log('Filter event listeners attached successfully');
}

function applyFilters() {
    console.log('=== APPLYING FILTERS ===');
    
    const statusFilter = document.getElementById('status-filter');
    const categoryFilter = document.getElementById('category-filter');
    const priorityFilterBtn = document.querySelector('.priority-filter');
    
    if (!statusFilter || !categoryFilter || !priorityFilterBtn) {
        console.error('Filter elements not found during applyFilters');
        return;
    }
    
    const statusValue = statusFilter.value;
    const categoryValue = categoryFilter.value;
    const priorityValue = priorityFilterBtn.getAttribute('data-priority') || 'all';
    
    console.log('Current filter values:', {
        status: statusValue,
        category: categoryValue,
        priority: priorityValue
    });
    
    console.log('Sample of original data categories:', allIssuesData.slice(0, 3).map(i => i.category));
    
    // Start with all issues
    let filtered = [...allIssuesData];
    console.log('Starting with', filtered.length, 'issues');
    
    // Apply status filter
    if (statusValue && statusValue !== 'all') {
        const beforeCount = filtered.length;
        filtered = filtered.filter(issue => {
            const match = issue.status === statusValue;
            if (!match) {
                console.log(`Status filter: ${issue.id} (${issue.status}) doesn't match ${statusValue}`);
            }
            return match;
        });
        console.log(`Status filter: ${beforeCount} -> ${filtered.length} issues`);
    }
    
    // Apply category filter
    if (categoryValue && categoryValue !== 'all') {
        const beforeCount = filtered.length;
        filtered = filtered.filter(issue => {
            const match = issue.category === categoryValue;
            if (!match) {
                console.log(`Category filter: ${issue.id} (${issue.category}) doesn't match ${categoryValue}`);
            }
            return match;
        });
        console.log(`Category filter: ${beforeCount} -> ${filtered.length} issues`);
    }
    
    // Apply priority filter
    if (priorityValue && priorityValue !== 'all') {
        const beforeCount = filtered.length;
        filtered = filtered.filter(issue => {
            const match = issue.priority === priorityValue;
            if (!match) {
                console.log(`Priority filter: ${issue.id} (${issue.priority}) doesn't match ${priorityValue}`);
            }
            return match;
        });
        console.log(`Priority filter: ${beforeCount} -> ${filtered.length} issues`);
    }
    
    // Update global filtered issues
    filteredIssues = filtered;
    
    console.log('Final filtered issues:', filteredIssues.length);
    console.log('Sample filtered issues:', filteredIssues.slice(0, 2).map(i => ({
        id: i.id,
        category: i.category,
        status: i.status,
        priority: i.priority
    })));
    
    // Reset to page 1
    currentPage = 1;
    
    // Update the table and pagination
    updatePaginationButtons();
    populateIssuesTable(filteredIssues, currentPage);
    
    console.log('=== FILTERS APPLIED ===');
}

function updatePaginationButtons() {
    const paginationContainer = document.querySelector('.pagination');
    if (!paginationContainer) {
        console.warn('Pagination container not found');
        return;
    }
    
    const totalPages = Math.ceil(filteredIssues.length / itemsPerPage);

    // Remove all page number buttons (not prev/next)
    const pageButtons = paginationContainer.querySelectorAll('button:not(.prev-button):not(.next-button)');
    pageButtons.forEach(button => button.remove());

    // Get prev/next buttons - they might not exist yet
    let prevButton = paginationContainer.querySelector('.prev-button');
    let nextButton = paginationContainer.querySelector('.next-button');
    
    // If buttons don't exist, create them
    if (!prevButton) {
        prevButton = document.createElement('button');
        prevButton.className = 'prev-button';
        prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevButton.addEventListener('click', function () {
            if (currentPage > 1) {
                currentPage--;
                updatePaginationButtons();
                populateIssuesTable(filteredIssues, currentPage);
            }
        });
        paginationContainer.appendChild(prevButton);
    }
    
    if (!nextButton) {
        nextButton = document.createElement('button');
        nextButton.className = 'next-button';
        nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextButton.addEventListener('click', function () {
            const totalPages = Math.ceil(filteredIssues.length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                updatePaginationButtons();
                populateIssuesTable(filteredIssues, currentPage);
            }
        });
        paginationContainer.appendChild(nextButton);
    }

    // Determine range of page numbers to show
    let startPage = Math.max(1, currentPage - 1);
    let endPage = Math.min(totalPages, startPage + 2);

    // Adjust if we're at the end
    if (endPage - startPage < 2 && totalPages > 2) {
        startPage = Math.max(1, endPage - 2);
    }

    // Create page number buttons
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.className = 'page-number';
        if (i === currentPage) {
            pageButton.classList.add('active');
        }

        pageButton.addEventListener('click', function () {
            currentPage = i;
            updatePaginationButtons();
            populateIssuesTable(filteredIssues, currentPage);
        });

        // Insert before the next button
        paginationContainer.insertBefore(pageButton, nextButton);
    }

    // Update the state of prev/next buttons (now they definitely exist)
    prevButton.disabled = currentPage === 1;
    nextButton.disabled = currentPage === totalPages || totalPages === 0;

    // Add visual indication of disabled state
    if (prevButton.disabled) {
        prevButton.style.opacity = '0.5';
        prevButton.style.cursor = 'not-allowed';
    } else {
        prevButton.style.opacity = '1';
        prevButton.style.cursor = 'pointer';
    }

    if (nextButton.disabled) {
        nextButton.style.opacity = '0.5';
        nextButton.style.cursor = 'not-allowed';
    } else {
        nextButton.style.opacity = '1';
        nextButton.style.cursor = 'pointer';
    }
}

function setupPagination() {
    const paginationContainer = document.querySelector('.pagination');
    if (!paginationContainer) {
        console.error('Pagination container not found');
        return;
    }

    // Clear any existing buttons
    paginationContainer.innerHTML = '';

    // Call updatePaginationButtons to create the initial buttons
    updatePaginationButtons();
}

function setupModalFunctionality() {
    const modal = document.getElementById('issue-detail-modal');
    const closeBtn = document.querySelector('.close-modal');

    // Close modal when clicking the X button
    closeBtn.addEventListener('click', function () {
        modal.style.display = 'none';
    });

    // Close modal when clicking outside of it
    window.addEventListener('click', function (event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Save changes button functionality
    document.querySelector('.primary-btn').addEventListener('click', function () {
        // Here you would save the changes made to the issue
        alert('Changes saved successfully!');
        modal.style.display = 'none';
    });

    // Close issue button functionality
    document.querySelector('.secondary-btn').addEventListener('click', function () {
        if (confirm('Are you sure you want to close this issue?')) {
            alert('Issue closed successfully!');
            modal.style.display = 'none';
        }
    });

    // Add note button functionality
    document.querySelector('.post-comment').addEventListener('click', function () {
        const commentText = document.querySelector('.add-comment textarea').value;
        if (commentText.trim() !== '') {
            addNewComment(commentText);
            document.querySelector('.add-comment textarea').value = '';
        }
    });
}

function openIssueDetailModal(issueId) {
    // In a real application, you would fetch the issue details from the server
    // For now, we'll just show the modal with some sample data
    document.getElementById('detail-id').textContent = issueId;

    // Display the modal
    const modal = document.getElementById('issue-detail-modal');
    modal.style.display = 'flex';
}

function addNewComment(commentText) {
    const commentsList = document.querySelector('.comments-list');
    const now = new Date();

    const newComment = document.createElement('div');
    newComment.className = 'comment';
    newComment.innerHTML = `
        <div class="comment-avatar">
            <img src="../../Images/admin-avatar.png" alt="Admin">
        </div>
        <div class="comment-content">
            <div class="comment-header">
                <span class="comment-author">Admin</span>
                <span class="comment-time">Just now</span>
            </div>
            <p class="comment-text">${commentText}</p>
        </div>
    `;

    commentsList.appendChild(newComment);
    commentsList.scrollTop = commentsList.scrollHeight;
}

// Simple Logout functionality - Add this at the end of the file
function initializeLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    const logoutLink = document.querySelector('.logout'); // Updated to match your HTML
    const logoutNavItem = document.querySelector('[data-action="logout"]');
    
    // Simple logout function
    function logout() {
        // Clear all authentication data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('refreshToken');
        
        // Clear session storage as well
        sessionStorage.clear();
        
        console.log('User logged out successfully');
        
        // Redirect to home page or login page
        window.location.href = '../../index.html';
    }
    
    // Attach logout handlers to all possible logout elements
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
    
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
    
    if (logoutNavItem) {
        logoutNavItem.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
    
    // Add keyboard shortcut (Ctrl+L)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'l') {
            e.preventDefault();
            logout();
        }
    });
    
    console.log('Simple logout functionality initialized');
}

// Auto-logout on token expiration (optional but recommended)
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
            console.log('Token expired, logging out');
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

// Initialize logout when page loads
document.addEventListener('DOMContentLoaded', () => {
    // ...existing code...
    
    // Initialize simple logout functionality
    initializeLogout();
    
    // Check token expiration immediately
    checkTokenExpiration();
});

// Check token expiration every 10 minutes (optional)
setInterval(checkTokenExpiration, 10 * 60 * 1000);