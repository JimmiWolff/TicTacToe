const { test, expect } = require('@playwright/test');

test.describe('Room Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#roomModal')).toBeVisible({ timeout: 20_000 });
  });

  test('Create Room shows game board with room code', async ({ page }) => {
    await page.locator('#createRoomBtn').click();

    // Game container should become visible
    await expect(page.locator('#gameContainer')).toBeVisible({ timeout: 10_000 });

    // Room code should be displayed
    const roomCode = page.locator('#roomCodeDisplay');
    await expect(roomCode).toBeVisible();
    const codeText = await roomCode.textContent();
    expect(codeText).toBeTruthy();
    expect(codeText.length).toBe(6);
  });

  test('Player name appears in player 1 slot after creating room', async ({ page }) => {
    await page.locator('#createRoomBtn').click();
    await expect(page.locator('#gameContainer')).toBeVisible({ timeout: 10_000 });

    // Player 1 name should not be "Waiting..."
    const player1Name = page.locator('#player1Name');
    await expect(player1Name).not.toHaveText('Waiting...');
  });

  test('Player 2 shows waiting when alone in room', async ({ page }) => {
    await page.locator('#createRoomBtn').click();
    await expect(page.locator('#gameContainer')).toBeVisible({ timeout: 10_000 });

    // Player 2 should still be waiting
    await expect(page.locator('#player2Name')).toHaveText('Waiting...');
  });

  test('Quick Play joins a public room', async ({ page }) => {
    await page.locator('#quickPlayBtn').click();

    // Game container should become visible
    await expect(page.locator('#gameContainer')).toBeVisible({ timeout: 10_000 });
  });

  test('Join Room with invalid code shows error', async ({ page }) => {
    await page.locator('#roomCodeInput').fill('ZZZZZZ');
    await page.locator('#joinRoomForm button[type="submit"]').click();

    // Should show an error message in the room status area
    const roomStatus = page.locator('#roomStatus');
    await expect(roomStatus).not.toBeEmpty({ timeout: 5_000 });
  });

  test('Leave Game returns to room selection', async ({ page }) => {
    await page.locator('#createRoomBtn').click();
    await expect(page.locator('#gameContainer')).toBeVisible({ timeout: 10_000 });

    // Click Leave Game
    await page.locator('#leaveGameBtn').click();

    // Should return to room modal
    await expect(page.locator('#roomModal')).toBeVisible({ timeout: 10_000 });
  });
});
