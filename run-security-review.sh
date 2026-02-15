#!/bin/bash

# Security Review Agent Launcher
# Launches a Claude Code agent to perform intelligent security review

set -e

echo "🔒 Launching Security Review Agent..."
echo "====================================="
echo ""

# Check if we're on a feature branch
current_branch=$(git branch --show-current)

if [ "$current_branch" = "main" ]; then
    echo "❌ ERROR: You are on main branch!"
    echo "Switch to your feature branch first."
    exit 1
fi

echo "📋 Branch: $current_branch"
echo "🤖 Starting AI-powered security review..."
echo ""
echo "The agent will:"
echo "  • Analyze all code changes"
echo "  • Check for security vulnerabilities"
echo "  • Validate syntax and dependencies"
echo "  • Provide a detailed security report"
echo ""
echo "⏳ This may take a minute..."
echo ""

# Note: This would ideally launch a Claude Code agent
# For now, display instructions for manual agent invocation

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 MANUAL AGENT INVOCATION REQUIRED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Please run the following command in Claude Code:"
echo ""
echo "  Review the code changes in this branch for security"
echo "  vulnerabilities. Use the instructions in"
echo "  security-review-prompt.md as your guide."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "After the agent completes the review:"
echo "  • If PASS ✅: Run ./merge-to-main.sh"
echo "  • If FAIL ❌: Fix the issues and re-run this review"
echo ""
