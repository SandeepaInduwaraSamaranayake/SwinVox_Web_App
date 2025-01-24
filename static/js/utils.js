const loadingSpinner = document.getElementById('loading');

// Function to show notification banner
export function showNotification(message , type) 
{
    const banner = document.getElementById('notification-banner');
    banner.textContent = message;
    banner.className = `notification ${type}`;
    banner.style.display = 'block';

    // Hide the banner after a few seconds
    setTimeout(() => {
        banner.classList.add('hide');
        setTimeout(() => {
            banner.style.display = 'none';
            banner.classList.remove('hide');
        }, 500); // Wait for the fade-out transition to complete
    }, 3000); // Display for 3 seconds
}

// Helper function to show/hide loading spinner
export function toggleLoadingSpinner(show) 
{
    loadingSpinner.style.display = show ? 'block' : 'none';
}
