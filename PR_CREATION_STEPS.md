# Pull Request Creation and Merge Instructions

## Step 1: Push Branch and Create PR

### Push the feature branch:
```bash
# Set up remote if not already done
git remote add origin <repository-url>

# Push the feature branch
git push -u origin feature/rebrand-to-markethub
```

### Create Pull Request:
1. Navigate to your repository on GitHub/GitLab/etc.
2. Click "New Pull Request" or "Create Pull Request"
3. Set source branch: `feature/rebrand-to-markethub`
4. Set target branch: `main`
5. Title: **"Rebrand Store Lite → MarketHub"**
6. Copy the content from `PR_DESCRIPTION.md` into the PR description

## Step 2: PR Review Process

### Required Approvals:
- [ ] **Code Review**: Frontend/Backend developer approval
- [ ] **QA Review**: Testing team approval  
- [ ] **DevOps Review**: Infrastructure team approval
- [ ] **Product Review**: Product manager approval

### CI/CD Checks:
- [ ] All tests pass
- [ ] Code quality checks pass
- [ ] Security scans pass
- [ ] Build artifacts created successfully

### Review Checklist Items:
- [ ] Migration notes reviewed and approved
- [ ] Rollback instructions validated
- [ ] Asset compilation tested
- [ ] Database migration reviewed for safety

## Step 3: Pre-Merge Verification

### Before merging, ensure:
1. **All CI checks pass**
2. **All required approvals obtained**
3. **Migration tested on staging environment**
4. **Rollback procedure tested and validated**
5. **Asset builds working correctly**

### Staging Deployment Test:
```bash
# Deploy to staging
python store_lite_to_markethub_replacement.py --dry-run

# Run actual migration on staging
python store_lite_to_markethub_replacement.py

# Verify staging environment
python staging_verification.py
```

## Step 4: Squash and Merge

### Squash Merge Settings:
- **Strategy**: Squash and merge (not regular merge)
- **Commit Message**: 
  ```
  feat: Rebrand Store Lite → MarketHub (#PR_NUMBER)
  
  Complete rebrand implementation including:
  - File renames (CSS, JS, SCSS assets)
  - Content replacement throughout codebase
  - Database migration for existing data
  - Updated build scripts and documentation
  - Comprehensive rollback procedures
  
  Breaking Changes: None
  Migration Required: Yes (homepage.0002)
  ```

### Merge Process:
1. Click "Squash and merge" button
2. Edit the commit message if needed
3. Confirm the merge
4. Delete the feature branch after merge

## Step 5: Post-Merge Actions

### Immediate Actions:
1. **Tag the Release**:
   ```bash
   git checkout main
   git pull origin main
   
   # Create version tag (replace with actual version)
   git tag -a v1.2.0-markethub -m "MarketHub rebrand release"
   git push origin v1.2.0-markethub
   ```

2. **Production Deployment**:
   ```bash
   # Deploy to production following your deployment process
   # Run database migration
   python manage.py migrate homepage
   
   # Rebuild assets
   npm run build
   # or
   python manage.py collectstatic
   ```

3. **Post-Deployment Verification**:
   ```bash
   # Run verification script
   python staging_verification.py --production
   
   # Check key functionality
   # - Homepage loads with MarketHub branding
   # - CSS/JS assets load correctly
   # - Database content updated
   # - All key user journeys work
   ```

### Documentation Updates:
1. Update project README with new branding
2. Update deployment documentation if needed
3. Notify team of successful deployment
4. Update any external documentation or wikis

### Monitoring:
- Monitor application logs for errors
- Check performance metrics
- Monitor user feedback/support tickets
- Verify SEO impacts (if any)

## Step 6: Cleanup

### Optional Cleanup:
```bash
# Remove local feature branch
git branch -d feature/rebrand-to-markethub

# Clean up backup files (after verification)
rm -rf rebrand_backups/  # Only after successful deployment

# Archive migration logs
mkdir -p archives/
mv *_COMPLETION_REPORT.md archives/
mv rebrand_*.txt archives/
```

## Release Notes Template

```markdown
# Release v*.*.*-markethub

## 🎉 Major Changes
- **Complete rebrand** from Store Lite to MarketHub
- **Updated branding** throughout the application
- **Modernized visual identity** and naming conventions

## 🛠️ Technical Changes
- Renamed CSS/JS/SCSS assets to match new branding
- Updated all templates and UI text
- Database migration to update existing content
- Updated build processes and documentation

## 🚀 Deployment Notes
- Database migration required: `python manage.py migrate homepage`
- Asset rebuild recommended: `npm run build`
- No breaking changes to functionality

## 🔄 Rollback
See `ROLLBACK_INSTRUCTIONS.md` for emergency procedures.
```

---

**This completes the PR creation and merge workflow for the Store Lite → MarketHub rebrand.**
