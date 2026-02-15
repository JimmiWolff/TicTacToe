# How to Safely Merge to Main

This guide explains the required workflow for merging code to the main branch.

## Quick Reference

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes and test locally
npm start
node --check server.js

# 3. Commit to feature branch
git add .
git commit -m "Description of changes"

# 4. Push to GitHub
git push -u origin feature/my-feature

# 5. Test on Railway (select your branch in Railway dashboard)

# 6. Request security review from Claude
# (see below for exact prompts)

# 7. Request QA review from Claude

# 8. If BOTH PASS, merge to main
git checkout main
git pull origin main
git merge feature/my-feature --no-ff
git push origin main
```

## Step 6 & 7: Security and QA Reviews (REQUIRED)

Before merging to main, you **MUST** get BOTH reviews from Claude.

### Step 6: Security Review

In your Claude Code conversation, type:

```
Please perform a security review of this branch before I merge to main.
Follow the instructions in security-review-prompt.md.
```

### Step 7: QA Review

After security review passes, request QA review:

```
Please perform a QA review of this branch before I merge to main.
Follow the instructions in qa-review-prompt.md.
```

### What Claude Will Do

Claude will automatically:
1. ✓ Check all modified files with `git diff main...HEAD`
2. ✓ Read and analyze each changed file
3. ✓ Run `node --check` on JavaScript files
4. ✓ Scan for hardcoded secrets and vulnerabilities
5. ✓ Run `npm audit` for dependency issues
6. ✓ Check authentication and authorization
7. ✓ Provide detailed security report with PASS/FAIL

### Example Security Review

**Request:**
```
Please perform a security review of this branch before I merge to main.
Follow the instructions in security-review-prompt.md.
```

**Claude's Response:**
```markdown
## 🔒 Security Review Report

**Branch:** feature/account-deletion
**Files Reviewed:** 4
**Date:** 2026-02-14

---

### ❌ Critical Issues
None found ✅

---

### ⚠️ Warnings
1. server.js:40 - CORS allows all origins (acceptable for public API)

---

### 📊 Summary

**Syntax Check:** PASS ✓
**Secret Scan:** PASS ✓
**Dependencies:** PASS ✓ (0 vulnerabilities)
**Authentication:** PASS ✓
**Authorization:** PASS ✓

---

### 🎯 Final Recommendation

**RESULT:** ✅ PASS - Safe to merge

**Reasoning:**
All security checks passed. No critical issues found. One warning
about CORS but this is acceptable for a public API.

**Action Required:**
None - proceed with merge to main.
```

### Interpreting Security Review Results

**✅ PASS**: Safe from security perspective
- No critical security issues
- Warnings are acceptable
- Proceed to QA review

**❌ FAIL**: Do NOT merge
- Critical security issues found
- Must fix before merging
- Request new review after fixes

**⚠️ Warnings**: Review and decide
- Non-critical issues found
- May be acceptable depending on context
- Use judgment, then proceed to QA review

### Interpreting QA Review Results

**✅ PASS**: Adequate test coverage
- Critical features tested
- Test quality is good
- Proceed with merge

**⚠️ PASS WITH WARNINGS**: Some test gaps
- Most features tested
- Some non-critical gaps
- Review gaps and decide if acceptable

**❌ FAIL**: Critical tests missing
- New features untested
- Bug fix lacks regression test
- Must add tests before merging

## What If Claude Finds Issues?

### Example: Hardcoded Secret Found

**Claude's Report:**
```markdown
### ❌ Critical Issues
1. server.js:15 - Hardcoded API key detected:
   const API_KEY = "sk_live_1234567890abcdef";

### 🎯 Final Recommendation
**RESULT:** ❌ FAIL - Do NOT merge
```

**How to Fix:**
1. Move secret to `.env`:
   ```
   API_KEY=sk_live_1234567890abcdef
   ```

2. Update code:
   ```javascript
   const API_KEY = process.env.API_KEY;
   ```

3. Verify `.env` is in `.gitignore`

4. Commit fix:
   ```bash
   git add server.js
   git commit -m "Fix: Move API key to environment variable"
   git push
   ```

5. Request new security review from Claude

### Example: QA Review - Missing Tests

**Claude's Report:**
```markdown
### ❌ Missing Tests (Critical)
1. New account deletion feature (server.js:200-230) has no tests
   - No test for successful deletion
   - No test for authentication check
   - No regression test

### 🎯 Final Recommendation
**RESULT:** ❌ FAIL - Critical tests missing
```

**How to Fix:**
1. Create test file:
   ```bash
   mkdir -p tests
   touch tests/account-deletion.test.js
   ```

2. Add tests (see TEST-GUIDELINES.md):
   ```javascript
   describe('Account Deletion', () => {
     test('deletes user account with valid token', async () => {
       // test implementation
     });

     test('returns 401 for invalid token', async () => {
       // test implementation
     });
   });
   ```

3. Run tests:
   ```bash
   npm test
   ```

4. Commit tests:
   ```bash
   git add tests/
   git commit -m "Add tests for account deletion feature"
   git push
   ```

5. Request new QA review from Claude

### Example: Syntax Error Found

**Claude's Report:**
```markdown
### ❌ Critical Issues
1. server.js:589 - Syntax error: Missing catch or finally after try

### 🎯 Final Recommendation
**RESULT:** ❌ FAIL - Do NOT merge
```

**How to Fix:**
1. Check the syntax error:
   ```bash
   node --check server.js
   ```

2. Fix the error in your code

3. Test locally:
   ```bash
   npm start
   ```

4. Commit fix:
   ```bash
   git add server.js
   git commit -m "Fix: Correct try-catch syntax error"
   git push
   ```

5. Request new security review from Claude

## Why This Process?

### Protection Layers

1. **Local Testing**: Catch obvious bugs
2. **Feature Branch**: Isolate changes
3. **Railway Testing**: Verify in production-like environment
4. **Security Review**: AI-powered vulnerability detection
5. **QA Review**: AI-powered test coverage verification
6. **Main Branch**: Only stable, secure, tested code

### What We Prevent

- ❌ Syntax errors breaking production
- ❌ Hardcoded secrets being committed
- ❌ Security vulnerabilities reaching users
- ❌ Vulnerable dependencies in production
- ❌ Authentication bypasses
- ❌ Database injection attacks
- ❌ Untested features causing bugs
- ❌ Regression bugs from changes
- ❌ Code quality degradation

### Cost of Skipping

If you skip the security review and merge directly to main:
- **Production breaks immediately** (syntax errors)
- **Secrets exposed** (hardcoded credentials)
- **Users at risk** (security vulnerabilities)
- **Emergency rollback needed**
- **User trust damaged**

**The security review takes 2-3 minutes. An emergency fix takes hours.**

## Common Questions

### Q: Can I skip the review for small changes?

**A:** No. Even small changes can introduce syntax errors or vulnerabilities.
- One-line change can break production
- Small refactor can expose secrets
- "Quick fix" can introduce injection risk

### Q: What if I'm in a hurry?

**A:** The review takes 2-3 minutes. A production incident takes hours.
- Security review: 2-3 minutes
- Emergency rollback: 30-60 minutes
- User trust damage: weeks/months

### Q: Can I merge if Claude gives warnings?

**A:** Yes, if the warnings are acceptable in context.
- Review each warning
- Understand the risk
- Make informed decision
- Document why it's acceptable

Example acceptable warnings:
- CORS allowing all origins (for public API)
- Moderate npm vulnerabilities with no known exploits
- process.env references (they're supposed to be there)

### Q: What if Claude makes a mistake?

**A:** Claude is very accurate, but:
- Review the specific issue Claude identified
- Verify it's actually a problem
- If it's a false positive, document why and merge
- If uncertain, ask Claude to clarify

### Q: How do I test after merging?

1. **Monitor Railway deployment**
   - Check deployment logs
   - Verify no errors

2. **Test production**
   - Visit play.tictactoe.dk
   - Test the changed functionality
   - Verify no regressions

3. **Test iOS app**
   - Connect to production backend
   - Verify features work
   - Check for errors

## Emergency Rollback

If something breaks after merge:

```bash
# Revert the merge commit
git revert -m 1 HEAD

# Push immediately
git push origin main

# Railway will deploy the rollback
```

Then:
1. Fix the issue in a new feature branch
2. Test thoroughly
3. Request security review
4. Merge when safe

## Summary

✅ **Always follow the workflow**
✅ **Always request security review from Claude**
✅ **Always request QA review from Claude**
✅ **Only merge when BOTH reviews PASS**
✅ **Fix issues if ❌ FAIL**
✅ **Test on Railway before merging**
✅ **Add tests for new features**

🚨 **Never commit directly to main**
🚨 **Never skip security review**
🚨 **Never skip QA review**
🚨 **Never merge on ❌ FAIL**
🚨 **Never add features without tests**

The security and QA reviews are your safety net. Use them every time.
