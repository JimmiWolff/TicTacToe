# Playwright Testing Guide

Comprehensive guide for E2E testing the Tic Tac Toe web app with Playwright.

## Why Playwright?

**Perfect for testing:**
- ✅ Web app at play.tictactoe.dk
- ✅ Real user workflows (login → play → win)
- ✅ Socket.IO real-time multiplayer interactions
- ✅ Cross-browser compatibility
- ✅ Mobile responsive design
- ✅ Auth0 authentication flows

**Advantages:**
- Fast execution (parallel tests)
- Auto-waiting (no flaky tests)
- Built-in debugging tools
- Screenshot/video recording
- Network interception
- Multiple browser support

## Setup

### 1. Install Playwright

```bash
npm install --save-dev @playwright/test
npx playwright install
```

### 2. Initialize Configuration

```bash
npx playwright init
```

This creates:
- `playwright.config.js` - Configuration
- `tests/` - Test directory
- Example tests

### 3. Project Structure

```
tests/
├── e2e/
│   ├── auth.spec.js           # Authentication flows
│   ├── game.spec.js            # Game play scenarios
│   ├── multiplayer.spec.js    # Real-time multiplayer
│   └── account.spec.js         # Account management
├── fixtures/
│   ├── auth.js                 # Auth helpers
│   └── game.js                 # Game helpers
└── utils/
    └── helpers.js              # Shared utilities
```

## Example Tests

### Authentication Test

```javascript
// tests/e2e/auth.spec.js
const { test, expect } = require('@playwright/test');

test.describe('Authentication', () => {
  test('should login with Auth0', async ({ page }) => {
    await page.goto('https://play.tictactoe.dk');

    // Click login button
    await page.click('button:has-text("Login")');

    // Auth0 redirect
    await expect(page).toHaveURL(/auth0\.com/);

    // Fill credentials
    await page.fill('input[name="username"]', process.env.TEST_USER_EMAIL);
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for redirect back
    await page.waitForURL('https://play.tictactoe.dk');

    // Verify logged in
    await expect(page.locator('text=Welcome')).toBeVisible();
  });

  test('should show username setup for new user', async ({ page }) => {
    // Login flow...

    // Check if username modal appears
    await expect(page.locator('#username-modal')).toBeVisible();

    // Enter username
    await page.fill('input[name="username"]', 'TestPlayer');
    await page.click('button:has-text("Save")');

    // Verify username saved
    await expect(page.locator('text=TestPlayer')).toBeVisible();
  });

  test('should logout and clear session', async ({ page, context }) => {
    // Login first...

    await page.click('button:has-text("Logout")');

    // Verify logged out
    await expect(page.locator('button:has-text("Login")')).toBeVisible();

    // Verify cookies cleared
    const cookies = await context.cookies();
    expect(cookies.length).toBe(0);
  });
});
```

### Game Play Test

```javascript
// tests/e2e/game.spec.js
const { test, expect } = require('@playwright/test');

test.describe('Single Game Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://play.tictactoe.dk');
    // Assume auto-login helper used
  });

  test('should play complete game and win', async ({ page }) => {
    // Join a room
    await page.click('button:has-text("Quick Play")');

    // Wait for game board
    await expect(page.locator('.game-board')).toBeVisible();

    // Play moves to win (assuming we're X)
    // X wins with top row: [X, X, X]
    await page.click('[data-cell="0"]'); // X plays cell 0
    await page.click('[data-cell="3"]'); // O plays cell 3 (simulated)
    await page.click('[data-cell="1"]'); // X plays cell 1
    await page.click('[data-cell="4"]'); // O plays cell 4 (simulated)
    await page.click('[data-cell="2"]'); // X plays cell 2 - WINS!

    // Verify win message
    await expect(page.locator('text=You win!')).toBeVisible();

    // Verify win pattern highlighted
    const winningCells = page.locator('.cell.winning');
    await expect(winningCells).toHaveCount(3);

    // Verify score updated
    await expect(page.locator('.score-x')).toContainText('1');
  });

  test('should handle draw correctly', async ({ page }) => {
    await page.click('button:has-text("Quick Play")');

    // Play moves that result in draw
    // [X, O, X]
    // [O, X, O]
    // [O, X, O]
    const moves = [0, 1, 2, 3, 4, 5, 7, 6, 8];
    for (const cellIndex of moves) {
      await page.click(`[data-cell="${cellIndex}"]`);
      await page.waitForTimeout(100); // Brief pause
    }

    // Verify draw message
    await expect(page.locator('text=Draw!')).toBeVisible();

    // Verify draw score updated
    await expect(page.locator('.score-draw')).toContainText('1');
  });

  test('should prevent invalid moves', async ({ page }) => {
    await page.click('button:has-text("Quick Play")');

    // Play cell 0
    await page.click('[data-cell="0"]');

    // Try to play cell 0 again
    await page.click('[data-cell="0"]');

    // Verify error message
    await expect(page.locator('text=Cell is already occupied')).toBeVisible();

    // Verify cell 0 still has original piece
    const cell = page.locator('[data-cell="0"]');
    await expect(cell).toHaveText('X');
  });
});
```

### Multiplayer Real-Time Test

```javascript
// tests/e2e/multiplayer.spec.js
const { test, expect } = require('@playwright/test');

test.describe('Multiplayer Game', () => {
  test('should sync game state between two players', async ({ browser }) => {
    // Create two browser contexts (two players)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const player1 = await context1.newPage();
    const player2 = await context2.newPage();

    // Both players login (use auth helper)
    await loginAsUser(player1, 'player1@test.com', 'password1');
    await loginAsUser(player2, 'player2@test.com', 'password2');

    // Player 1 creates a room
    await player1.click('button:has-text("Create Room")');
    const roomCode = await player1.locator('.room-code').textContent();

    // Player 2 joins the same room
    await player2.click('button:has-text("Join Room")');
    await player2.fill('input[name="roomCode"]', roomCode);
    await player2.click('button:has-text("Join")');

    // Both see the game board
    await expect(player1.locator('.game-board')).toBeVisible();
    await expect(player2.locator('.game-board')).toBeVisible();

    // Player 1 (X) makes a move
    await player1.click('[data-cell="0"]');

    // Player 2 sees the move immediately (Socket.IO sync)
    await expect(player2.locator('[data-cell="0"]')).toHaveText('X');

    // Player 2 (O) makes a move
    await player2.click('[data-cell="1"]');

    // Player 1 sees the move
    await expect(player1.locator('[data-cell="1"]')).toHaveText('O');

    // Verify turn indicator switches
    await expect(player1.locator('.turn-indicator')).toContainText('Your turn');
    await expect(player2.locator('.turn-indicator')).toContainText('Opponent\'s turn');

    await context1.close();
    await context2.close();
  });

  test('should handle player disconnection', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const player1 = await context1.newPage();
    const player2 = await context2.newPage();

    // Setup game with both players...

    // Player 2 disconnects
    await context2.close();

    // Player 1 sees disconnection message
    await expect(player1.locator('text=Opponent disconnected')).toBeVisible();

    // Player 1 can still see game state
    await expect(player1.locator('.game-board')).toBeVisible();

    await context1.close();
  });
});
```

### Account Deletion Test

```javascript
// tests/e2e/account.spec.js
const { test, expect } = require('@playwright/test');

test.describe('Account Management', () => {
  test('should delete account with confirmation', async ({ page, context }) => {
    await page.goto('https://play.tictactoe.dk');
    await loginAsUser(page, 'delete-test@test.com', 'password');

    // Open settings
    await page.click('button[aria-label="Settings"]');

    // Scroll to danger zone
    await page.locator('text=Danger Zone').scrollIntoViewIfNeeded();

    // Click delete account
    await page.click('button:has-text("Delete Account")');

    // First confirmation dialog
    await expect(page.locator('.dialog >> text=Delete Account?')).toBeVisible();
    await page.click('button:has-text("Delete")');

    // Second confirmation dialog
    await expect(page.locator('.dialog >> text=Final Warning')).toBeVisible();
    await expect(page.locator('text=permanently delete')).toBeVisible();
    await page.click('button:has-text("Permanently Delete")');

    // Wait for deletion to complete
    await page.waitForURL('https://play.tictactoe.dk');

    // Verify logged out
    await expect(page.locator('button:has-text("Login")')).toBeVisible();

    // Try to login again - should work but no data
    await loginAsUser(page, 'delete-test@test.com', 'password');

    // Verify no username (fresh account)
    await expect(page.locator('#username-modal')).toBeVisible();
  });

  test('should cancel account deletion', async ({ page }) => {
    await loginAsUser(page, 'test@test.com', 'password');

    await page.click('button[aria-label="Settings"]');
    await page.click('button:has-text("Delete Account")');

    // Cancel at first confirmation
    await page.click('button:has-text("Cancel")');

    // Verify still in settings
    await expect(page.locator('.settings-modal')).toBeVisible();

    // Verify still logged in
    await page.click('button:has-text("Done")');
    await expect(page.locator('text=Welcome')).toBeVisible();
  });
});
```

## Configuration

### playwright.config.js

```javascript
// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',

  // Test timeout
  timeout: 30 * 1000,

  // Expect timeout
  expect: {
    timeout: 5000
  },

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter
  reporter: [
    ['html'],
    ['list'],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],

  // Shared settings for all projects
  use: {
    // Base URL
    baseURL: process.env.BASE_URL || 'https://play.tictactoe.dk',

    // Collect trace on failure
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile browsers
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Run local dev server before starting tests
  webServer: process.env.CI ? undefined : {
    command: 'npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

## Test Helpers

### Auth Helper

```javascript
// tests/fixtures/auth.js
const { expect } = require('@playwright/test');

async function loginAsUser(page, email, password) {
  await page.goto('/');

  // Click login button
  await page.click('button:has-text("Login")');

  // Wait for Auth0
  await page.waitForURL(/auth0\.com/);

  // Fill credentials
  await page.fill('input[name="username"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for redirect
  await page.waitForURL('/');

  // Verify logged in
  await expect(page.locator('text=Welcome')).toBeVisible();
}

async function logout(page) {
  await page.click('button:has-text("Logout")');
  await expect(page.locator('button:has-text("Login")')).toBeVisible();
}

module.exports = { loginAsUser, logout };
```

### Game Helper

```javascript
// tests/fixtures/game.js
async function playMove(page, cellIndex) {
  await page.click(`[data-cell="${cellIndex}"]`);
  await page.waitForTimeout(100); // Brief pause for animation
}

async function waitForGameBoard(page) {
  await page.waitForSelector('.game-board', { state: 'visible' });
}

async function getBoardState(page) {
  const cells = await page.locator('.cell').allTextContents();
  return cells;
}

async function playWinningSequence(page, moves) {
  for (const move of moves) {
    await playMove(page, move);
  }
}

module.exports = {
  playMove,
  waitForGameBoard,
  getBoardState,
  playWinningSequence
};
```

## Running Tests

### Local Development

```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test tests/e2e/auth.spec.js

# Run in headed mode (see browser)
npx playwright test --headed

# Run in specific browser
npx playwright test --project=chromium

# Run with UI mode (interactive)
npx playwright test --ui

# Debug mode
npx playwright test --debug
```

### CI/CD Integration

```bash
# Run all tests in CI
npx playwright test --reporter=html,junit

# Generate HTML report
npx playwright show-report
```

## GitHub Actions Integration

```yaml
# .github/workflows/playwright.yml
name: Playwright Tests
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - uses: actions/setup-node@v4
      with:
        node-version: 18

    - name: Install dependencies
      run: npm ci

    - name: Install Playwright Browsers
      run: npx playwright install --with-deps

    - name: Run Playwright tests
      run: npx playwright test
      env:
        BASE_URL: https://play.tictactoe.dk
        TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
        TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}

    - uses: actions/upload-artifact@v4
      if: always()
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 30
```

## Best Practices

### 1. Use Data Attributes for Selectors

```html
<!-- Good -->
<button data-testid="quick-play">Quick Play</button>

<!-- Playwright test -->
await page.click('[data-testid="quick-play"]');
```

### 2. Auto-Waiting

```javascript
// Playwright automatically waits
await page.click('button'); // Waits for button to be clickable

// No need for manual waits (usually)
// await page.waitForTimeout(1000); // ❌ Avoid
```

### 3. Test Isolation

```javascript
test.beforeEach(async ({ page }) => {
  // Fresh state for each test
  await page.goto('/');
  await loginAsUser(page, 'test@test.com', 'password');
});

test.afterEach(async ({ page }) => {
  // Clean up
  await logout(page);
});
```

### 4. Parallel Execution

```javascript
// tests/e2e/game.spec.js
test.describe.configure({ mode: 'parallel' });

test('test 1', async ({ page }) => { /* ... */ });
test('test 2', async ({ page }) => { /* ... */ });
// These run in parallel
```

### 5. Visual Testing

```javascript
test('should render game board correctly', async ({ page }) => {
  await page.goto('/game');

  // Take screenshot
  await expect(page).toHaveScreenshot('game-board.png');

  // Compare against baseline
  // Fails if visual differences detected
});
```

## Common Patterns for Your App

### Socket.IO Testing

```javascript
// Wait for Socket.IO connection
await page.waitForFunction(() => {
  return window.socketConnected === true;
});

// Listen to socket events
await page.evaluate(() => {
  window.lastSocketEvent = null;
  window.socket.on('gameStateUpdate', (data) => {
    window.lastSocketEvent = data;
  });
});

// Trigger action and verify socket event
await page.click('[data-cell="0"]');
await page.waitForFunction(() => window.lastSocketEvent !== null);

const eventData = await page.evaluate(() => window.lastSocketEvent);
expect(eventData.board[0]).toBe('X');
```

### Testing Real-Time Updates

```javascript
// Player 1 makes move
await player1.click('[data-cell="0"]');

// Player 2 sees update (auto-wait)
await expect(player2.locator('[data-cell="0"]')).toHaveText('X', {
  timeout: 3000 // Wait up to 3 seconds for Socket.IO sync
});
```

## Debugging Tips

### 1. Playwright Inspector

```bash
npx playwright test --debug
```

### 2. Screenshots

```javascript
await page.screenshot({ path: 'debug.png' });
```

### 3. Console Logs

```javascript
page.on('console', msg => console.log('Browser:', msg.text()));
```

### 4. Network Logs

```javascript
page.on('request', request => console.log('>>', request.method(), request.url()));
page.on('response', response => console.log('<<', response.status(), response.url()));
```

## Coverage Goals

**E2E Coverage with Playwright:**
- Critical user flows: 100%
- Main features: 80%
- Edge cases: 60%

**Critical Flows to Test:**
1. ✅ Auth0 login/logout
2. ✅ Quick Play (matchmaking)
3. ✅ Create/Join room
4. ✅ Play game to win
5. ✅ Play game to draw
6. ✅ Multiplayer real-time sync
7. ✅ Account deletion
8. ✅ Settings (username, colors)
9. ✅ Leaderboard
10. ✅ Reconnection after disconnect

## Next Steps

1. Install Playwright
2. Create first test (auth flow)
3. Add game flow tests
4. Add multiplayer tests
5. Integrate with CI/CD
6. Run tests before every merge

---

**Playwright is perfect for your web app E2E testing!** 🎭
