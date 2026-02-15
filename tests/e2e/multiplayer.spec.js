const { test, expect, chromium } = require('@playwright/test');

// Multiplayer tests use two separate browser contexts with different Auth0 accounts.
// They do NOT use the shared auth state from the setup project.
test.describe('Multiplayer', () => {
  // Skip these tests if second player credentials are not configured
  test.skip(
    () => !process.env.E2E_AUTH0_EMAIL_2 || !process.env.E2E_AUTH0_PASSWORD_2,
    'Requires E2E_AUTH0_EMAIL_2 and E2E_AUTH0_PASSWORD_2 in .env'
  );

  /** Helper: log in a player via Auth0 Universal Login */
  async function loginPlayer(page, email, password, username) {
    await page.goto('/');
    await expect(page.locator('#loginModal')).toBeVisible();
    await expect(page.locator('#auth0LoginBtn')).toBeEnabled({ timeout: 15_000 });

    await page.locator('#auth0LoginBtn').click();
    await page.waitForURL(/auth0\.com|\.auth0\.com/, { timeout: 15_000 });

    // Fill Auth0 login form
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

    // Wait for redirect back to the app
    await page.waitForURL('http://localhost:3000/**', { timeout: 30_000 });

    // Handle username modal if it appears
    const usernameModal = page.locator('#usernameModal');
    const roomModal = page.locator('#roomModal');
    await expect(usernameModal.or(roomModal)).toBeVisible({ timeout: 20_000 });

    if (await usernameModal.isVisible()) {
      await page.locator('#displayUsername').fill(username || 'TestPlayer');
      await page.locator('#usernameForm button[type="submit"]').click();
      await expect(roomModal).toBeVisible({ timeout: 15_000 });
    }
  }

  test('two players can play a full game', async ({ browser }) => {
    // Create two independent browser contexts (no shared cookies/storage)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const player1 = await context1.newPage();
    const player2 = await context2.newPage();

    try {
      // Log in both players
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

      // Player 1: Create a room
      await player1.locator('#createRoomBtn').click();
      await expect(player1.locator('#gameContainer')).toBeVisible({ timeout: 10_000 });

      // Get the room code
      const roomCodeEl = player1.locator('#roomCodeDisplay');
      await expect(roomCodeEl).toBeVisible();
      const roomCode = await roomCodeEl.textContent();
      expect(roomCode).toBeTruthy();
      expect(roomCode.length).toBe(6);

      // Player 2: Join the room with the code
      await player2.locator('#roomCodeInput').fill(roomCode);
      await player2.locator('#joinRoomForm button[type="submit"]').click();
      await expect(player2.locator('#gameContainer')).toBeVisible({ timeout: 10_000 });

      // Both players should see each other's names (not "Waiting...")
      await expect(player1.locator('#player2Name')).not.toHaveText('Waiting...', {
        timeout: 10_000,
      });
      await expect(player2.locator('#player1Name')).not.toHaveText('Waiting...', {
        timeout: 10_000,
      });

      // Play a game: X wins with top row (cells 0, 1, 2)
      // Player 1 is X (created the room), Player 2 is O

      // Move 1: X plays cell 0
      await player1.locator('.cell[data-index="0"]').click();
      await expect(player2.locator('.cell[data-index="0"]')).not.toHaveText('', {
        timeout: 5_000,
      });

      // Move 2: O plays cell 3
      await player2.locator('.cell[data-index="3"]').click();
      await expect(player1.locator('.cell[data-index="3"]')).not.toHaveText('', {
        timeout: 5_000,
      });

      // Move 3: X plays cell 1
      await player1.locator('.cell[data-index="1"]').click();
      await expect(player2.locator('.cell[data-index="1"]')).not.toHaveText('', {
        timeout: 5_000,
      });

      // Move 4: O plays cell 4
      await player2.locator('.cell[data-index="4"]').click();
      await expect(player1.locator('.cell[data-index="4"]')).not.toHaveText('', {
        timeout: 5_000,
      });

      // Move 5: X plays cell 2 - this should win (top row: 0, 1, 2)
      await player1.locator('.cell[data-index="2"]').click();

      // Game should be over - check that game status indicates a winner
      // or that the score updated for Player X
      await expect(player1.locator('#scoreX')).toHaveText('1', { timeout: 10_000 });
      await expect(player2.locator('#scoreX')).toHaveText('1', { timeout: 10_000 });
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('moves sync in real time between players', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const player1 = await context1.newPage();
    const player2 = await context2.newPage();

    try {
      // Log in both players
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

      // Player 1 creates room, Player 2 joins
      await player1.locator('#createRoomBtn').click();
      await expect(player1.locator('#gameContainer')).toBeVisible({ timeout: 10_000 });
      const roomCode = await player1.locator('#roomCodeDisplay').textContent();

      await player2.locator('#roomCodeInput').fill(roomCode);
      await player2.locator('#joinRoomForm button[type="submit"]').click();
      await expect(player2.locator('#gameContainer')).toBeVisible({ timeout: 10_000 });

      // Wait for both players to see each other
      await expect(player1.locator('#player2Name')).not.toHaveText('Waiting...', {
        timeout: 10_000,
      });

      // Player 1 places a piece in the center
      await player1.locator('.cell[data-index="4"]').click();

      // Player 2 should see the piece appear in real time
      const cell4p2 = player2.locator('.cell[data-index="4"]');
      await expect(cell4p2).not.toHaveText('', { timeout: 5_000 });

      // Player 2 places a piece
      await player2.locator('.cell[data-index="0"]').click();

      // Player 1 should see it
      const cell0p1 = player1.locator('.cell[data-index="0"]');
      await expect(cell0p1).not.toHaveText('', { timeout: 5_000 });
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});
