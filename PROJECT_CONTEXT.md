# Rev_Mgnt_Sys - Project Context & Survival Guide

> **Purpose:** This file contains ALL critical information needed to continue
> development in a new session. NEVER delete this file. Update it after every
> major change.

---

## 1. PROJECT OVERVIEW

- **Name:** Rev_Mgnt_Sys (Revenue Management System)
- **Client:** Kpando Municipal Assembly, Ghana
- **Stack:** Next.js 16.1.3, React, TypeScript, Tailwind CSS, Prisma (SQLite), shadcn/ui
- **Output Mode:** Standalone (for VPS deployment)
- **Local Path:** `/home/z/my-project/Rev_Mgnt_Sys/`

---

## 2. VPS DEPLOYMENT INFO

| Item | Value |
|------|-------|
| **VPS IP** | `153.75.247.4` |
| **SSH Port** | `22` (NOT 2005 - that's the web port) |
| **SSH User** | `root` |
| **SSH Key** | `/home/z/.ssh/vps_deploy_key` (must be OpenSSH format, NOT PKCS8) |
| **Web Port** | `3008` (accessed via reverse proxy on port 2005) |
| **Source on VPS** | `/home/kpma-rms-new/` (git clone) |
| **Deploy Target** | `/home/kpma-rms/` (standalone runtime) |
| **Database** | `/home/kpma-rms-build-fresh/db/custom.db` (SQLite) |
| **PM2 App** | runs from `/home/kpma-rms/` on port 3008 |
| **.env (deploy)** | `DATABASE_URL=file:/home/kpma-rms-build-fresh/db/custom.db` |

### Deploy Pipeline (CRITICAL - follow exactly)

VPS is too slow to build (100% CPU, 94% RAM). MUST build locally then transfer:

1. **Build locally:**
   ```bash
   cd /home/z/my-project/Rev_Mgnt_Sys
   cp .env.local .env  # or set DATABASE_URL for local build
   npm run build  # or npx next build
   ```

2. **Create 3 tar files** (MUST tar from `.next/standalone/Rev_Mgnt_Sys/` due to nested structure):
   ```bash
   cd /home/z/my-project/Rev_Mgnt_Sys
   tar czf /tmp/standalone.tar.gz -C .next/standalone/Rev_Mgnt_Sys/ .
   tar czf /tmp/static.tar.gz -C .next/static/ .
   tar czf /tmp/public.tar.gz -C public/ .
   ```

3. **SFTP upload** (use paramiko, ssh is not available as command):
   ```python
   import paramiko
   key = paramiko.RSAKey.from_private_key_file('/home/z/.ssh/vps_deploy_key')
   # or Ed25519Key if using ed25519
   transport = paramiko.Transport(('153.75.247.4', 22))
   transport.connect(username='root', pkey=key)
   sftp = paramiko.SFTPClient.from_transport(transport)
   # upload files, extract, fix env, restart pm2
   ```

4. **On VPS - extract & fix:**
   ```bash
   rm -rf /home/kpma-rms/*
   cd /home/kpma-rms && tar xzf /tmp/standalone.tar.gz
   mkdir -p /home/kpma-rms/.next/static && cd /home/kpma-rms/.next/static && tar xzf /tmp/static.tar.gz
   cd /home/kpma-rms && tar xzf /tmp/public.tar.gz
   # Fix Prisma hash symlink (CRITICAL - find hash in compiled code)
   HASH=$(grep -roh '@prisma/client-[a-f0-9]*' /home/kpma-rms/.next/server/ | sort -u | head -1)
   ln -sf /home/kpma-rms/node_modules/@prisma/client /home/kpma-rms/node_modules/$HASH
   # Restart PM2 with env vars (standalone does NOT load .env at runtime!)
   pm2 delete kpma-rms
   cd /home/kpma-rms && PORT=3008 DATABASE_URL="file:/home/kpma-rms-build-fresh/db/custom.db" pm2 start server.js --name kpma-rms
   pm2 save
   ```

### Common Deploy Pitfalls
- **NEVER tar from `.next/standalone/`** - creates nested `Rev_Mgnt_Sys/` subdir. Use `.next/standalone/Rev_Mgnt_Sys/`
- **Standalone does NOT load .env at runtime** - MUST pass DATABASE_URL as env var to PM2
- **Prisma client hash symlink** - compiled code references `@prisma/client-HASH`; must symlink to actual client
- **Always pass PORT=3008** when starting PM2 - otherwise defaults to 3000
- **Node v20 on VPS vs v24 locally** - Prisma native modules differ but JS client works
- **SSH key MUST be OpenSSH/PEM format** - PKCS8 format fails with paramiko

---

## 3. GIT REPOSITORY

| Remote | URL |
|--------|-----|
| origin | `https://github.com/lilromeo2290/Rev_Mgnt_Sys.git` |

- **Note:** Git push requires a GitHub Personal Access Token (PAT).
- If push fails with "could not read Username", run:
  ```bash
  git remote set-url origin https://<YOUR_GITHUB_TOKEN>@github.com/lilromeo2290/Rev_Mgnt_Sys.git
  ```
- **Always commit after every change:** `git add -A && git commit -m 'description'`

---

## 4. DATABASE SCHEMA (Prisma/SQLite)

Tables: `RmsData`, `User`, `_prisma_migrations`
- RmsData is a JSON store (key-value style with JSON data column)
- The DB file is ONLY on the VPS at `/home/kpma-rms-build-fresh/db/custom.db`
- **BACKUP THIS FILE REGULARLY!** Copy it to local: `/home/z/my-project/Rev_Mgnt_Sys/db/custom.db`

---

## 5. CURRENT SIDEBAR NAVIGATION

In order: Dashboard, Business Register, Properties, Rent, Building Permit,
BP Official, Rate Config, Payments, Payment History, Receipts, Billing,
Penalties, Reports, Audit Trail, Users, Settings, Search

- **Removed:** BP Payment, Businesses
- **Added:** Business Register (after Dashboard, Building2 icon)

---

## 6. PENDING WORK

### Immediate
- [ ] Duplicate Property Register fields into Business Register page
- [ ] Read `properties.tsx` for field structure (currently on VPS at
      `/home/kpma-rms-new/src/components/rms/properties.tsx`)

### Deferred
- [ ] Fix logo/images
- [ ] Redesign Businesses page (has TDZ error)

---

## 7. KEY FILES

| File | Purpose |
|------|---------|
| `src/components/rms/rms-layout.tsx` | Sidebar navigation (NAV_ITEMS, PAGE_TITLES) |
| `src/stores/app-store.ts` | Page type definitions (RMSPage, ALL_RMS_PAGES) |
| `src/app/page.tsx` | Main page router (switch case for each page) |
| `src/components/rms/properties.tsx` | Property Register (source for Business Register fields) |
| `src/components/rms/business-register.tsx` | Business Register (currently placeholder) |
| `prisma/schema.prisma` | Database schema |
| `src/lib/db.ts` | Prisma client |
| `ecosystem.config.cjs` | PM2 config |
| `.env` | Database URL config |

---

## 8. SURVIVAL CHECKLIST (for new sessions)

When starting a new session, do this FIRST:

1. Read this file: `PROJECT_CONTEXT.md`
2. Check git status: `git status`
3. Verify SSH key: `python3 -c "import paramiko; paramiko.RSAKey.from_private_key_file('/home/z/.ssh/vps_deploy_key')"`
4. If SSH key broken, regenerate (see Section 9)
5. Check VPS is up: connect via paramiko and run `pm2 status`
6. Check `worklog.md` for recent changes

---

## 9. SSH KEY REGENERATION

If the SSH key is lost or corrupted:

```bash
# Generate new key (OpenSSH format - CRITICAL)
ssh-keygen -t rsa -b 4096 -f /home/z/.ssh/vps_deploy_key -N '' -m PEM

# Display public key for user to add to VPS
cat /home/z/.ssh/vps_deploy_key.pub
```

Then tell the user to run this on the VPS:
```bash
echo "<PUBLIC_KEY_CONTENT>" >> /root/.ssh/authorized_keys
```

---

## 10. HISTORY OF ISSUES

- SSH port confusion: User said port 2005 but SSH is on 22 (2005 is web)
- PKCS8 key format fails with paramiko - must use OpenSSH/PEM format
- VPS builds stall at 100% CPU - must build locally
- Wrong tar path creates nested directories
- Wrong .env causes blank page (missing CSS from failed build)
- Sessions reset and lose context - this file is the cure
