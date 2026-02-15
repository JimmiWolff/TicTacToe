const { test, expect } = require('@playwright/test');

// Tests for leaving a game and rejoining it.
// Covers the bug where the rejoining player gets the wrong symbol
// because leaveRoom removes them from room.players entirely.

test.describe('Leave and Rejoin Game', () => {
  test.skip(
    () => !process.env.E2E_AUTH0_EMAIL_2 || !process.env.E2E_AUTH0_PASSWORD_2,
    'Requires E2E_AUTH0_EMAIL_2 and E2E_AUTH0_PASSWORD_2 in .env'
  );

  /** Log in a player via Auth0 Universal Login. */
  async function loginPlayer(page, email, password, username) {
    await page.goto('/');
    await expect(page.locator('#loginModal')).toBeVisible();
    await expect(page.locator('#auth0LoginBtn')).toBeEnabled({ timeout: 15_000 });

    await page.locator('#auth0LoginBtn').click();
    await page.waitForURL(/auth0\.com|\.auth0\.com/, { timeout: 15_000 });

    const emailInput = page.locator(
      'input[name="email"], input[name="username"], input[id="username"], input[type="email"]'
    ).first();
    await emailInput.waitFor({ state: 'visible', timeout: 10_000 });
    await emailInput.fill(email);

    const passwordInput = page.locator(
      'input[name="password"], input[id="password"], input[type="password"]'
    ).first();
    await passwordInput.waitFor({ state: 'visible', timeout: 10_000 });
    await passwordInput.fill(password);

    await page.locator(
      'button[type="submit"], button[name="submit"], button[data-action-button-primary]'
    ).first().click();

    await page.waitForURL('http://localhost:3000/**', { timeout: 30_000 });

    const usernameModal = page.locator('#usernameModal');
    const roomModal = page.locator('#roomModal');
    await expect(usernameModal.or(roomModal)).toBeVisible({ timeout: 20_000 });

    if (await usernameModal.isVisible()) {
      await page.locator('#displayUsername').fill(username || 'TestPlayer');
      await page.locator('#usernameForm button[type="submit"]').click();
      await expect(roomModal).toBeVisible({ timeout: 15_000 });
    }
  }

  /** Set up a two-player game. Returns { player1, player2, context1, context2, roomCode }. */
  async function setupTwoPlayerGame(browser) {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const player1 = await context1.newPage();
    const player2 = await context2.newPage();

    await loginPlayer(
      player1,
      process.env.E2E_AUTH0_EMAIL,
      process.env.E2E_AUTH0_PASSWORD,
      process.env.E2E_AUTH0_USERNAME || 'TestPlayer1'
    );
    await loginPlayer(
      player2,
      process.env.E2E_AUTH0_EMAIL_2,
      process.env.E2E_AUTH0_PASSWORD_2,
      process.env.E2E_AUTH0_USERNAME_2 || 'TestPlayer2'
    );

    // Player 1 creates a room (assigned X)
    await player1.locator('#createRoomBtn').click();
    await expect(player1.locator('#gameContainer')).toBeVisible({ timeout: 10_000 });
    const roomCode = await player1.locator('#roomCodeDisplay').textContent();

    // Player 2 joins (assigned O)
    await player2.locator('#roomCodeInput').fill(roomCode);
    await player2.locator('#joinRoomForm button[type="submit"]').click();
    await expect(player2.locator('#gameContainer')).toBeVisible({ timeout: 10_000 });

    // Both see each other
    await expect(player1.locator('#player2Name')).not.toHaveText('Waiting...', { timeout: 10_000 });
    await expect(player2.locator('#player1Name')).not.toHaveText('Waiting...', { timeout: 10_000 });

    return { player1, player2, context1, context2, roomCode };
  }

  // ------------------------------------------------------------------
  // Test 1: Player who leaves and rejoins keeps the same symbol
  // ------------------------------------------------------------------
  test('rejoining player keeps their original symbol (X)', async ({ browser }) => {
    const { player1, player2, context1, context2, roomCode } =
      await setupTwoPlayerGame(browser);

    try {
      // Record Player 1's name (they are X, the room creator)
      const p1Name = await player1.locator('#player1Name').textContent();

      // Make a couple of moves so the game is in progress
      // Player 1 (X) plays center
      await player1.locator('.cell[data-index="4"]').click();
      await expect(player2.locator('.cell[data-index="4"]')).not.toHaveText('', { timeout: 5_000 });

      // Player 2 (O) plays corner
      await player2.locator('.cell[data-index="0"]').click();
      await expect(player1.locator('.cell[data-index="0"]')).not.toHaveText('', { timeout: 5_000 });

      // Player 1 leaves the game
      await player1.locator('#leaveGameBtn').click();
      await expect(player1.locator('#roomModal')).toBeVisible({ timeout: 10_000 });

      // Player 2 should be notified that player 1 disconnected
      // Player 2 should see Player 1 slot as "Waiting..."
      await expect(player2.locator('#player1Name')).toHaveText('Waiting...', { timeout: 10_000 });

      // Player 1 rejoins the same room
      await player1.locator('#roomCodeInput').fill(roomCode);
      await player1.locator('#joinRoomForm button[type="submit"]').click();
      await expect(player1.locator('#gameContainer')).toBeVisible({ timeout: 10_000 });

      // Player 1 should still be X (Player 1 slot), not swapped to O
      await expect(player1.locator('#player1Name')).toHaveText(p1Name, { timeout: 10_000 });
      await expect(player2.locator('#player1Name')).toHaveText(p1Name, { timeout: 10_000 });
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  // ------------------------------------------------------------------
  // Test 2: Board state is preserved after leave and rejoin
  // ------------------------------------------------------------------
  test('board state is preserved when a player leaves and rejoins', async ({ browser }) => {
    const { player1, player2, context1, context2, roomCode } =
      await setupTwoPlayerGame(browser);

    try {
      // Play moves: X at center, O at top-left
      await player1.locator('.cell[data-index="4"]').click();
      await expect(player2.locator('.cell[data-index="4"]')).not.toHaveText('', { timeout: 5_000 });

      await player2.locator('.cell[data-index="0"]').click();
      await expect(player1.locator('.cell[data-index="0"]')).not.toHaveText('', { timeout: 5_000 });

      // Capture board state before leaving
      const cell4Text = await player1.locator('.cell[data-index="4"]').textContent();
      const cell0Text = await player1.locator('.cell[data-index="0"]').textContent();

      // Player 1 leaves
      await player1.locator('#leaveGameBtn').click();
      await expect(player1.locator('#roomModal')).toBeVisible({ timeout: 10_000 });

      // Player 1 rejoins
      await player1.locator('#roomCodeInput').fill(roomCode);
      await player1.locator('#joinRoomForm button[type="submit"]').click();
      await expect(player1.locator('#gameContainer')).toBeVisible({ timeout: 10_000 });

      // Board should be restored with same pieces in same positions
      await expect(player1.locator('.cell[data-index="4"]')).toHaveText(cell4Text, { timeout: 5_000 });
      await expect(player1.locator('.cell[data-index="0"]')).toHaveText(cell0Text, { timeout: 5_000 });

      // Empty cells should still be empty
      await expect(player1.locator('.cell[data-index="1"]')).toHaveText('');
      await expect(player1.locator('.cell[data-index="2"]')).toHaveText('');
      await expect(player1.locator('.cell[data-index="3"]')).toHaveText('');
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  // ------------------------------------------------------------------
  // Test 3: Game can continue after leave and rejoin
  // ------------------------------------------------------------------
  test('game continues correctly after player leaves and rejoins', async ({ browser }) => {
    const { player1, player2, context1, context2, roomCode } =
      await setupTwoPlayerGame(browser);

    try {
      // Move 1: X plays center
      await player1.locator('.cell[data-index="4"]').click();
      await expect(player2.locator('.cell[data-index="4"]')).not.toHaveText('', { timeout: 5_000 });

      // Move 2: O plays top-left
      await player2.locator('.cell[data-index="0"]').click();
      await expect(player1.locator('.cell[data-index="0"]')).not.toHaveText('', { timeout: 5_000 });

      // Player 1 (X) leaves
      await player1.locator('#leaveGameBtn').click();
      await expect(player1.locator('#roomModal')).toBeVisible({ timeout: 10_000 });

      // Player 1 rejoins
      await player1.locator('#roomCodeInput').fill(roomCode);
      await player1.locator('#joinRoomForm button[type="submit"]').click();
      await expect(player1.locator('#gameContainer')).toBeVisible({ timeout: 10_000 });

      // Wait for both players to see each other again
      await expect(player1.locator('#player2Name')).not.toHaveText('Waiting...', { timeout: 10_000 });
      await expect(player2.locator('#player1Name')).not.toHaveText('Waiting...', { timeout: 10_000 });

      // It should be X's turn — Player 1 plays to continue the game
      // Move 3: X plays top-right
      await player1.locator('.cell[data-index="2"]').click();
      await expect(player2.locator('.cell[data-index="2"]')).not.toHaveText('', { timeout: 5_000 });

      // Move 4: O plays middle-left
      await player2.locator('.cell[data-index="3"]').click();
      await expect(player1.locator('.cell[data-index="3"]')).not.toHaveText('', { timeout: 5_000 });

      // Move 5: X plays bottom-right to win diagonal (4, 2... no wait)
      // X has: 4, 2. O has: 0, 3. X needs 6 to win diagonal (2,4,6)
      await player1.locator('.cell[data-index="6"]').click();

      // X should win — score updates
      await expect(player1.locator('#scoreX')).toHaveText('1', { timeout: 10_000 });
      await expect(player2.locator('#scoreX')).toHaveText('1', { timeout: 10_000 });
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  // ------------------------------------------------------------------
  // Test 4: Scores are preserved after leave and rejoin
  // ------------------------------------------------------------------
  test('scores are preserved after leave and rejoin', async ({ browser }) => {
    const { player1, player2, context1, context2, roomCode } =
      await setupTwoPlayerGame(browser);

    try {
      // Play a quick game: X wins top row (0, 1, 2)
      await player1.locator('.cell[data-index="0"]').click();
      await expect(player2.locator('.cell[data-index="0"]')).not.toHaveText('', { timeout: 5_000 });

      await player2.locator('.cell[data-index="3"]').click();
      await expect(player1.locator('.cell[data-index="3"]')).not.toHaveText('', { timeout: 5_000 });

      await player1.locator('.cell[data-index="1"]').click();
      await expect(player2.locator('.cell[data-index="1"]')).not.toHaveText('', { timeout: 5_000 });

      await player2.locator('.cell[data-index="4"]').click();
      await expect(player1.locator('.cell[data-index="4"]')).not.toHaveText('', { timeout: 5_000 });

      await player1.locator('.cell[data-index="2"]').click();

      // X wins — score is 1-0-0
      await expect(player1.locator('#scoreX')).toHaveText('1', { timeout: 10_000 });

      // Player 1 leaves
      await player1.locator('#leaveGameBtn').click();
      await expect(player1.locator('#roomModal')).toBeVisible({ timeout: 10_000 });

      // Player 1 rejoins
      await player1.locator('#roomCodeInput').fill(roomCode);
      await player1.locator('#joinRoomForm button[type="submit"]').click();
      await expect(player1.locator('#gameContainer')).toBeVisible({ timeout: 10_000 });

      // Score should still be 1-0-0
      await expect(player1.locator('#scoreX')).toHaveText('1', { timeout: 10_000 });
      await expect(player1.locator('#scoreO')).toHaveText('0');
      await expect(player1.locator('#scoreDraw')).toHaveText('0');
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  // ------------------------------------------------------------------
  // Test 5: Opponent's view is correct after the other player
  //         leaves and rejoins
  // ------------------------------------------------------------------
  test('opponent sees correct player names after leave and rejoin', async ({ browser }) => {
    const { player1, player2, context1, context2, roomCode } =
      await setupTwoPlayerGame(browser);

    try {
      const p1Name = await player1.locator('#player1Name').textContent();
      const p2Name = await player2.locator('#player2Name').textContent();

      // Player 1 leaves
      await player1.locator('#leaveGameBtn').click();
      await expect(player1.locator('#roomModal')).toBeVisible({ timeout: 10_000 });

      // Player 2 should see Player 1 gone
      await expect(player2.locator('#player1Name')).toHaveText('Waiting...', { timeout: 10_000 });
      // Player 2 should still be in the O slot
      await expect(player2.locator('#player2Name')).toHaveText(p2Name);

      // Player 1 rejoins
      await player1.locator('#roomCodeInput').fill(roomCode);
      await player1.locator('#joinRoomForm button[type="submit"]').click();
      await expect(player1.locator('#gameContainer')).toBeVisible({ timeout: 10_000 });

      // Both should see correct names: P1 as Player 1 (X), P2 as Player 2 (O)
      await expect(player2.locator('#player1Name')).toHaveText(p1Name, { timeout: 10_000 });
      await expect(player2.locator('#player2Name')).toHaveText(p2Name);
      await expect(player1.locator('#player1Name')).toHaveText(p1Name, { timeout: 10_000 });
      await expect(player1.locator('#player2Name')).toHaveText(p2Name);
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  // ------------------------------------------------------------------
  // Test 6: Player 2 (O) leaves and rejoins — keeps symbol O
  // ------------------------------------------------------------------
  test('Player 2 who leaves and rejoins keeps symbol O', async ({ browser }) => {
    const { player1, player2, context1, context2, roomCode } =
      await setupTwoPlayerGame(browser);

    try {
      const p2Name = await player2.locator('#player2Name').textContent();

      // Make a move so game is in progress
      await player1.locator('.cell[data-index="4"]').click();
      await expect(player2.locator('.cell[data-index="4"]')).not.toHaveText('', { timeout: 5_000 });

      // Player 2 (O) leaves
      await player2.locator('#leaveGameBtn').click();
      await expect(player2.locator('#roomModal')).toBeVisible({ timeout: 10_000 });

      // Player 1 should see Player 2 gone
      await expect(player1.locator('#player2Name')).toHaveText('Waiting...', { timeout: 10_000 });

      // Player 2 rejoins
      await player2.locator('#roomCodeInput').fill(roomCode);
      await player2.locator('#joinRoomForm button[type="submit"]').click();
      await expect(player2.locator('#gameContainer')).toBeVisible({ timeout: 10_000 });

      // Player 2 should still be in the O slot (Player 2 position)
      await expect(player1.locator('#player2Name')).toHaveText(p2Name, { timeout: 10_000 });
      await expect(player2.locator('#player2Name')).toHaveText(p2Name, { timeout: 10_000 });
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});
