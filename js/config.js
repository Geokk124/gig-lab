const config = {
    API_URL: process.env.NODE_ENV === 'production' 
        ? 'https://your-app-name.onrender.com/api'
        : 'http://localhost:5000',
    BASE_URL: window.location.hostname === 'geokk124.github.io' 
        ? '/gig-lab'
        : ''
}; 