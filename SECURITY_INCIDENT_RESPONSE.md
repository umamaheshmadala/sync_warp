# 🚨 Security Incident Response - API Key Exposure

## Incident Details
- **Date:** 2025-01-13
- **Severity:** HIGH
- **Type:** Exposed Google Maps API Key
- **Location:** `docs/TARGETING_UI_REDESIGN_SUMMARY.md` line 184
- **Exposed Key:** `AIzaSyDsiouMs138Zz_I-crgCHophPUXSCtiZy0`
- **Project:** sync v2 (sync-version2)
- **Commit:** 8c41eb5

## Immediate Actions Taken

### 1. ✅ Removed Key from Current Code
- Replaced exposed key with placeholder `your_google_maps_api_key_here`
- File: `docs/TARGETING_UI_REDESIGN_SUMMARY.md`

### 2. 🔐 Next Steps Required (URGENT)

#### Step 1: Regenerate the API Key
1. Go to Google Cloud Console: https://console.cloud.google.com/
2. Select project: **sync v2** (sync-version2)
3. Navigate to: **APIs & Services > Credentials**
4. Find the compromised key: `AIzaSyDsiouMs138Zz_I-crgCHophPUXSCtiZy0`
5. Click **Delete** to revoke it
6. Click **Create Credentials > API Key**
7. Copy the new key

#### Step 2: Restrict the New API Key
**IMPORTANT:** Apply restrictions immediately:

1. Click **Edit** on the new API key
2. Under **API restrictions**, select **Restrict key**
3. Enable only: **Maps JavaScript API**, **Geocoding API**, **Places API**
4. Under **Application restrictions**:
   - Select **HTTP referrers (web sites)**
   - Add your domains:
     - `http://localhost:*`
     - `https://yourdomain.com/*`
     - `https://*.yourdomain.com/*`
5. Click **Save**

#### Step 3: Update Your Local Environment
1. Open `.env` file (NOT `.env.example`)
2. Update with new key:
   ```bash
   VITE_GOOGLE_MAPS_API_KEY=your_new_api_key_here
   ```
3. **Never commit `.env` file!**

#### Step 4: Clean Git History (CRITICAL)
The exposed key is in Git history. You need to remove it:

**Option A: Force Push (If no one else has cloned)**
```bash
# Create a new commit removing the key
git add docs/TARGETING_UI_REDESIGN_SUMMARY.md
git commit -m "security: Remove exposed Google Maps API key"

# Amend the previous commit to remove the key from history
git rebase -i HEAD~2
# Change 'pick' to 'edit' for the commit with the key
# Remove the key from the file
git add docs/TARGETING_UI_REDESIGN_SUMMARY.md
git rebase --continue

# Force push to overwrite history
git push --force origin main
```

**Option B: Use BFG Repo-Cleaner (Recommended)**
```bash
# Install BFG (if not installed)
# brew install bfg  # macOS
# choco install bfg-repo-cleaner  # Windows

# Clone a fresh copy
git clone --mirror https://github.com/umamaheshmadala/sync_warp.git

# Remove the exposed key from all history
bfg --replace-text passwords.txt sync_warp.git

# Where passwords.txt contains:
# AIzaSyDsiouMs138Zz_I-crgCHophPUXSCtiZy0

# Push the cleaned history
cd sync_warp.git
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force
```

**Option C: GitHub Secret Scanning (Automatic)**
GitHub may have already alerted you and disabled the key. Check:
- https://github.com/umamaheshmadala/sync_warp/security

### 3. Verify No Other Exposed Secrets
Checked all files - no other API keys or secrets found in code.

## Prevention Measures

### 1. ✅ Already Implemented
- `.env` is in `.gitignore` ✅
- `.env.example` has placeholders only ✅
- Code uses `import.meta.env.VITE_*` for all secrets ✅

### 2. Additional Measures to Implement

#### A. Pre-commit Hook
Create `.git/hooks/pre-commit`:
```bash
#!/bin/sh
# Check for exposed secrets

if git diff --cached --name-only | xargs grep -l "AIza\|sk-\|pk_\|AKIA"; then
    echo "⚠️  Possible API key detected in staged files!"
    echo "Please remove secrets before committing."
    exit 1
fi
```

#### B. GitHub Secret Scanning
Enable in repository settings:
1. Go to Settings > Security & analysis
2. Enable **Secret scanning**
3. Enable **Push protection**

#### C. Use Environment Variables Everywhere
**Never hardcode:**
- API keys
- Database passwords
- Service account credentials
- OAuth tokens

**Always use:**
```typescript
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
```

## Monitoring

### Check for Unauthorized Usage
1. Go to Google Cloud Console
2. Navigate to **APIs & Services > Dashboard**
3. Check **Quotas** and **Metrics** for unusual activity
4. Review **Cloud Billing** for unexpected charges

### Set Up Alerts
1. In Google Cloud Console, go to **Monitoring > Alerting**
2. Create alert for API usage spike
3. Set budget alerts in **Billing**

## Post-Incident Checklist

- [ ] Revoked exposed API key
- [ ] Generated new restricted API key
- [ ] Updated local `.env` with new key
- [ ] Cleaned Git history to remove old key
- [ ] Force pushed cleaned history
- [ ] Verified application still works
- [ ] Enabled GitHub secret scanning
- [ ] Set up pre-commit hooks
- [ ] Reviewed Google Cloud usage/billing
- [ ] Documented incident (this file)

## Lessons Learned

1. **Never put secrets in documentation files** - Even examples should use placeholders
2. **Always restrict API keys** - Don't rely on obscurity
3. **Use secret scanning tools** - Catch issues before they reach production
4. **Regular security audits** - Review code for hardcoded secrets

## Contact

If you have questions about this incident:
- Email: [your-email]
- Google Cloud Support: https://console.cloud.google.com/support

## References
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [Google API Key Best Practices](https://cloud.google.com/docs/authentication/api-keys)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
