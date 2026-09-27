# QRMS Production Deployment

## Architecture

- **Backend**: Node service `qrms.service` (systemd) → `/home/schoolscreen.sa/qrms/dist/server.cjs` on port **3201**
- **Frontend docroot**: LiteSpeed vhost `qrms.schoolscreen.sa` serves `/home/schoolscreen.sa/qrms/dist` **directly**
  - vhost conf: `/usr/local/lsws/conf/vhosts/qrms.schoolscreen.sa/vhost.conf`
  - `/api/` requests are proxied to `127.0.0.1:3201`
- **Dev**: `qrms-dev.schoolscreen.sa` → docroot `/home/schoolscreen.sa/qrms_dev/dist`, API → port 3301 (`qrms-dev.service`)
- **Source of truth**: GitHub `bonyanvs-droid/QRMS`, branch `main`

## Deploy flow (the ONLY correct one)

```bash
cd /home/schoolscreen.sa/qrms
git pull origin main        # or: git fetch && git reset --hard origin/main
npm run build               # writes dist/ — served instantly by LiteSpeed
systemctl restart qrms      # restarts the API/backend
```

That's it. **No file copying needed** — LiteSpeed serves `qrms/dist` in place.

## Notes

- `qrms-app/` is a legacy orphaned checkout — nothing serves it; do NOT deploy there.
- `qrms_dev/` is the dev environment; rebuild + `systemctl restart qrms-dev` to update it.
- After deploy, users may need Ctrl+Shift+R once — the PWA service worker caches the old bundle.
- DB: PostgreSQL `qrms_production` (prod) / `qrms_development` (dev).
- Reconcile orphan login accounts: `DATABASE_URL=<prod-url> npx tsx scripts/reconcileAccounts.ts [--apply]`
