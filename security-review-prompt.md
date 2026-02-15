# Security Review Task

You are conducting a **mandatory security review** before code can be merged to the main branch.

## Your Mission

Thoroughly analyze all code changes for security vulnerabilities and provide a comprehensive security report.

## What to Review

1. **Get the list of changed files:**
   ```bash
   git diff --name-only main...HEAD
   ```

2. **Read and analyze each changed file** focusing on:

### Critical Security Issues (FAIL conditions)
- ❌ Hardcoded secrets, passwords, API keys, tokens
- ❌ MongoDB connection strings with credentials in code
- ❌ Private keys or certificates in code
- ❌ Use of `eval()` or `Function()` constructor with user input
- ❌ SQL/NoSQL injection vulnerabilities
- ❌ Authentication bypass or missing authentication
- ❌ Authorization issues (users accessing others' data)
- ❌ JavaScript syntax errors (`node --check` fails)
- ❌ Critical or High severity npm vulnerabilities
- ❌ Committed `.env` file

### Warnings (Review but may pass)
- ⚠️ Overly permissive CORS settings
- ⚠️ Missing input validation
- ⚠️ Moderate npm vulnerabilities
- ⚠️ Weak error messages exposing system details
- ⚠️ Missing rate limiting on endpoints
- ⚠️ Unencrypted sensitive data transmission

## Security Checks to Perform

### 1. Syntax Validation
```bash
node --check server.js
node --check database.js
node --check highscore.js
node --check gameState.js
```

### 2. Secret Scanning
Search for patterns like:
- `password = "..."`
- `apiKey = "..."`
- `secret = "..."`
- `mongodb://username:password@...`
- Private keys (BEGIN PRIVATE KEY)

### 3. Dependency Audit
```bash
npm audit --json
```
Check for critical/high vulnerabilities.

### 4. Git Status Check
```bash
git status --porcelain .env
```
Ensure .env is not staged.

### 5. Code Analysis
For each modified file:
- Check authentication on API endpoints
- Verify user input is validated/sanitized
- Look for injection risks in database queries
- Check socket.io handlers authenticate users
- Verify CORS configuration is appropriate

## Example Vulnerabilities to Catch

### ❌ FAIL - Hardcoded Secret
```javascript
const API_KEY = "sk_live_1234567890abcdef";  // BAD!
```

### ✅ PASS - Environment Variable
```javascript
const API_KEY = process.env.API_KEY;  // GOOD!
```

### ❌ FAIL - SQL Injection
```javascript
const query = `SELECT * FROM users WHERE id = ${userId}`;  // BAD!
```

### ✅ PASS - Parameterized Query
```javascript
collection.findOne({ userId: userId });  // GOOD!
```

### ❌ FAIL - Missing Authentication
```javascript
app.delete('/api/user/account', async (req, res) => {
    // No token verification! Anyone can delete any account!
    await deleteUser(req.body.userId);
});
```

### ✅ PASS - Authenticated Endpoint
```javascript
app.delete('/api/user/account', async (req, res) => {
    const decoded = await verifyToken(req.headers.authorization);
    if (!decoded) return res.status(401).json({error: 'Unauthorized'});
    await deleteUser(decoded.sub);  // Can only delete own account
});
```

## Output Format

Provide your security review in this exact format:

```markdown
## 🔒 Security Review Report

**Branch:** [branch name]
**Files Reviewed:** [count]
**Date:** [current date]

---

### ❌ Critical Issues
[List each critical issue with file:line reference]
**OR**
None found ✅

---

### ⚠️ Warnings
[List each warning with file:line reference]
**OR**
None found ✅

---

### 📊 Summary

**Syntax Check:** [PASS/FAIL]
**Secret Scan:** [PASS/FAIL]
**Dependencies:** [PASS/FAIL with vulnerability count]
**Authentication:** [PASS/FAIL]
**Authorization:** [PASS/FAIL]

---

### 🎯 Final Recommendation

**RESULT:** [✅ PASS - Safe to merge | ❌ FAIL - Do NOT merge]

**Reasoning:**
[Brief explanation of why pass or fail]

**Action Required:**
[What needs to be done if FAIL, or "None - proceed with merge" if PASS]
```

## Important Notes

- **Be thorough but practical** - focus on real security risks
- **FAIL immediately** if you find critical issues
- **Explain each issue clearly** with file and line numbers
- **Provide actionable fix suggestions** for failures
- **Consider the context** - process.env.PORT || 3000 is fine, process.env.SECRET || "default" is NOT
- **Check authentication carefully** - APIs must verify tokens
- **Verify authorization** - users should only access their own data

## When to PASS with Warnings

You can pass with warnings if:
- Warnings are minor or non-exploitable
- CORS is intentionally permissive (public API)
- Moderate vulnerabilities have no known exploits
- .env references are in proper usage (process.env, not hardcoded)

## When to FAIL

You MUST fail if:
- Any hardcoded secrets found
- Syntax errors present
- Critical/High npm vulnerabilities
- Missing authentication on sensitive endpoints
- Injection vulnerabilities detected
- .env file is committed

---

**Remember:** You are the last line of defense before code reaches production. Be thorough!
