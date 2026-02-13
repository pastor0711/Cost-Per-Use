/**
 * App Entry Point - Initializes the application.
 */
document.addEventListener('DOMContentLoaded', () => {
    // UI and Store are initialized in their respective files and attached to window
    console.log('Cost Per Use App Initialized');

    // Register Service Worker for PWA / Add to Home Screen
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(() => { });
    }
});
