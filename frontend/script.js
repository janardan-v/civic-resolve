document.addEventListener('DOMContentLoaded', function () {
    // Force clear any previous theme settings to ensure fresh start
    localStorage.removeItem('theme');

    // Check if hero background image exists, if not, apply a fallback
    const heroSection = document.querySelector('.new-hero');
    const img = new Image();
    img.src = 'Images/jharkhand-background.jpg';

    img.onerror = function () {
        // If image fails to load, apply a gradient background
        heroSection.style.backgroundImage = 'linear-gradient(135deg, #1e5799 0%, #2989d8 50%, #207cca 51%, #7db9e8 100%)';
    };
    
    // Near Me functionality
    const nearMeButtons = document.querySelectorAll('.near-me-btn');
    const policeIframe = document.getElementById('police-iframe');
    const hospitalIframe = document.getElementById('hospital-iframe');
    const evIframe = document.getElementById('ev-iframe');

    // Function to handle location-based services
    function handleLocationServices(service) {
        // Update active button state
        nearMeButtons.forEach(btn => btn.classList.remove('active'));
        event.currentTarget.classList.add('active');

        // Hide all iframes
        policeIframe.style.display = 'none';
        hospitalIframe.style.display = 'none';
        evIframe.style.display = 'none';

        // Show the appropriate iframe based on service
        if (service === 'police') {
            policeIframe.style.display = 'block';
        } else if (service === 'hospital') {
            hospitalIframe.style.display = 'block';
        } else if (service === 'fire') { // Used 'fire' as the data-service for EV stations
            evIframe.style.display = 'block';
        }
    }

    // Add event listeners to the Near Me buttons
    nearMeButtons.forEach(button => {
        button.addEventListener('click', function (event) {
            const service = this.getAttribute('data-service');
            handleLocationServices(service);
        });
    });

    // Initialize the first service button as active
    if (nearMeButtons.length > 0) {
        const defaultService = nearMeButtons[0].getAttribute('data-service');
        nearMeButtons[0].classList.add('active');

        // Show the police iframe by default (first button)
        document.getElementById('police-iframe').style.display = 'block';
        document.getElementById('hospital-iframe').style.display = 'none';
        document.getElementById('ev-iframe').style.display = 'none';
    }

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');

            if (targetId !== '#') {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    window.scrollTo({
                        top: targetElement.offsetTop - 100, // Offset for the fixed header
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    // Background animation enhancement (subtle pulsing effect)
    function pulseBackground() {
        document.body.classList.add('pulse');
        setTimeout(() => {
            document.body.classList.remove('pulse');
        }, 2000);
    }

    // Optional: Uncomment to add subtle pulse effect every 60 seconds
    // setInterval(pulseBackground, 60000);

    // Theme toggle functionality
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = themeToggle.querySelector('i');

    // Always start with light theme by forcing removal of dark-theme class
    document.body.classList.remove('dark-theme');
    themeIcon.classList.remove('bi-sun-fill');
    themeIcon.classList.add('bi-moon-stars-fill');

    // Check for saved theme preference, but only apply dark theme if explicitly requested
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        // Apply dark theme
        document.body.classList.add('dark-theme');
        themeIcon.classList.remove('bi-moon-stars-fill');
        themeIcon.classList.add('bi-sun-fill');
    } else {
        // Force light theme in localStorage
        localStorage.setItem('theme', 'light');
    }

    // Toggle theme when button is clicked
    themeToggle.addEventListener('click', function () {
        document.body.classList.toggle('dark-theme');

        // Update icon
        if (document.body.classList.contains('dark-theme')) {
            themeIcon.classList.remove('bi-moon-stars-fill');
            themeIcon.classList.add('bi-sun-fill');
            localStorage.setItem('theme', 'dark');
        } else {
            themeIcon.classList.remove('bi-sun-fill');
            themeIcon.classList.add('bi-moon-stars-fill');
            localStorage.setItem('theme', 'light');
        }
    });
});