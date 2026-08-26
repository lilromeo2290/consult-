#!/bin/bash
# =============================================================
# RMS: Add "Business Register" sidebar, remove Businesses & BP Payment
# Run this script on your VPS as root or the deploy user
# =============================================================
set -e

SRC="/home/kpma-rms-new"
DEPLOY="/home/kpma-rms"
DB_DIR="/home/kpma-rms-build-fresh"

echo "=== Step 1: Creating BusinessRegister component ==="
cat > "$SRC/src/components/rms/business-register.tsx" << 'COMPONENT_EOF'
'use client';

import React from 'react';
import { Building2 } from 'lucide-react';

export function BusinessRegisterPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
      <Building2 className="text-muted-foreground" size={64} />
      <h2 className="text-2xl font-semibold text-foreground">Business Register</h2>
      <p className="text-muted-foreground text-center max-w-md">
        Business registration module is under development. Check back soon for updates.
      </p>
    </div>
  );
}
COMPONENT_EOF
echo "    business-register.tsx created"

echo "=== Step 2: Patching rms-layout.tsx ==="
LAYOUT="$SRC/src/components/rms/rms-layout.tsx"

# Remove Businesses nav item
sed -i "/{ label: 'Businesses', page: 'businesses', icon: Building2 },/d" "$LAYOUT"
# Remove BP Payment nav item  
sed -i "/{ label: 'BP Payment', page: 'bp-payment', icon: Wallet },/d" "$LAYOUT"
# Add Business Register after Dashboard
sed -i "/{ label: 'Dashboard', page: 'dashboard', icon: LayoutDashboard },/a\\  { label: 'Business Register', page: 'business-register', icon: Building2 }," "$LAYOUT"
# Remove Wallet from imports (no longer used)
sed -i '/^  Wallet,/d' "$LAYOUT"
# Keep Building2 (used by Business Register)

# Fix PAGE_TITLES: replace businesses entry
sed -i "s/  businesses: 'Businesses',$/  'business-register': 'Business Register',/" "$LAYOUT"
# Remove bp-payment entry
sed -i "/  'bp-payment': 'BP Payment',/d" "$LAYOUT"

echo "    rms-layout.tsx patched"

echo "=== Step 3: Patching app-store.ts ==="
STORE="$SRC/src/stores/app-store.ts"

# Replace 'businesses' with 'business-register' in RMSPage type
sed -i "s/  | 'businesses'$/  | 'business-register'/" "$STORE"
# Remove 'bp-payment' from RMSPage type
sed -i "/  | 'bp-payment';/d" "$STORE"
# Fix: ensure bp-official line ends with semicolon now
sed -i "s/  | 'bp-official',$/  | 'bp-official';/" "$STORE"

# Replace businesses entry in ALL_RMS_PAGES
sed -i "s/{ page: 'businesses', label: 'Business Registration' },/{ page: 'business-register', label: 'Business Register' },/" "$STORE"
# Remove bp-payment entry from ALL_RMS_PAGES
sed -i "/{ page: 'bp-payment', label: 'BP Payment' },/d" "$STORE"

echo "    app-store.ts patched"

echo "=== Step 4: Patching page.tsx ==="
PAGE="$SRC/src/app/page.tsx"

# Replace BusinessesPage import with BusinessRegisterPage
sed -i "s|import { BusinessesPage } from '@/components/rms/businesses';|import { BusinessRegisterPage } from '@/components/rms/business-register';|" "$PAGE"
# Remove BPPaymentPage import
sed -i "/import { BPPaymentPage } from '@\/components\/rms\/bp-payment';/d" "$PAGE"
# Replace businesses case with business-register case
sed -i "s/case 'businesses': return <BusinessesPage \/>;/case 'business-register': return <BusinessRegisterPage \/>;/" "$PAGE"
# Remove bp-payment case
sed -i "/case 'bp-payment': return <BPPaymentPage \/>;/d" "$PAGE"

echo "    page.tsx patched"

echo "=== Step 5: Building ==="
cd "$SRC"
npm run build 2>&1 | tail -20

echo "=== Step 6: Deploying ==="
# Clear old deploy
rm -rf "$DEPLOY"/*
# Copy standalone build
cp -a "$SRC/.next/standalone/." "$DEPLOY/"
# Copy static assets
cp -a "$SRC/.next/static" "$DEPLOY/.next/static"
# Copy public (avoid nesting)
rm -rf "$DEPLOY/public"
cp -a "$SRC/public" "$DEPLOY/public"
# Copy .env
cp "$SRC/.env" "$DEPLOY/.env"

# Also update the build-fresh db reference if needed
if [ -f "$DB_DIR/.env" ]; then
  cp "$DB_DIR/.env" "$DEPLOY/.env"
fi

echo "=== Step 7: Restarting PM2 ==="
pm2 restart rms 2>&1 || pm2 start "$DEPLOY/server.js" --name rms 2>&1

echo ""
echo "============================================="
echo "  DONE! Business Register sidebar added."
echo "  Removed: Businesses, BP Payment"
echo "  New: Business Register (after Dashboard)"
echo "============================================="
