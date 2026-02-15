# QA Review Task

You are conducting a **mandatory QA review** to ensure proper testing and code quality before merging to main.

## Your Mission

Verify that the codebase has adequate test coverage for all critical features and that code changes include appropriate tests.

## QA Review Checklist

### 1. Test Coverage Analysis

**Check what tests currently exist:**
```bash
# Backend tests
ls -la test/ tests/ __tests__/ *.test.js *.spec.js 2>/dev/null || echo "No backend tests found"

# iOS tests
find TicTacToeMultiplayer -name "*Tests.swift" -o -name "*Test.swift" 2>/dev/null || echo "No iOS tests found"

# Run tests if they exist
npm test 2>/dev/null
```

**Analyze test coverage:**
- Are there unit tests for critical features?
- Are there integration tests for main workflows?
- Are edge cases tested?
- Are error scenarios tested?

### 2. Critical Features Requiring Tests

#### Backend (Node.js)

**Authentication & Authorization:**
- ✓ Token verification (Auth0 and Apple Sign In)
- ✓ Invalid token rejection
- ✓ Expired token handling
- ✓ User can only delete their own account
- ✓ Socket authentication required for game actions

**Account Management:**
- ✓ Account creation with Auth0
- ✓ Account creation with Apple Sign In
- ✓ Account deletion removes all user data
- ✓ Account deletion removes user from active games
- ✓ Account deletion doesn't affect other players' data
- ✓ Guest mode restrictions

**Game Logic:**
- ✓ Win detection (all 8 winning patterns)
- ✓ Draw detection
- ✓ Turn validation (players can't play out of turn)
- ✓ Move validation (can't place on occupied cell)
- ✓ Piece movement phase after 3 pieces placed
- ✓ Move validation in movement phase

**Database Operations:**
- ✓ Game state persistence
- ✓ Highscore updates
- ✓ User data CRUD operations
- ✓ Data deletion (account deletion)
- ✓ Connection error handling

**Socket.IO Events:**
- ✓ Room joining/leaving
- ✓ Player reconnection
- ✓ Move broadcasting
- ✓ Game state synchronization
- ✓ Opponent notifications

**API Endpoints:**
- ✓ `/auth/config` returns correct config
- ✓ `/api/user/account` DELETE requires authentication
- ✓ `/api/user/account` DELETE only deletes own account
- ✓ `/api/rooms/create` creates unique room codes
- ✓ Error handling for all endpoints

#### iOS App (Swift)

**Authentication:**
- ✓ Auth0 login flow
- ✓ Apple Sign In flow
- ✓ Guest mode functionality
- ✓ Token storage and retrieval
- ✓ Logout clears all auth data

**Game UI:**
- ✓ Board renders correctly
- ✓ Piece placement works
- ✓ Piece movement works (movement phase)
- ✓ Win detection displays correctly
- ✓ Turn indicator updates properly

**Socket Communication:**
- ✓ Connection to server
- ✓ Authentication with socket
- ✓ Receiving game state updates
- ✓ Sending moves
- ✓ Reconnection handling

**Account Deletion:**
- ✓ Confirmation dialogs appear
- ✓ Account deletion calls API
- ✓ User is logged out after deletion
- ✓ Game state is cleared
- ✓ Error handling

**Settings:**
- ✓ Username change
- ✓ Color picker for pieces
- ✓ Settings persistence

#### Web App (JavaScript)

**Similar to iOS:**
- Authentication flows
- Game board interactions
- Socket communication
- Account deletion
- Settings

### 3. Test Quality Standards

**Good Tests Should:**
- ✓ Test one specific behavior
- ✓ Have clear, descriptive names
- ✓ Be independent (no test depends on another)
- ✓ Be repeatable (same result every time)
- ✓ Test both success and failure cases
- ✓ Include edge cases

**Bad Tests:**
- ✗ Test multiple unrelated things
- ✗ Have vague names like "test1", "testStuff"
- ✗ Depend on execution order
- ✗ Are flaky (sometimes pass, sometimes fail)
- ✗ Only test happy path
- ✗ Mock everything (no real behavior tested)

### 4. Code Quality Checks

**For Changed Files:**
- Are functions documented?
- Are complex algorithms explained?
- Are error cases handled?
- Is input validated?
- Are there magic numbers (use constants)?
- Is code DRY (Don't Repeat Yourself)?
- Are variable names descriptive?

### 5. Testing Gaps Analysis

**Common Gaps to Check:**
- Missing tests for new features
- No tests for bug fixes
- Edge cases not tested
- Error handling not tested
- Integration points not tested
- Race conditions not considered

## Output Format

Provide your QA review in this exact format:

```markdown
## 🧪 QA Review Report

**Branch:** [branch name]
**Files Changed:** [count]
**Date:** [current date]

---

### 📊 Test Coverage Summary

**Backend Tests:**
- Total test files: [count]
- Critical features tested: [X/Y]
- Test pass rate: [percentage or N/A]

**iOS Tests:**
- Total test files: [count]
- Critical features tested: [X/Y]
- Test pass rate: [percentage or N/A]

**Web Tests:**
- Total test files: [count]
- Critical features tested: [X/Y]
- Test pass rate: [percentage or N/A]

---

### ✅ Tested Features

**Backend:**
[List features that have adequate tests]

**iOS:**
[List features that have adequate tests]

**Web:**
[List features that have adequate tests]

---

### ❌ Missing Tests (Critical)

[List critical features that lack tests - these MUST be added]

**OR**

None - all critical features are tested ✅

---

### ⚠️ Test Gaps (Recommended)

[List features that should have tests but are lower priority]

**OR**

None - test coverage is comprehensive ✅

---

### 📝 Code Quality Issues

[List code quality issues found in changed files]

**OR**

No major code quality issues ✅

---

### 💡 Recommendations

[Specific suggestions for improving tests and quality]

---

### 🎯 Final Recommendation

**RESULT:** [✅ PASS - Adequate testing | ⚠️ PASS WITH WARNINGS - Some gaps | ❌ FAIL - Critical tests missing]

**Reasoning:**
[Explain why pass or fail]

**Action Required:**
[What needs to be done]
```

## QA Standards

### Minimum Requirements for ✅ PASS

**For New Features:**
- Must have tests for main functionality
- Must test both success and error cases
- Must test edge cases
- Must have integration tests if touching multiple systems

**For Bug Fixes:**
- Must have regression test proving bug is fixed
- Test should fail without the fix
- Test should pass with the fix

**For Refactoring:**
- Existing tests must still pass
- Test coverage must not decrease
- If refactoring test code, ensure tests still verify behavior

### ⚠️ PASS WITH WARNINGS

You can pass with warnings if:
- Non-critical features lack tests
- Some edge cases not covered
- Test coverage is good but could be better
- Code quality is acceptable but could improve

### ❌ FAIL Conditions

You MUST fail if:
- Critical features completely untested
- New features added without any tests
- Security-sensitive code has no tests
- Tests are broken/failing
- Test coverage significantly decreased
- Bug fix has no regression test

## Examples

### Example: New Feature - Account Deletion

**Required Tests:**
```javascript
// Backend tests needed
describe('Account Deletion', () => {
  test('deletes user from highscores collection', async () => {
    // Test implementation
  });

  test('deletes all user games from database', async () => {
    // Test implementation
  });

  test('requires valid authentication token', async () => {
    // Test implementation
  });

  test('user can only delete their own account', async () => {
    // Test implementation
  });

  test('returns 401 for invalid token', async () => {
    // Test implementation
  });
});
```

```swift
// iOS tests needed
class AccountDeletionTests: XCTestCase {
    func testAccountDeletionRequiresConfirmation() {
        // Test implementation
    }

    func testAccountDeletionCallsAPI() {
        // Test implementation
    }

    func testUserIsLoggedOutAfterDeletion() {
        // Test implementation
    }

    func testGameStateIsClearedAfterDeletion() {
        // Test implementation
    }

    func testErrorHandlingForAPIFailure() {
        // Test implementation
    }
}
```

### Example: Bug Fix - Win Detection

**Required Regression Test:**
```javascript
describe('Win Detection Bug Fix', () => {
  test('detects win when player has 3 in a row', () => {
    const board = ['X', 'X', 'X', '', 'O', 'O', '', '', ''];
    const result = checkWin(board);
    expect(result.winner).toBe('X');
    expect(result.pattern).toEqual([0, 1, 2]);
  });

  test('does not false positive on incomplete row', () => {
    const board = ['X', 'X', '', '', 'O', 'O', '', '', ''];
    const result = checkWin(board);
    expect(result).toBeNull();
  });
});
```

## Test Priority Levels

### P0 - Critical (Must Test)
- Authentication and authorization
- Data deletion and persistence
- Payment processing (if applicable)
- Security-sensitive operations
- Win/loss detection in games

### P1 - High (Should Test)
- Main user workflows
- Database operations
- API endpoints
- Error handling
- Edge cases

### P2 - Medium (Nice to Test)
- UI interactions
- Settings and preferences
- Non-critical features
- Performance optimizations

### P3 - Low (Optional)
- Cosmetic changes
- Logging
- Analytics
- Minor UI tweaks

## When Tests Are Not Required

You can skip tests for:
- Documentation changes
- Configuration file updates
- Minor text/copy changes
- Development tooling (not affecting production)
- Experimental/spike work (must be marked clearly)

**But you should still indicate this in the review:**
"Tests not required - documentation only" or "Tests not required - config change only"

## Integration with Workflow

The QA review should be requested:
1. After security review passes ✅
2. Before final merge to main
3. For every feature branch (except documentation-only)

**Request QA Review:**
```
Please perform a QA review of this branch before I merge to main.
Follow the instructions in qa-review-prompt.md.
```

---

**Remember:** Quality tests prevent bugs from reaching production and give confidence that changes work correctly. Be thorough but reasonable!
