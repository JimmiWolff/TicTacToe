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
# (see below for exact prompt)

# 7. If PASS, merge to main
git checkout main
git pull origin main
git merge feature/my-feature --no-ff
git push origin main
```

## Step 6: Security Review (REQUIRED)

Before merging to main, you **MUST** get a security review from Claude.

### How to Request Review

In your Claude Code conversation, type:

```
Please perform a security review of this branch before I merge to main.
Follow the instructions in security-review-prompt.md.
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

### Interpreting Results

**✅ PASS**: Safe to merge to main
- No critical issues found
- Warnings are acceptable
- Proceed with merge

**❌ FAIL**: Do NOT merge
- Critical security issues found
- Must fix before merging
- Request new review after fixes

**⚠️ Warnings**: Review and decide
- Non-critical issues found
- May be acceptable depending on context
- Use judgment on whether to merge

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
5. **Main Branch**: Only stable, secure code

### What We Prevent

- ❌ Syntax errors breaking production
- ❌ Hardcoded secrets being committed
- ❌ Security vulnerabilities reaching users
- ❌ Vulnerable dependencies in production
- ❌ Authentication bypasses
- ❌ Database injection attacks

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
✅ **Only merge on ✅ PASS**
✅ **Fix issues if ❌ FAIL**
✅ **Test on Railway before merging**

🚨 **Never commit directly to main**
🚨 **Never skip security review**
🚨 **Never merge on ❌ FAIL**

The security review is your safety net. Use it every time.
