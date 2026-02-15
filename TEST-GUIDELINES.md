# Testing Guidelines

Guidelines for writing tests for the Tic Tac Toe multiplayer game.

## Recommended Testing Stack

```
Testing Strategy:
├── Backend
│   ├── Jest + Supertest (unit + integration tests)
│   └── Coverage: Functions, APIs, Socket.IO
│
├── Web App
│   ├── Playwright ⭐ (E2E tests)
│   └── Coverage: User flows, real-time interactions
│
└── iOS App
    ├── XCTest (unit tests)
    └── XCUITest (UI tests)
```

## Test Structure

### Backend Tests (Node.js + Jest)

**Location:** `/tests/` directory

**File naming:**
- `feature.test.js` - Unit tests for a feature
- `integration.test.js` - Integration tests
- `api.test.js` - API endpoint tests

### Web App E2E Tests (Playwright)

**Location:** `/tests/e2e/` directory

**File naming:**
- `auth.spec.js` - Authentication flows
- `game.spec.js` - Game play scenarios
- `multiplayer.spec.js` - Real-time multiplayer
- `account.spec.js` - Account management

**See:** `PLAYWRIGHT-GUIDE.md` for complete Playwright documentation

**Example Test Structure:**
```javascript
const request = require('supertest');
const app = require('../server');
const { connectToDatabase, getDatabase } = require('../database');

describe('Account Deletion API', () => {
  beforeAll(async () => {
    await connectToDatabase();
  });

  afterAll(async () => {
    // Cleanup
  });

  beforeEach(async () => {
    // Setup for each test
  });

  afterEach(async () => {
    // Cleanup after each test
  });

  describe('DELETE /api/user/account', () => {
    test('deletes user account with valid token', async () => {
      const token = 'valid-token';

      const response = await request(app)
        .delete('/api/user/account')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify user is deleted from database
      const db = getDatabase();
      const user = await db.collection('highscores').findOne({ userId: 'test-user' });
      expect(user).toBeNull();
    });

    test('returns 401 for invalid token', async () => {
      const response = await request(app)
        .delete('/api/user/account')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid token');
    });

    test('returns 401 when no token provided', async () => {
      const response = await request(app)
        .delete('/api/user/account')
        .expect(401);

      expect(response.body.error).toBe('No authorization header');
    });
  });
});
```

### iOS Tests (Swift + XCTest)

**Location:** `/TicTacToeMultiplayer/TicTacToeMultiplayerTests/`

**File naming:**
- `FeatureTests.swift` - Tests for a specific feature
- `ViewModelTests.swift` - ViewModel tests
- `ServiceTests.swift` - Service layer tests

**Example Test Structure:**
```swift
import XCTest
@testable import TicTacToeMultiplayer

class AccountDeletionTests: XCTestCase {
    var viewModel: AuthViewModel!
    var mockAPIService: MockAPIService!

    override func setUpWithError() throws {
        mockAPIService = MockAPIService()
        viewModel = AuthViewModel()
    }

    override func tearDownWithError() throws {
        viewModel = nil
        mockAPIService = nil
    }

    func testAccountDeletionSuccess() async throws {
        // Given
        mockAPIService.shouldSucceed = true
        viewModel.isAuthenticated = true

        // When
        try await viewModel.deleteAccount()

        // Then
        XCTAssertFalse(viewModel.isAuthenticated)
        XCTAssertEqual(viewModel.username, "")
        XCTAssertNil(viewModel.userId)
    }

    func testAccountDeletionFailureShowsError() async throws {
        // Given
        mockAPIService.shouldSucceed = false
        mockAPIService.errorToThrow = APIError.accountDeletionFailed

        // When/Then
        do {
            try await viewModel.deleteAccount()
            XCTFail("Should have thrown error")
        } catch {
            XCTAssertNotNil(viewModel.errorMessage)
            XCTAssertTrue(viewModel.isAuthenticated) // Still authenticated on failure
        }
    }
}
```

## What to Test

### Critical Features (Must Test)

#### Authentication
```javascript
// Backend
describe('Authentication', () => {
  test('verifies valid Auth0 token');
  test('verifies valid Apple Sign In token');
  test('rejects invalid token');
  test('rejects expired token');
  test('extracts user ID from token');
});
```

```swift
// iOS
class AuthenticationTests: XCTestCase {
    func testAuth0LoginSuccess()
    func testAppleSignInSuccess()
    func testGuestModeDoesNotConnectToServer()
    func testLogoutClearsAllAuthData()
}
```

#### Game Logic
```javascript
describe('Win Detection', () => {
  test('detects horizontal win (top row)');
  test('detects horizontal win (middle row)');
  test('detects horizontal win (bottom row)');
  test('detects vertical win (left column)');
  test('detects vertical win (middle column)');
  test('detects vertical win (right column)');
  test('detects diagonal win (top-left to bottom-right)');
  test('detects diagonal win (top-right to bottom-left)');
  test('returns null when no win');
});

describe('Turn Validation', () => {
  test('allows player X to move on their turn');
  test('prevents player X from moving on O\'s turn');
  test('switches turns after valid move');
});
```

#### Database Operations
```javascript
describe('Game State Persistence', () => {
  test('saves game state to MongoDB');
  test('loads game state from MongoDB');
  test('updates player status');
  test('deletes game from database');
  test('handles connection errors gracefully');
});
```

#### Account Deletion
```javascript
describe('Account Deletion', () => {
  test('deletes user from highscores');
  test('deletes all user games');
  test('removes user from active games');
  test('disconnects user sockets');
  test('requires authentication');
  test('user cannot delete other users\' accounts');
});
```

### Important Features (Should Test)

- Room creation and joining
- Socket.IO event handling
- API endpoints
- Settings persistence
- Error handling

### Nice to Test

- UI interactions
- Color pickers
- Toast messages
- Loading states

## Test Patterns

### AAA Pattern (Arrange-Act-Assert)

```javascript
test('description', () => {
  // Arrange - Set up test data
  const user = { id: '123', username: 'test' };
  const token = createToken(user);

  // Act - Perform the action
  const result = verifyToken(token);

  // Assert - Check the result
  expect(result.id).toBe('123');
  expect(result.username).toBe('test');
});
```

### Given-When-Then Pattern

```swift
func testExample() {
    // Given
    let viewModel = GameViewModel()
    viewModel.gameState.board = ["X", "X", "", "", "", "", "", "", ""]

    // When
    viewModel.cellTapped(index: 2)

    // Then
    XCTAssertEqual(viewModel.gameState.board[2], "X")
}
```

### Test Doubles

**Mock:** Replace external dependency
```javascript
const mockDatabase = {
  findOne: jest.fn().mockResolvedValue({ userId: '123' }),
  deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 })
};
```

**Spy:** Track function calls
```javascript
const spy = jest.spyOn(console, 'error');
// Do something that logs error
expect(spy).toHaveBeenCalledWith('Error message');
spy.mockRestore();
```

**Stub:** Return predefined values
```swift
class MockAPIService: APIServiceProtocol {
    var shouldSucceed = true
    var errorToThrow: Error?

    func deleteAccount(token: String) async throws {
        if shouldSucceed {
            return
        } else {
            throw errorToThrow ?? APIError.serverError
        }
    }
}
```

## Common Testing Mistakes

### ❌ Don't Do This

**Testing implementation details:**
```javascript
// BAD - Tests internal implementation
test('uses MongoDB to save', () => {
  expect(mockDB.collection).toHaveBeenCalledWith('games');
});
```

**Tests dependent on execution order:**
```javascript
// BAD - Test 2 depends on Test 1
test('test 1 creates user', () => { /* creates user */ });
test('test 2 updates user', () => { /* assumes user exists */ });
```

**Vague test names:**
```javascript
// BAD
test('it works');
test('test1');
```

**Testing multiple things:**
```javascript
// BAD
test('login and create game and make move', () => {
  // Too much in one test
});
```

### ✅ Do This Instead

**Test behavior, not implementation:**
```javascript
// GOOD - Tests the outcome
test('saves game state that can be retrieved later', async () => {
  await saveGame(gameData);
  const loaded = await loadGame(roomCode);
  expect(loaded.board).toEqual(gameData.board);
});
```

**Independent tests:**
```javascript
// GOOD - Each test sets up its own data
test('creates user', () => {
  const user = createTestUser();
  // test with this user
});

test('updates user', () => {
  const user = createTestUser(); // Create fresh user
  // test with this user
});
```

**Descriptive test names:**
```javascript
// GOOD
test('returns 401 when token is invalid');
test('detects win when player has 3 in top row');
```

**One behavior per test:**
```javascript
// GOOD
test('user can login with Auth0', () => { /* ... */ });
test('user can create game after login', () => { /* ... */ });
test('user can make move in created game', () => { /* ... */ });
```

## Test Coverage Goals

### Target Coverage

- **Critical paths:** 100% coverage
- **Main features:** 80%+ coverage
- **Overall:** 70%+ coverage

### What to Prioritize

1. **P0 - Critical:**
   - Authentication/Authorization
   - Data deletion
   - Win/loss detection
   - Payment processing (if applicable)

2. **P1 - High:**
   - Main user workflows
   - Database operations
   - API endpoints

3. **P2 - Medium:**
   - UI interactions
   - Settings
   - Non-critical features

4. **P3 - Low:**
   - Cosmetic changes
   - Logging
   - Analytics

## Running Tests

### Backend
```bash
# Run all tests
npm test

# Run specific test file
npm test tests/auth.test.js

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

### iOS
```bash
# Run all tests
xcodebuild test -scheme TicTacToeMultiplayer

# Or in Xcode
Cmd + U
```

## Setting Up Tests

### Backend Setup

1. **Install Jest:**
```bash
npm install --save-dev jest supertest
```

2. **Update package.json:**
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "jest": {
    "testEnvironment": "node",
    "coveragePathIgnorePatterns": ["/node_modules/"],
    "testMatch": ["**/__tests__/**/*.js", "**/?(*.)+(spec|test).js"]
  }
}
```

3. **Create test database config:**
```javascript
// test-setup.js
process.env.MONGODB_URI = 'mongodb://localhost:27017/tictactoe_test';
process.env.NODE_ENV = 'test';
```

### iOS Setup

1. **Create test target in Xcode:**
   - File > New > Target > iOS Unit Testing Bundle

2. **Import app module:**
```swift
@testable import TicTacToeMultiplayer
```

3. **Add test files to test target**

## Continuous Integration

Tests should run automatically:
- On every pull request
- Before merging to main
- After merging to main (verify)

Example GitHub Actions:
```yaml
name: Tests
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run backend tests
        run: npm test
```

## Questions?

- **"Do I need to test everything?"** - No, focus on critical features and main workflows
- **"What about private functions?"** - Test them through public API, not directly
- **"How many tests for a feature?"** - Enough to cover success, failure, and edge cases
- **"Should I mock everything?"** - No, use real dependencies when possible, mock external services
- **"What's a good test name?"** - Describes what it tests and expected outcome

## Resources

- [Jest Documentation](https://jestjs.io/)
- [XCTest Documentation](https://developer.apple.com/documentation/xctest)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
