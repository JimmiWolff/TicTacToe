# Backend Tests

This directory contains Jest tests for the Tic Tac Toe backend server.

## Current Status

### Test Infrastructure ✅
- Jest and Supertest installed
- Test scripts configured in package.json
- Test environment setup created

### Tests Created
- `account-deletion.test.js` - Account deletion API tests (structure only)

## Test Structure

All tests currently contain **placeholder implementations** with the correct structure and assertions documented in comments. These demonstrate the expected test patterns but need to be implemented with actual server and database integration.

## Running Tests

```bash
# Run all tests
npm test

# Run with watch mode (auto-rerun on file changes)
npm test:watch

# Run with coverage report
npm test:coverage
```

## Next Steps

To make these tests fully functional, you need to:

### 1. Database Setup for Tests

Create a test database configuration that:
- Uses a separate MongoDB test database
- Connects before tests run
- Cleans up test data after tests complete

Example approach:
```javascript
// tests/db-setup.js
const { connectToDatabase, getDatabase } = require('../database');

beforeAll(async () => {
  await connectToDatabase();
});

afterAll(async () => {
  const db = getDatabase();
  await db.client.close();
});

beforeEach(async () => {
  // Create fresh test data
});

afterEach(async () => {
  const db = getDatabase();
  await db.collection('highscores').deleteMany({});
  await db.collection('active_games').deleteMany({});
});
```

### 2. Server Setup for Tests

Import and start the Express app for testing:
```javascript
// You may need to refactor server.js to export the app
const app = require('../server');
```

### 3. Authentication Mocking

The tests currently create JWT tokens manually. You'll need to:
- Mock the `verifyToken()` function, OR
- Use real Auth0 test credentials, OR
- Set up a test JWT signing key

### 4. Socket.IO Testing

For Socket.IO tests, you'll need:
- socket.io-client package
- Test helpers to establish connections
- Event listeners to verify notifications

### 5. Implementation Priority

Based on TEST-GUIDELINES.md priorities:

**P0 - Critical (Implement First):**
- Account deletion tests (already structured)
- Authentication tests
- Win detection tests

**P1 - High:**
- Database operations tests
- API endpoint tests
- Socket.IO event tests

**P2 - Medium:**
- Room creation/joining tests
- Settings persistence tests

## Test Coverage Goals

- **Critical paths:** 100% coverage
- **Main features:** 80%+ coverage
- **Overall:** 70%+ coverage

Current coverage: 0% (placeholder tests only)

## Related Documentation

- `/TEST-GUIDELINES.md` - Complete testing guide with examples
- `/qa-review-prompt.md` - QA review checklist
- `/.claude/agents/qa-review.json` - QA review agent configuration

## Notes

- Tests use `expect(true).toBe(true)` placeholders to pass until real implementations are added
- All test structures follow AAA (Arrange-Act-Assert) pattern
- Test descriptions clearly state what behavior is being tested
- Each test is independent and can run in any order
