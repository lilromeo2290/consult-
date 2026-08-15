---
Task ID: 1
Agent: main
Task: Create Fines Management page

Work Log:
- Read existing code patterns (rms-layout, app-store, page.tsx, import-export.ts, bp-official.tsx, billing.tsx, fines-class-code-map.ts, use-synced-storage.ts)
- Created `/home/z/my-project/src/components/rms/fines-management.tsx` with full CRUD, auto-generated fine numbers (FN-YY-0000), offence class/revenue code auto-population from fines-class-code-map, auto-calculated amount due (arrears + charge), 6 statuses, 5 form sections, list view with search/filter/pagination, import/export
- Added `FINE_MANAGEMENT_FIELDS` (12 fields) to import-export.ts
- Added `fines-management` page type to app-store.ts RMSPage union + ALL_RMS_PAGES
- Added nav item (Gavel icon) + page title to rms-layout.tsx
- Added import + case routing in page.tsx
- Built successfully, deployed to VPS (PM2 restarted, HTTP 200), pushed to GitHub

Stage Summary:
- Fines Management page live at sidebar "Fines Management"
- Captures: Fine Number, Name of Offender, Location/Address, Fine Revenue Code, Class Description, Category, Amount (Arrears/Charge/Amount Due)
- Auto-links with existing fines-class-code-map.ts for all 8 offence categories (Building, Environmental, Animal, General, Retrieval, Traffic, Drainage, Illegal Activities)
