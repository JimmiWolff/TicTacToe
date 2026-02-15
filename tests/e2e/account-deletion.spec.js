const { test, expect } = require('@playwright/test');

// Account deletion E2E tests.
// Deletion is triggered via the REST API (DELETE /api/user/account) since
// the delete-account UI only exists in the iOS app.  Playwright grabs the
// Auth0 access token from the browser and calls the API directly.

test.describe('Account Deletion', () => {
  // All tests need two players
  test.skip(
    () => !process.env.E2E_AUTH0_EMAIL_2 || !process.env.E2E_AUTH0_PASSWORD_2,
    'Requires E2E_AUTH0_EMAIL_2 and E2E_AUTH0_PASSWORD_2 in .env'
  );

  /** Log in a player via Auth0 Universal Login and return the page at room modal. */
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

  /**
   * Get the Auth0 access token from the browser by calling the Auth0 SDK.
   * The token is needed to call DELETE /api/user/account.
   */
  async function getAccessToken(page) {
    return page.evaluate(async () => {
      if (window.game && window.game.auth0) {
        return window.game.auth0.getTokenSilently();
      }
      throw new Error('Auth0 client not available on window.game');
    });
  }

  /** Delete the account of the player logged in on `page`. */
  async function deleteAccount(page) {
    const token = await getAccessToken(page);
    const response = await page.request.delete('http://localhost:3000/api/user/account', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.success).toBe(true);
    return body;
  }

  /** Set up a two-player game and return { player1, player2, context1, context2, roomCode }. */
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

    // Player 1 creates a room
    await player1.locator('#createRoomBtn').click();
    await expect(player1.locator('#gameContainer')).toBeVisible({ timeout: 10_000 });
    const roomCode = await player1.locator('#roomCodeDisplay').textContent();

    // Player 2 joins the room
    await player2.locator('#roomCodeInput').fill(roomCode);
    await player2.locator('#joinRoomForm button[type="submit"]').click();
    await expect(player2.locator('#gameContainer')).toBeVisible({ timeout: 10_000 });

    // Both see each other
    await expect(player1.locator('#player2Name')).not.toHaveText('Waiting...', { timeout: 10_000 });
    await expect(player2.locator('#player1Name')).not.toHaveText('Waiting...', { timeout: 10_000 });

    return { player1, player2, context1, context2, roomCode };
  }

  // ------------------------------------------------------------------
  // Test 1: Delete account mid-game — opponent gets notified
  // ------------------------------------------------------------------
  test('opponent is notified when a player deletes their account mid-game', async ({ browser }) => {
    const { player1, player2, context1, context2 } = await setupTwoPlayerGame(browser);

    try {
      // Make a couple of moves so the game is in progress
      await player1.locator('.cell[data-index="4"]').click();
      await expect(player2.locator('.cell[data-index="4"]')).not.toHaveText('', { timeout: 5_000 });

      await player2.locator('.cell[data-index="0"]').click();
      await expect(player1.locator('.cell[data-index="0"]')).not.toHaveText('', { timeout: 5_000 });

      // Player 2 deletes their account via API
      await deleteAccount(player2);

      // Player 1 (the remaining player) should be redirected back to room
      // selection because the server emits 'gameDeleted' to the room.
      await expect(player1.locator('#roomModal')).toBeVisible({ timeout: 15_000 });
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  // ------------------------------------------------------------------
  // Test 2: Deleted user is disconnected from Socket.IO
  // ------------------------------------------------------------------
  test('deleted user is disconnected from the server', async ({ browser }) => {
    const { player1, player2, context1, context2 } = await setupTwoPlayerGame(browser);

    try {
      // Player 2 deletes their account
      await deleteAccount(player2);

      // Player 2's socket should be disconnected — the game container should
      // disappear and the login modal should eventually show (no valid session).
      // Since the page may show a disconnect error or return to login:
      const loginModal = player2.locator('#loginModal');
      const roomModal = player2.locator('#roomModal');

      // Either login modal reappears (session invalidated) or room modal
      // (socket reconnects but user is gone)
      await expect(loginModal.or(roomModal)).toBeVisible({ timeout: 15_000 });
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  // ------------------------------------------------------------------
  // Test 3: Re-register with the same email after account deletion
  // ------------------------------------------------------------------
  test('user can re-register with same email after deletion and play again', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Login
      await loginPlayer(
        page,
        process.env.E2E_AUTH0_EMAIL_2,
        process.env.E2E_AUTH0_PASSWORD_2,
        process.env.E2E_AUTH0_USERNAME_2 || 'TestPlayer2'
      );

      // Delete own account via API
      await deleteAccount(page);

      // Now login again with the same credentials — the Auth0 account still
      // exists (we only delete app data, not the Auth0 identity).
      // Close context and create a fresh one to clear all state.
      await context.close();

      const freshContext = await browser.newContext();
      const freshPage = await freshContext.newPage();

      await loginPlayer(
        freshPage,
        process.env.E2E_AUTH0_EMAIL_2,
        process.env.E2E_AUTH0_PASSWORD_2,
        process.env.E2E_AUTH0_USERNAME_2 || 'TestPlayer2'
      );

      // Should reach the room modal — account is effectively re-created
      await expect(freshPage.locator('#roomModal')).toBeVisible({ timeout: 20_000 });

      // Verify the user can actually join a game
      await freshPage.locator('#createRoomBtn').click();
      await expect(freshPage.locator('#gameContainer')).toBeVisible({ timeout: 10_000 });

      await freshContext.close();
    } catch (e) {
      await context.close().catch(() => {});
      throw e;
    }
  });

  // ------------------------------------------------------------------
  // Test 4: Re-registered user can play against another player
  // ------------------------------------------------------------------
  test('re-registered user can play a full game with another player', async ({ browser }) => {
    // First, ensure Player 2's account is deleted (if it exists)
    const setupCtx = await browser.newContext();
    const setupPage = await setupCtx.newPage();

    await loginPlayer(
      setupPage,
      process.env.E2E_AUTH0_EMAIL_2,
      process.env.E2E_AUTH0_PASSWORD_2,
      process.env.E2E_AUTH0_USERNAME_2 || 'TestPlayer2'
    );
    // Delete account (ignore errors if already deleted)
    try { await deleteAccount(setupPage); } catch { /* already deleted */ }
    await setupCtx.close();

    // Now re-login as Player 2 (re-creates app data) and play against Player 1
    const { player1, player2, context1, context2 } = await setupTwoPlayerGame(browser);

    try {
      // Play a few moves
      await player1.locator('.cell[data-index="0"]').click();
      await expect(player2.locator('.cell[data-index="0"]')).not.toHaveText('', { timeout: 5_000 });

      await player2.locator('.cell[data-index="3"]').click();
      await expect(player1.locator('.cell[data-index="3"]')).not.toHaveText('', { timeout: 5_000 });

      await player1.locator('.cell[data-index="1"]').click();
      await expect(player2.locator('.cell[data-index="1"]')).not.toHaveText('', { timeout: 5_000 });

      await player2.locator('.cell[data-index="4"]').click();
      await expect(player1.locator('.cell[data-index="4"]')).not.toHaveText('', { timeout: 5_000 });

      await player1.locator('.cell[data-index="2"]').click();

      // X wins — score should update for both
      await expect(player1.locator('#scoreX')).toHaveText('1', { timeout: 10_000 });
      await expect(player2.locator('#scoreX')).toHaveText('1', { timeout: 10_000 });
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  // ------------------------------------------------------------------
  // Test 5: Deleting account removes user from leaderboard
  // ------------------------------------------------------------------
  test('deleted user no longer appears in leaderboard', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await loginPlayer(
        page,
        process.env.E2E_AUTH0_EMAIL_2,
        process.env.E2E_AUTH0_PASSWORD_2,
        process.env.E2E_AUTH0_USERNAME_2 || 'TestPlayer2'
      );

      // Play a quick game to ensure there's a highscore entry
      await page.locator('#quickPlayBtn').click();
      await expect(page.locator('#gameContainer')).toBeVisible({ timeout: 10_000 });

      // Remember the username for checking the leaderboard later
      const username = process.env.E2E_AUTH0_USERNAME_2 || 'TestPlayer2';

      // Go back to room selection to open leaderboard
      await page.locator('#leaveGameBtn').click();
      await expect(page.locator('#roomModal')).toBeVisible({ timeout: 10_000 });

      // Join a room again so we can access the highscores button
      await page.locator('#createRoomBtn').click();
      await expect(page.locator('#gameContainer')).toBeVisible({ timeout: 10_000 });

      // Delete account
      await deleteAccount(page);

      // Open a fresh session to check leaderboard
      await context.close();

      const checkCtx = await browser.newContext();
      const checkPage = await checkCtx.newPage();

      await loginPlayer(
        checkPage,
        process.env.E2E_AUTH0_EMAIL,
        process.env.E2E_AUTH0_PASSWORD,
        process.env.E2E_AUTH0_USERNAME || 'TestPlayer1'
      );

      await checkPage.locator('#createRoomBtn').click();
      await expect(checkPage.locator('#gameContainer')).toBeVisible({ timeout: 10_000 });

      // Open the leaderboard
      await checkPage.locator('#highscoresBtn').click();
      await expect(checkPage.locator('#highscoresModal')).toBeVisible({ timeout: 10_000 });

      // Wait for leaderboard to load
      await expect(checkPage.locator('#topPlayersList')).toBeVisible({ timeout: 10_000 });

      // The deleted user's name should NOT appear in the leaderboard
      const leaderboardText = await checkPage.locator('#topPlayersList').textContent();
      expect(leaderboardText).not.toContain(username);

      await checkCtx.close();
    } catch (e) {
      await context.close().catch(() => {});
      throw e;
    }
  });

  // ------------------------------------------------------------------
  // Test 6: Opponent's game board is cleaned up after account deletion
  // ------------------------------------------------------------------
  test('opponent game board resets properly after player deletes account', async ({ browser }) => {
    const { player1, player2, context1, context2 } = await setupTwoPlayerGame(browser);

    try {
      // Play several moves
      await player1.locator('.cell[data-index="0"]').click();
      await expect(player2.locator('.cell[data-index="0"]')).not.toHaveText('', { timeout: 5_000 });

      await player2.locator('.cell[data-index="4"]').click();
      await expect(player1.locator('.cell[data-index="4"]')).not.toHaveText('', { timeout: 5_000 });

      await player1.locator('.cell[data-index="8"]').click();
      await expect(player2.locator('.cell[data-index="8"]')).not.toHaveText('', { timeout: 5_000 });

      // Player 2 deletes account mid-game
      await deleteAccount(player2);

      // Player 1 should be sent back to room selection
      await expect(player1.locator('#roomModal')).toBeVisible({ timeout: 15_000 });

      // Player 1 creates a new room — the board should be fresh
      await player1.locator('#createRoomBtn').click();
      await expect(player1.locator('#gameContainer')).toBeVisible({ timeout: 10_000 });

      // All cells should be empty in the new game
      for (let i = 0; i < 9; i++) {
        await expect(player1.locator(`.cell[data-index="${i}"]`)).toHaveText('');
      }

      // Player 2 slot should show waiting
      await expect(player1.locator('#player2Name')).toHaveText('Waiting...');
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  // ------------------------------------------------------------------
  // Test 7: Deleting account with multiple active games cleans all
  // ------------------------------------------------------------------
  test('deleting account cleans up all active games', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const player1 = await context1.newPage();
    const player2 = await context2.newPage();

    try {
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

      // Player 2 creates a room and plays with Player 1
      await player2.locator('#createRoomBtn').click();
      await expect(player2.locator('#gameContainer')).toBeVisible({ timeout: 10_000 });
      const roomCode1 = await player2.locator('#roomCodeDisplay').textContent();

      await player1.locator('#roomCodeInput').fill(roomCode1);
      await player1.locator('#joinRoomForm button[type="submit"]').click();
      await expect(player1.locator('#gameContainer')).toBeVisible({ timeout: 10_000 });

      // Make a move so the game state is saved
      await expect(player2.locator('#player2Name')).not.toHaveText('Waiting...', { timeout: 10_000 });
      // The room creator might be player 1 (X) or the joiner might be — just
      // click from the creator's perspective
      await player2.locator('.cell[data-index="4"]').click();

      // Player 1 leaves the room to go back to room selection
      await player1.locator('#leaveGameBtn').click();
      await expect(player1.locator('#roomModal')).toBeVisible({ timeout: 10_000 });

      // Player 2 also leaves
      await player2.locator('#leaveGameBtn').click();
      await expect(player2.locator('#roomModal')).toBeVisible({ timeout: 10_000 });

      // Player 2 deletes their account — this should clean up the game
      await deleteAccount(player2);

      // Player 1 should be able to create a fresh room with no stale data
      await player1.locator('#createRoomBtn').click();
      await expect(player1.locator('#gameContainer')).toBeVisible({ timeout: 10_000 });

      // Verify the old room code is not reused
      const newRoomCode = await player1.locator('#roomCodeDisplay').textContent();
      expect(newRoomCode).not.toBe(roomCode1);
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  // ------------------------------------------------------------------
  // Test 8: Cannot delete account without valid auth token
  // ------------------------------------------------------------------
  test('account deletion fails without authorization', async ({ page }) => {
    await page.goto('/');

    // Try to delete without any auth header
    const response = await page.request.delete('http://localhost:3000/api/user/account');
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test('account deletion fails with invalid token', async ({ page }) => {
    await page.goto('/');

    const response = await page.request.delete('http://localhost:3000/api/user/account', {
      headers: { Authorization: 'Bearer invalid-token-abc123' },
    });
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.success).toBe(false);
  });
});
