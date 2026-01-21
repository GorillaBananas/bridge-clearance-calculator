# How to Upload to GitHub

## Files Ready to Upload

Your project has been packaged into: `multi-bridge-clearance.zip` (30KB)

## What's Included:

✅ **index.html** - Main calculator app (v8.0 with multi-bridge support)
✅ **test-local.html** - Interactive testing page
✅ **TEST_GUIDE.md** - Comprehensive testing documentation
✅ **README.md** - Project documentation
✅ **CONTRIBUTING.md** - Contribution guidelines
✅ **LICENSE** - MIT License
✅ **deploy.sh** - Deployment script
✅ **validation_tests.py** - Python validation tests

---

## Option 1: Upload via GitHub Web Interface (Easiest)

### Step 1: Create Repository (if not already created)
1. Go to https://github.com/GorillaBananas
2. Click the **"+"** button (top right) → **"New repository"**
3. Repository name: `multi-bridge-clearance`
4. Description: "Multi-bridge tide clearance calculator with support for multiple Auckland bridges"
5. Choose: **Public** or **Private** (your choice)
6. **DO NOT** check any boxes (no README, .gitignore, or license)
7. Click **"Create repository"**

### Step 2: Upload Files
1. On the new empty repository page, click **"uploading an existing file"**
2. **Drag and drop** the `multi-bridge-clearance.zip` file
3. **OR** click "choose your files" and select the zip
4. Wait for upload to complete
5. In the commit message box, enter: `Initial commit - Multi-bridge clearance calculator v8.0`
6. Click **"Commit changes"**

### Step 3: Extract the Zip (GitHub will do this automatically)
GitHub will automatically extract the zip file contents into your repository.

---

## Option 2: Upload Individual Files

If you prefer to upload files one by one:

1. Create the repository (as above)
2. Click **"Add file"** → **"Upload files"**
3. **Select or drag all files** from the unzipped folder:
   - index.html
   - test-local.html
   - TEST_GUIDE.md
   - README.md
   - CONTRIBUTING.md
   - LICENSE
   - deploy.sh
   - validation_tests.py
4. Commit message: `Initial commit - Multi-bridge clearance calculator v8.0`
5. Click **"Commit changes"**

---

## Option 3: Use Git from Terminal (Advanced)

If you want to use the command line:

```bash
# Navigate to your project folder
cd /path/to/bridge-clearance-calculator

# Remove old remote (if exists)
git remote remove origin

# Add new repository as origin
git remote add origin https://github.com/GorillaBananas/multi-bridge-clearance.git

# Push your branch
git push -u origin claude/multi-location-bridge-support-oiUSN:main
```

You'll be prompted to enter your GitHub username and password (or personal access token).

---

## After Upload

### Enable GitHub Pages (to make it live)
1. Go to your repository on GitHub
2. Click **"Settings"** tab
3. Scroll to **"Pages"** (in left sidebar)
4. Under "Source", select: **"Deploy from a branch"**
5. Under "Branch", select: **"main"** and **"/ (root)"**
6. Click **"Save"**
7. Wait 1-2 minutes
8. Your site will be live at: `https://gorillabananas.github.io/multi-bridge-clearance/`

### Test Your Live Site
- Visit: `https://gorillabananas.github.io/multi-bridge-clearance/`
- Test the bridge selector
- Try OBC Bridge and Panmure Bridge
- Test on your iPhone for iOS features

---

## Files Location on Your Mac

The zip file is located at:
```
/Users/[YourName]/[path-to]/bridge-clearance-calculator/multi-bridge-clearance.zip
```

To find it:
1. Open **Finder**
2. Search for: `multi-bridge-clearance.zip`
3. Double-click to unzip (if needed)

---

## Need Help?

If you encounter any issues:
- GitHub upload limit: 100MB (your files are only 30KB, so no problem)
- File format: Make sure you're uploading the .zip or individual files
- Authentication: Use a Personal Access Token if password doesn't work

---

**Ready to go!** Just drag the zip file to GitHub and you're done! 🚀
