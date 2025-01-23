// Select the theme toggle icons
const lightThemeIcon = document.getElementById('light-theme-icon');
const darkThemeIcon = document.getElementById('dark-theme-icon');

// Check if user previously selected a theme
const savedTheme = localStorage.getItem('theme') || 'dark-mode';

document.body.classList.add(savedTheme);
darkThemeIcon.style.display = savedTheme === 'light-mode' ? 'inline' : 'none';
lightThemeIcon.style.display = savedTheme === 'dark-mode' ? 'inline' : 'none';

// Add event listeners for theme toggle icons
lightThemeIcon.addEventListener('click', () => {
    document.body.classList.remove('dark-mode');
    document.body.classList.add('light-mode');
    localStorage.setItem('theme', 'light-mode'); // Save user preference
    lightThemeIcon.style.display = 'none'; // Hide light icon
    darkThemeIcon.style.display = 'inline'; // Show dark icon

    updateModalTheme('light-mode'); // Update modal theme
});

darkThemeIcon.addEventListener('click', () => {
    document.body.classList.remove('light-mode');
    document.body.classList.add('dark-mode');
    localStorage.setItem('theme', 'dark-mode'); // Save user preference
    darkThemeIcon.style.display = 'none'; // Hide dark icon
    lightThemeIcon.style.display = 'inline'; // Show light icon

    updateModalTheme('dark-mode'); // Update modal theme
});


// Function to update modal theme
function updateModalTheme(theme) 
{
    const modalContent = document.querySelector('.modal-content');
    if (theme === 'light-mode') 
    {
        modalContent.classList.remove('dark-mode');
        modalContent.classList.add('light-mode');
    } 
    else 
    {
        modalContent.classList.remove('light-mode');
        modalContent.classList.add('dark-mode');
    }
}