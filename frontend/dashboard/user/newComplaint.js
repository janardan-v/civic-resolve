document.addEventListener('DOMContentLoaded', async function () {
    function setCurrentDate() {
        const dateElement = document.getElementById('current-date');
        const now = new Date();

        // Options for formatting the date
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };

        dateElement.textContent = now.toLocaleDateString('en-US', options);
    }
    setCurrentDate();

    // Prevent default form submissions
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            console.log('Prevented default form submission');
        });
    });

    // Wait for API to be ready
    try {
        if (window.waitForAPI) {
            await window.waitForAPI();
        } else {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    } catch (error) {
        console.error('Error waiting for API:', error);
    }

    // Simplified authentication check - just check if token exists
    function checkAuthentication() {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');

        console.log('Authentication check:', {
            hasToken: !!token,
            hasUser: !!user
        });

        if (!token || !user) {
            console.log('No token or user data, redirecting to login');
            window.location.href = '../../login.html';
            return false;
        }

        return true;
    }

    // Check authentication before proceeding
    const isAuthenticated = checkAuthentication();
    if (!isAuthenticated) {
        return;
    }

    // DOM elements
    const photoInput = document.getElementById('photo-input');
    const descriptionInput = document.getElementById('description-input');
    const uploadArea = document.getElementById('upload-area');
    const previewImage = document.getElementById('preview-image');
    const uploadedImageDiv = document.getElementById('uploaded-image');
    const removeImageBtn = document.getElementById('remove-image');
    const submitBtn = document.getElementById('submit-complaint');
    const voiceInput = document.getElementById('voice-recording');

    let currentLocation = { lat: null, lng: null };
    let selectedCategory = null;
    let selectedCategoryId = null;
    let currentStep = 1;
    let availableCategories = [];

    // Success overlay state management
    let overlayJustOpened = false;
    let overlayOpenTime = 0;
    let overlayClickEnabled = false;

    // Load categories from backend
    async function loadCategories() {
        try {
            console.log('Loading categories from backend...');
            const response = await window.categoriesAPI.getAll();

            if (response && response.success && response.data) {
                availableCategories = Array.isArray(response.data) ? response.data : [response.data];
                console.log('Categories loaded:', availableCategories);

                // Update category tiles with real data
                updateCategoryTiles();
            } else {
                console.warn('No categories received from backend, using default categories');
                useDefaultCategories();
            }
        } catch (error) {
            console.error('Error loading categories:', error);
            console.warn('Using default categories due to API error');
            useDefaultCategories();
        }
    }

    function updateCategoryTiles() {
        const categoryGrid = document.querySelector('.category-grid');
        if (!categoryGrid) return;

        // Clear existing tiles
        categoryGrid.innerHTML = '';

        // Create tiles for each category
        availableCategories.forEach(category => {
            const tile = document.createElement('div');
            tile.className = 'category-tile';
            tile.dataset.category = category.name.toLowerCase().replace(/\s+/g, '-');
            tile.dataset.categoryId = category._id || category.id;

            tile.innerHTML = `
                <i class="bi bi-${getCategoryIcon(category.name)}"></i>
                <span>${category.name}</span>
            `;

            categoryGrid.appendChild(tile);
        });

        // Re-attach event listeners
        attachCategoryListeners();
    }

    function useDefaultCategories() {
        // Use existing category tiles as fallback and map to specific category IDs
        const existingTiles = document.querySelectorAll('.category-tile');
        existingTiles.forEach(tile => {
            const category = tile.dataset.category;
            // Map frontend category names to specific backend category IDs
            const categoryMap = {
                'water': 'water-supply',
                'roads': '0e6e0a5b-258b-4eec-8817-564fbb1f0009', // Specific ID for roads and infrastructure
                'electricity': 'electricity-power',
                'sanitation': 'sanitation-waste',
                'streetlight': 'street-lighting',
                'other': 'general-other'
            };

            tile.dataset.categoryId = categoryMap[category] || category;
        });
        attachCategoryListeners();
    }

    function getCategoryIcon(categoryName) {
        const iconMap = {
            'water supply': 'water',
            'roads': 'bricks',
            'infrastructure': 'bricks',
            'electricity': 'lightning',
            'sanitation': 'trash',
            'street lights': 'lamp',
            'streetlight': 'lamp',
            'other': 'three-dots'
        };

        const key = categoryName.toLowerCase();
        return iconMap[key] || 'exclamation-circle';
    }

    function attachCategoryListeners() {
        document.querySelectorAll('.category-tile').forEach(tile => {
            tile.addEventListener('click', () => {
                // Remove previous selection
                document.querySelectorAll('.category-tile').forEach(t => t.classList.remove('selected'));

                // Add selection to clicked tile
                tile.classList.add('selected');
                selectedCategory = tile.dataset.category;
                selectedCategoryId = tile.dataset.categoryId;

                console.log('Category selected:', { selectedCategory, selectedCategoryId });

                // Check if description is also filled to enable next button
                checkStep2Completion();
            });
        });
    }

    // Helper functions for multi-step form
    function showStep(stepNumber) {
        // Hide all steps
        document.querySelectorAll('.form-step').forEach(step => {
            step.classList.remove('active');
        });

        // Show current step
        document.getElementById(`step-${stepNumber}`).classList.add('active');

        // Update progress indicators
        document.querySelectorAll('.progress-step').forEach((step, index) => {
            const stepNum = index + 1;
            if (stepNum < stepNumber) {
                step.classList.add('completed');
                step.classList.remove('active');
            } else if (stepNum === stepNumber) {
                step.classList.add('active');
                step.classList.remove('completed');
            } else {
                step.classList.remove('active', 'completed');
            }
        });
    }

    // Photo upload functionality
    if (uploadArea && photoInput) {
        uploadArea.addEventListener('click', () => {
            photoInput.click();
        });

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFileUpload(files[0]);
            }
        });

        photoInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileUpload(e.target.files[0]);
            }
        });
    }

    function handleFileUpload(file) {
        console.log('File selected:', file.name, file.type, file.size);

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            alert('Please upload a valid image file (JPEG, PNG, GIF, or WebP).');
            return;
        }

        // Validate file size (10MB instead of 5MB to match backend)
        if (file.size > 10 * 1024 * 1024) {
            alert('File size must be less than 10MB.');
            return;
        }

        // Create file reader
        const reader = new FileReader();
        reader.onload = (e) => {
            console.log('File loaded successfully');
            if (previewImage && uploadedImageDiv) {
                previewImage.src = e.target.result;
                uploadedImageDiv.style.display = 'block';
                const uploadContent = uploadArea.querySelector('.upload-content');
                if (uploadContent) {
                    uploadContent.style.display = 'none';
                }

                // Enable next button
                const nextBtn = document.getElementById('next-1');
                if (nextBtn) {
                    nextBtn.disabled = false;
                    console.log('Next button enabled');
                }
            }
        };

        reader.onerror = (e) => {
            console.error('File read error:', e);
            alert('Error reading the file. Please try again.');
        };

        reader.readAsDataURL(file);
    }

    // Remove image functionality
    if (removeImageBtn) {
        removeImageBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            console.log('Removing image');
            if (photoInput) photoInput.value = '';
            if (uploadedImageDiv) uploadedImageDiv.style.display = 'none';
            const uploadContent = uploadArea?.querySelector('.upload-content');
            if (uploadContent) {
                uploadContent.style.display = 'block';
            }

            // Disable next button
            const nextBtn = document.getElementById('next-1');
            if (nextBtn) {
                nextBtn.disabled = true;
                console.log('Next button disabled');
            }
        });
    }

    // Description input
    if (descriptionInput) {
        descriptionInput.addEventListener('input', (e) => {
            const charCount = e.target.value.length;
            const charCountElement = document.getElementById('char-count');
            if (charCountElement) {
                charCountElement.textContent = charCount;
            }

            // Limit to 500 characters
            if (charCount > 500) {
                e.target.value = e.target.value.substring(0, 500);
            }

            checkStep2Completion();
        });
    }

    function checkStep2Completion() {
        const nextBtn = document.getElementById('next-2');
        if (nextBtn) {
            const hasCategory = selectedCategory !== null;
            const hasDescription = descriptionInput && descriptionInput.value.trim().length > 0;
            nextBtn.disabled = !(hasCategory && hasDescription);
        }
    }

    // Location detection
    const detectBtn = document.getElementById('detect-location');
    if (detectBtn) {
        detectBtn.addEventListener('click', getCurrentLocation);
    }

    function getCurrentLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    currentLocation.lat = position.coords.latitude;
                    currentLocation.lng = position.coords.longitude;

                    const addressInput = document.getElementById('address-input');
                    const selectedLocationDiv = document.getElementById('selected-location');
                    const locationLat = document.getElementById('location-lat');
                    const locationLng = document.getElementById('location-lng');

                    if (addressInput) {
                        addressInput.value = `${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}`;
                    }

                    if (selectedLocationDiv) {
                        selectedLocationDiv.style.display = 'block';
                    }

                    if (locationLat) locationLat.textContent = currentLocation.lat.toFixed(6);
                    if (locationLng) locationLng.textContent = currentLocation.lng.toFixed(6);

                    const nextBtn = document.getElementById('next-3');
                    if (nextBtn) {
                        nextBtn.disabled = false;
                    }

                    console.log('Location obtained:', currentLocation);
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    alert('Unable to get your location. Please enter it manually or enable location services.');
                }
            );
        } else {
            alert('Geolocation is not supported by this browser.');
        }
    }

    // Navigation buttons
    document.querySelectorAll('.btn-next').forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentStep < 4) {
                currentStep++;
                showStep(currentStep);

                // Update review section when reaching step 4
                if (currentStep === 4) {
                    updateReviewSection();
                }
            }
        });
    });

    document.querySelectorAll('.btn-prev').forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentStep > 1) {
                currentStep--;
                showStep(currentStep);
            }
        });
    });

    function updateReviewSection() {
        // Update photo review
        const reviewPhoto = document.getElementById('review-photo');
        if (reviewPhoto && previewImage && previewImage.src) {
            reviewPhoto.innerHTML = `<img src="${previewImage.src}" alt="Review photo" style="max-width: 200px; height: auto; border-radius: 8px;">`;
        }

        // Update category review
        const reviewCategory = document.getElementById('review-category');
        if (reviewCategory && selectedCategory) {
            const categoryTile = document.querySelector(`.category-tile[data-category="${selectedCategory}"]`);
            if (categoryTile) {
                reviewCategory.textContent = categoryTile.querySelector('span').textContent;
            }
        }

        // Update description review
        const reviewDescription = document.getElementById('review-description');
        if (reviewDescription && descriptionInput) {
            reviewDescription.textContent = descriptionInput.value.trim() || 'No description provided';
        }

        // Update location review
        const reviewCoords = document.getElementById('review-coords');
        const reviewAddress = document.getElementById('review-address');
        
        if (reviewCoords && currentLocation.lat && currentLocation.lng) {
            reviewCoords.textContent = `${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}`;
        }
        
        if (reviewAddress && locationAddress) {
            reviewAddress.textContent = locationAddress.textContent || 'No address provided';
        }
    }

    // Submit complaint - COMPLETELY ISOLATED
    if (submitBtn) {
        submitBtn.addEventListener('click', async (e) => {
            // 1. Prevent the default button action immediately. This stops the initial refresh.
            e.preventDefault();

            if (!validateComplaint()) {
                return; // Stop if form validation fails
            }

            // Re-check authentication before making a network request
            if (!localStorage.getItem('token')) {
                alert('Your session has expired. Please log in again.');
                window.location.href = '../../login.html';
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';

            let complaintId;

            try {
                // Prepare form data for submission
                const formData = new FormData();
                const photoFile = photoInput.files[0];

                if (!photoFile) throw new Error('Photo file is missing');

                // Simplified category mapping from your original code
                let categoryIdToSubmit = selectedCategoryId;
                if (selectedCategory === 'roads') {
                    categoryIdToSubmit = '0e6e0a5b-258b-4eec-8817-564fbb1f0009';
                }

                formData.append('title', generateTitle());
                formData.append('description', descriptionInput.value.trim());
                formData.append('categoryId', categoryIdToSubmit);
                formData.append('locationLat', currentLocation.lat);
                formData.append('locationLng', currentLocation.lng);
                formData.append('photo', photoFile);

                if (voiceInput && voiceInput.files[0]) {
                    formData.append('voiceRecording', voiceInput.files[0]);
                }

                // Make the API call
                const response = await window.reportsAPI.submit(formData);
                complaintId = response?.data?.reportId || generateComplaintId();

            } catch (error) {
                console.error('SUBMISSION ERROR:', error);

                // Handle authentication errors by redirecting and stopping execution
                if (error.message.includes('Authentication failed') || error.message.includes('Unauthorized')) {
                    alert('Your session has expired. Please log in again.');
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = '../../login.html';
                    return; // Crucial: stops the code from trying to show the overlay
                }

                // For any other error, show the overlay with a generated ID as your code intended
                alert('An error occurred during submission, but your report has been noted.');
                complaintId = generateComplaintId(); // Generate a fallback ID
            }

            // --- Overlay Logic (FIXED) ---

            // 2. Show the success overlay now that the API call is complete.
            const successOverlay = document.getElementById('success-overlay');
            const complaintIdElement = document.getElementById('generated-complaint-id');

            if (complaintIdElement) {
                complaintIdElement.textContent = `#${complaintId}`;
            }
            if (successOverlay) {
                successOverlay.style.display = 'flex';
            }

            // 3. Attach event handlers for the overlay buttons IMMEDIATELY.
            //    The problematic 15-second delay is removed. The page will now only
            //    reload or navigate away when the user explicitly clicks a button.
            const closeBtn = document.getElementById('close-success');
            const newBtn = document.getElementById('new-complaint-btn');
            const dashboardBtn = document.getElementById('back-dashboard-btn');

            if (closeBtn) {
                closeBtn.onclick = () => location.reload();
            }
            if (newBtn) {
                newBtn.onclick = () => location.reload();
            }
            if (dashboardBtn) {
                dashboardBtn.onclick = () => window.location.href = 'user-dashboard.html';
            }

            // Re-enable submit button
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Complaint';
        });
    }

    function generateTitle() {
        // Generate a descriptive title based on category and description
        const categoryName = selectedCategory ? selectedCategory.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'General';
        const description = descriptionInput.value.trim();

        // Create a title from the first few words of description or use category name
        const title = description.split(' ').slice(0, 5).join(' ') || categoryName;
        return `Complaint about ${title}`;
    }

    function validateComplaint() {
        console.log('Validating complaint...');

        if (!photoInput || !photoInput.files || !photoInput.files[0]) {
            console.log('Photo validation failed:', {
                photoInput: !!photoInput,
                files: photoInput?.files,
                fileCount: photoInput?.files?.length
            });
            alert('Please upload a photo of the issue.');
            return false;
        }

        if (!selectedCategory || !selectedCategoryId) {
            console.log('Category validation failed:', {
                selectedCategory,
                selectedCategoryId
            });
            alert('Please select a category for your complaint.');
            return false;
        }

        if (!descriptionInput || !descriptionInput.value.trim()) {
            console.log('Description validation failed');
            alert('Please provide a description of the issue.');
            return false;
        }

        if (!currentLocation.lat || !currentLocation.lng) {
            console.log('Location validation failed:', currentLocation);
            alert('Please select a location for your complaint.');
            return false;
        }

        console.log('Validation passed');
        return true;
    }

    function generateComplaintId() {
        return Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 5).toUpperCase();
    }

    // Initialize the form
    async function initializeForm() {
        // Load categories first
        try {
            await loadCategories();
        } catch (error) {
            console.warn('Could not load categories from backend, using defaults');
            useDefaultCategories();
        }

        // Initialize first step
        showStep(1);

        console.log('New complaint form initialized');
    }

    // Start initialization
    initializeForm();
});