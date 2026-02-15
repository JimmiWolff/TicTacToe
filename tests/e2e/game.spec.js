const { test, expect } = require('@playwright/test');

test.describe('Game Board', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#roomModal')).toBeVisible({ timeout: 20_000 });

    // Create a room to get to the game board
    await page.locator('#createRoomBtn').click();
    await expect(page.locator('#gameContainer')).toBeVisible({ timeout: 10_000 });
  });

  test('game board displays 9 empty cells', async ({ page }) => {
    const cells = page.locator('#gameBoard .cell');
    await expect(cells).toHaveCount(9);

    // All cells should be empty initially
    for (let i = 0; i < 9; i++) {
      await expect(cells.nth(i)).toHaveText('');
    }
  });

  test('score display shows 0-0-0 initially', async ({ page }) => {
    await expect(page.locator('#scoreX')).toHaveText('0');
    await expect(page.locator('#scoreO')).toHaveText('0');
    await expect(page.locator('#scoreDraw')).toHaveText('0');
  });

  test('clicking a cell places a piece when it is your turn', async ({ page }) => {
    // As the only player in a created room, clicking should place X
    // (the creating player is typically X)
    const cell = page.locator('.cell[data-index="4"]');
    await cell.click();

    // The cell should now contain a piece (X or O)
    // Wait briefly for Socket.IO round-trip
    await expect(cell).not.toHaveText('', { timeout: 5_000 });
  });

  test('game status area exists', async ({ page }) => {
    const status = page.locator('#gameStatus');
    await expect(status).toBeVisible();
  });

  test('room info shows the room code', async ({ page }) => {
    const roomInfo = page.locator('#roomInfo');
    await expect(roomInfo).toBeVisible();

    const roomCode = page.locator('#roomCodeDisplay');
    const codeText = await roomCode.textContent();
    expect(codeText).toBeTruthy();
  });

  test('header buttons are visible', async ({ page }) => {
    await expect(page.locator('#highscoresBtn')).toBeVisible();
    await expect(page.locator('#settingsBtn')).toBeVisible();
    await expect(page.locator('#leaveGameBtn')).toBeVisible();
    await expect(page.locator('#logoutBtn')).toBeVisible();
  });

  test('New Game button exists', async ({ page }) => {
    await expect(page.locator('#resetBtn')).toBeVisible();
  });

  test('Reset Score button exists', async ({ page }) => {
    await expect(page.locator('#resetScoreBtn')).toBeVisible();
  });
});
