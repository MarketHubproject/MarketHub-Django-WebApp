# Rollback Instructions: MarketHub → Store Lite

## Emergency Rollback Procedure

### 1. Immediate Actions (Production Emergency)
```bash
# 1. Revert to previous commit
git revert HEAD --no-edit

# 2. Push the revert
git push origin main

# 3. Restore database backup
# Replace 'backup_filename' with your actual backup file
pg_restore -d markethub_production backup_filename

# 4. Restart application services
sudo systemctl restart gunicorn
sudo systemctl restart nginx
```

### 2. Complete Rollback Process

#### Database Rollback
```bash
# Run the reverse migration
python manage.py migrate homepage 0001

# Or restore from backup if available
pg_restore -d your_database_name store_lite_backup.sql
```

#### File Rollback
```bash
# Reset to commit before rebrand
git reset --hard [commit_hash_before_rebrand]

# Force push (use carefully)
git push --force-with-lease origin main
```

#### Asset Compilation
```bash
# Rebuild old assets
npm run build:store-lite  # if available
# or
sass homepage/static/MarketHub/scss/store-lite.scss:homepage/static/MarketHub/css/store-lite.css
```

### 3. Manual File Restoration
If automated rollback fails, manually restore these key files:

1. **Templates**: `homepage/templates/homepage/base.html`
2. **CSS**: Restore `store-lite.css` from backup
3. **JS**: Restore `store-lite.js` from backup
4. **Settings**: Revert `markethub/settings.py` changes
5. **Package.json**: Restore original build scripts

### 4. Verification Steps
- [ ] Homepage displays "Store Lite" branding
- [ ] CSS styles load correctly
- [ ] JavaScript functions properly
- [ ] Database content shows "Store Lite"
- [ ] All tests pass
- [ ] No 404 errors on static assets

### 5. Communication
- Notify stakeholders of rollback
- Update status pages/monitoring
- Document rollback reason and timeline
- Plan forward fix strategy

## Prevention
- Always backup before major changes
- Test rollback procedure in staging
- Use feature flags for gradual rollouts
- Maintain rollback scripts in version control

## Support Contacts
- DevOps Team: [contact info]
- Database Admin: [contact info]
- Project Lead: [contact info]
