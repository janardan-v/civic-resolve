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

    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.getElementById('sidebar');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            menuToggle.classList.toggle('active');
        });
    }

    // Function to capitalize the first letter of the role
    function capitalize(roleString) {
        if (typeof roleString !== 'string' || roleString.length === 0) {
            return '';
        }
        return roleString.charAt(0).toUpperCase() + roleString.slice(1);
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
    const locationAddress = document.getElementById('location-address');
    const locationLat = document.getElementById('location-lat');
    const locationLng = document.getElementById('location-lng');

    let currentLocation = { lat: null, lng: null };
    let selectedCategory = null;
    let selectedCategoryId = null;
    let currentStep = 1;
    let availableCategories = [];
    let map;
    let marker;

    // Success overlay state management
    let overlayJustOpened = false;
    let overlayOpenTime = 0;
    let overlayClickEnabled = false;

    const recordBtn = document.getElementById('record-btn');
    const stopBtn = document.getElementById('stop-btn');
    const audioInput = document.getElementById('audio-input');
    const audioPlayback = document.getElementById('audio-playback');
    const recordingStatus = document.getElementById('recording-status');
    const removeAudioBtn = document.getElementById('remove-audio-btn');
    const uploadAudioBtn = document.getElementById('file-upload-option');

    let mediaRecorder;
    let audioChunks = [];
    let recordedAudioFile = null;

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
            tile.dataset.categoryId = category.categoryId;

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
            'roads and infrastructure': 'bricks',
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

        if (stepNumber === 3 && map) {
            // Use a small timeout to ensure the container is visible before resizing.
            setTimeout(function () {
                map.invalidateSize();
            }, 100)
        }
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
    // Handle the recording process
    recordBtn.addEventListener('click', async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = event => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                recordedAudioFile = new File([audioBlob], 'voice-recording.webm', { type: 'audio/webm' });
                audioPlayback.src = URL.createObjectURL(audioBlob);
                audioPlayback.style.display = 'block';
                recordingStatus.textContent = "Recording saved.";
                audioInput.disabled = true;
                removeAudioBtn.style.display = 'inline-block'; // Show remove button
            };

            mediaRecorder.start();
            recordBtn.disabled = true;
            stopBtn.disabled = false;
            audioInput.disabled = true;
            recordingStatus.textContent = "Recording...";
        } catch (err) {
            console.error('Error accessing microphone:', err);
            alert('Could not access your microphone. Please check permissions.');
        }
    });

    stopBtn.addEventListener('click', () => {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        recordBtn.disabled = false;
        stopBtn.disabled = true;
    });

    uploadAudioBtn.addEventListener('click', () => {
        // Programmatically click the hidden file input
        audioInput.click();
    });

    // Handle a file upload
    audioInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('audio/')) {
            recordedAudioFile = file;
            audioPlayback.src = URL.createObjectURL(file);
            audioPlayback.style.display = 'block';
            recordBtn.disabled = true;
            recordingStatus.textContent = `File selected: ${file.name}`;
            removeAudioBtn.style.display = 'inline-block'; // Show remove button
        } else {
            alert('Please select a valid audio file.');
            recordedAudioFile = null;
            audioPlayback.src = '';
        }
    });

    // New: Handle audio removal
    removeAudioBtn.addEventListener('click', () => {
        recordedAudioFile = null;
        audioPlayback.src = '';
        audioPlayback.style.display = 'none';
        audioInput.value = null;
        recordBtn.disabled = false;
        audioInput.disabled = false;
        recordingStatus.textContent = "Click record or upload to begin.";
        removeAudioBtn.style.display = 'none';
    });

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
                    updateMapAndFormState(position.coords.latitude, position.coords.longitude, 16);
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    alert('Unable to get your location. Please check your browser permissions.');
                }
            );
        } else {
            alert('Geolocation is not supported by this browser.');
        }
    }

    function updateMapAndFormState(lat, lng, zoomLevel) {
        // 1. Update the map view
        map.setView([lat, lng], zoomLevel);

        // 2. Update the marker
        if (marker) {
            marker.setLatLng([lat, lng]);
        } else {
            marker = L.marker([lat, lng], { draggable: true }).addTo(map);
            marker.on('dragend', (e) => {
                const newPos = e.target.getLatLng();
                updateMapAndFormState(newPos.lat, newPos.lng, map.getZoom());
            });
        }

        // 3. Update the main script's state variable
        currentLocation.lat = lat;
        currentLocation.lng = lng;
        console.log('Form location state updated:', currentLocation);

        // 4. Update the browser's address bar (URL)
        const newUrl = `${window.location.pathname}?lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}`;
        window.history.replaceState({ lat, lng }, '', newUrl);

        // 5. Fetch the human-readable address and update all UI elements
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
            .then(res => res.json())
            .then(data => {
                const address = data.display_name || 'Address not found.';

                document.getElementById('address-input').value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

                // Update the display area below the map
                document.getElementById('location-address').textContent = address;
                document.getElementById('location-lat').textContent = lat.toFixed(6);
                document.getElementById('location-lng').textContent = lng.toFixed(6);
                document.getElementById('selected-location').style.display = 'block';

                // Enable the Next button
                const nextBtn = document.getElementById('next-3');
                if (nextBtn) {
                    nextBtn.disabled = false;
                }
            })
            .catch(error => {
                console.error('Error fetching address:', error);
                document.getElementById('location-address').textContent = 'Could not fetch address.';
            });
    }

    function initializeMap() {
        const mapContainer = document.getElementById('location-map');
        if (!mapContainer) return;

        map = L.map(mapContainer).setView([28.6139, 77.2090], 10);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Event listener for manual address search
        const addressInput = document.getElementById('address-input');
        addressInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = addressInput.value;
                if (!query) return;
                fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data && data.length > 0) {
                            const { lat, lon } = data[0];
                            updateMapAndFormState(parseFloat(lat), parseFloat(lon), 16);
                        } else {
                            alert('Location not found.');
                        }
                    });
            }
        });

        // Event listener for map clicks
        map.on('click', (e) => {
            updateMapAndFormState(e.latlng.lat, e.latlng.lng, map.getZoom());
        });
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

    const reviewAudioContainer = document.getElementById('review-audio-container');
    const reviewAudioPlayback = document.getElementById('review-audio-playback');
    const noAudioText = document.getElementById('no-audio-text');

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

        // Update audio review
        if (recordedAudioFile) {
            reviewAudioPlayback.src = URL.createObjectURL(recordedAudioFile);

            reviewAudioContainer.style.display = 'block';
            noAudioText.style.display = 'none';

            const reviewAudioStatus = document.getElementById('review-audio-status');
            if (reviewAudioStatus) {
                reviewAudioStatus.textContent = `File: ${recordedAudioFile.name}`;
            }

        } else {
            // Hide the audio container and show the "no audio" text
            reviewAudioContainer.style.display = 'none';
            noAudioText.style.display = 'block';

        }

        const reviewAddressEl = document.getElementById('review-address');
        const reviewCoordsEl = document.getElementById('review-coords');

        if (reviewAddressEl && locationAddress) {
            // Use the text from the location step's address element
            reviewAddressEl.textContent = locationAddress.textContent || 'No address provided';
        }

        if (reviewCoordsEl && currentLocation.lat && currentLocation.lng) {
            reviewCoordsEl.textContent = `${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}`;
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

                if (recordedAudioFile) {
                    // The name 'voiceRecording' must match what your backend expects
                    formData.append('voiceRecording', recordedAudioFile);
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

        initializeMap();
        console.log('New complaint form initialized');
    }

    // Start initialization
    initializeForm();
});
