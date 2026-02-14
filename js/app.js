/**
 * App Entry Point - Initializes the application.
 */
document.addEventListener('DOMContentLoaded', () => {
    // UI and Store are initialized in their respective files and attached to window
    console.log('Cost Per Use App Initialized');

    // Register Service Worker for PWA / Add to Home Screen
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').then(registration => {
            // Check for updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New version available
                        // We could show a toast here, but for now we rely on the next reload
                        console.log('New version available');
                    }
                });
            });
        }).catch(() => { });

        // Refresh page when new SW takes control
        let refreshing;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            window.location.reload();
            refreshing = true;
        });
    }
});
