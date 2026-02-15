// Test setup file
// Sets environment variables for testing

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tictactoe_test';
process.env.SESSION_SECRET = 'test-secret';
process.env.AUTH0_DOMAIN = 'test-domain.auth0.com';
process.env.AUTH0_AUDIENCE = 'test-audience';
process.env.SENTRY_DSN = ''; // Disable Sentry in tests
