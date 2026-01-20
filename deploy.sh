#!/bin/bash

# Bridge Clearance Calculator - GitHub Deployment Script
# This script will push your project to GitHub in one go

echo "🚀 Bridge Clearance Calculator - GitHub Deployment"
echo "=================================================="
echo ""

# Step 1: Get your GitHub username
read -p "Enter your GitHub username: " GITHUB_USERNAME

# Step 2: Get repository name (or use default)
read -p "Enter repository name [bridge-clearance-calculator]: " REPO_NAME
REPO_NAME=${REPO_NAME:-bridge-clearance-calculator}

echo ""
echo "📦 Repository will be created at:"
echo "   https://github.com/$GITHUB_USERNAME/$REPO_NAME"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

# Step 3: Create GitHub repository via web interface
echo ""
echo "🌐 Step 1: Create GitHub Repository"
echo "   Opening GitHub in your browser..."
echo "   Please create a repository named: $REPO_NAME"
echo "   - Make it PUBLIC"
echo "   - DON'T initialize with README"
echo ""
read -p "Press Enter after you've created the repository on GitHub..."

# Step 4: Set up git remote and push
echo ""
echo "📤 Step 2: Pushing to GitHub..."

cd "$(dirname "$0")"

git remote add origin "https://github.com/$GITHUB_USERNAME/$REPO_NAME.git" 2>/dev/null || git remote set-url origin "https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"

echo "   Pushing to main branch..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SUCCESS! Your code is now on GitHub!"
    echo ""
    echo "🌐 View your repository:"
    echo "   https://github.com/$GITHUB_USERNAME/$REPO_NAME"
    echo ""
    echo "🚀 Enable GitHub Pages:"
    echo "   1. Go to: https://github.com/$GITHUB_USERNAME/$REPO_NAME/settings/pages"
    echo "   2. Under 'Source', select: main branch"
    echo "   3. Click 'Save'"
    echo "   4. Wait 2 minutes, then visit:"
    echo "      https://$GITHUB_USERNAME.github.io/$REPO_NAME"
    echo ""
else
    echo ""
    echo "❌ Push failed. This might be because:"
    echo "   1. Repository doesn't exist yet - create it at github.com/new"
    echo "   2. You need to log in - git will prompt for credentials"
    echo "   3. Repository name is wrong - check spelling"
    echo ""
fi
