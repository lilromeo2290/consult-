/*
  Warnings:

  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.
  - Added the required column `fullName` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `passwordHash` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roleId` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Assembly" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT,
    "district" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "module" TEXT
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    PRIMARY KEY ("roleId", "permissionId"),
    CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BusinessCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "registrationNo" TEXT,
    "businessUniqueNumber" TEXT,
    "businessCertNo" TEXT,
    "daAssignmentNo" TEXT,
    "businessName" TEXT NOT NULL,
    "revenueCode" TEXT,
    "revenueDescription" TEXT,
    "businessClassCode" TEXT,
    "businessClassDesc" TEXT,
    "category" TEXT,
    "amount" REAL,
    "employees" INTEGER,
    "yearEstablished" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "dateRegistered" DATETIME,
    "locality" TEXT,
    "areaCode" TEXT,
    "streetName" TEXT,
    "houseNo" TEXT,
    "ghanaPostGPS" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "landmark" TEXT,
    "ownerName" TEXT,
    "ghanaCard" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "ownerTin" TEXT,
    "categoryId" TEXT,
    "assemblyId" TEXT NOT NULL,
    "comments" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Business_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "BusinessCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Business_assemblyId_fkey" FOREIGN KEY ("assemblyId") REFERENCES "Assembly" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyNumber" TEXT,
    "propertyUniqueNumber" TEXT,
    "daAssignmentNo" TEXT,
    "permitNumber" TEXT,
    "revenueCode" TEXT,
    "revenueDescription" TEXT,
    "classCode" TEXT,
    "classDescription" TEXT,
    "propertyCategory" TEXT,
    "value" REAL,
    "rooms" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "streetName" TEXT,
    "houseNo" TEXT,
    "streetCode" TEXT,
    "ghanaPostGPS" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "locality" TEXT,
    "areaCode" TEXT,
    "ownerName" TEXT,
    "ownerAddress" TEXT,
    "ownerLatitude" REAL,
    "ownerLongitude" REAL,
    "phone" TEXT,
    "email" TEXT,
    "tin" TEXT,
    "nationalId" TEXT,
    "ownerTin" TEXT,
    "ownershipType" TEXT,
    "assemblyId" TEXT NOT NULL,
    "comments" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Property_assemblyId_fkey" FOREIGN KEY ("assemblyId") REFERENCES "Assembly" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lease" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rentPropertyNumber" TEXT,
    "rentPropertyUniqueNumber" TEXT,
    "tenancyAgreementNumber" TEXT,
    "rentRevenueCode" TEXT,
    "rentRevenueDescription" TEXT,
    "classCode" TEXT,
    "classDescription" TEXT,
    "rentCategory" TEXT,
    "amount" REAL,
    "vacant" BOOLEAN NOT NULL DEFAULT false,
    "rentPropertyLocation" TEXT,
    "locationCode" TEXT,
    "exactLocation" TEXT,
    "ghanaPostGPS" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "contractId" TEXT,
    "contractValue" REAL,
    "area" TEXT,
    "occupantName" TEXT,
    "occupantAddress" TEXT,
    "occupantPhone" TEXT,
    "occupantEmail" TEXT,
    "occupantNationalId" TEXT,
    "occupantUniqueId" TEXT,
    "excludedFromRenting" BOOLEAN NOT NULL DEFAULT false,
    "assemblyId" TEXT NOT NULL,
    "comments" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lease_assemblyId_fkey" FOREIGN KEY ("assemblyId") REFERENCES "Assembly" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNumber" TEXT NOT NULL,
    "billType" TEXT NOT NULL,
    "businessId" TEXT,
    "propertyId" TEXT,
    "leaseId" TEXT,
    "amount" REAL NOT NULL,
    "arrears" REAL NOT NULL DEFAULT 0,
    "charge" REAL NOT NULL DEFAULT 0,
    "amountDue" REAL NOT NULL,
    "amountPaid" REAL NOT NULL DEFAULT 0,
    "revenueCode" TEXT,
    "classDescription" TEXT,
    "category" TEXT,
    "location" TEXT,
    "locality" TEXT,
    "gpsCoordinates" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dueDate" DATETIME,
    "billDate" DATETIME,
    "fieldOfficer" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" REAL NOT NULL,
    "total" REAL NOT NULL,
    CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "transactionRef" TEXT,
    "receiptNumber" TEXT NOT NULL,
    "collectorId" TEXT,
    "payerName" TEXT,
    "payerPhone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Payment_collectorId_fkey" FOREIGN KEY ("collectorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Fine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fineNumber" TEXT NOT NULL,
    "dateIssued" DATETIME,
    "nameOfOffender" TEXT NOT NULL,
    "locationAddress" TEXT,
    "fineRevenueCode" TEXT,
    "classDescription" TEXT,
    "category" TEXT,
    "arrears" REAL NOT NULL DEFAULT 0,
    "charge" REAL NOT NULL DEFAULT 0,
    "amountDue" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OUTSTANDING',
    "businessId" TEXT,
    "propertyId" TEXT,
    "invoiceId" TEXT,
    "comments" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Fine_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Fine_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Fine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BPOfficial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationNumber" TEXT NOT NULL,
    "applicationDate" DATETIME,
    "applicantFullName" TEXT,
    "applicantAddress" TEXT,
    "applicantPhone" TEXT,
    "applicantEmail" TEXT,
    "applicantNationalId" TEXT,
    "applicantTin" TEXT,
    "businessName" TEXT,
    "businessRegNumber" TEXT,
    "businessLocation" TEXT,
    "routingStatus" TEXT NOT NULL DEFAULT 'Pending Submission',
    "physicalPlanningComments" TEXT,
    "physicalPlanningDate" DATETIME,
    "epaRecommendation" TEXT,
    "epaComments" TEXT,
    "epaRecommendationDate" DATETIME,
    "gnfsRecommendation" TEXT,
    "gnfsComments" TEXT,
    "gnfsRecommendationDate" DATETIME,
    "generalComments" TEXT,
    "status" TEXT NOT NULL DEFAULT 'In Progress',
    "businessId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BPOfficial_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "oldValues" TEXT,
    "newValues" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "staffId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "roleId" TEXT NOT NULL,
    "assemblyId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "User_assemblyId_fkey" FOREIGN KEY ("assemblyId") REFERENCES "Assembly" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("createdAt", "email", "id", "updatedAt") SELECT "createdAt", "email", "id", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_staffId_key" ON "User"("staffId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Assembly_code_key" ON "Assembly"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessCategory_name_key" ON "BusinessCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Business_registrationNo_key" ON "Business"("registrationNo");

-- CreateIndex
CREATE UNIQUE INDEX "Business_businessUniqueNumber_key" ON "Business"("businessUniqueNumber");

-- CreateIndex
CREATE INDEX "Business_assemblyId_idx" ON "Business"("assemblyId");

-- CreateIndex
CREATE INDEX "Business_businessName_idx" ON "Business"("businessName");

-- CreateIndex
CREATE INDEX "Business_ownerName_idx" ON "Business"("ownerName");

-- CreateIndex
CREATE INDEX "Business_locality_idx" ON "Business"("locality");

-- CreateIndex
CREATE UNIQUE INDEX "Property_propertyNumber_key" ON "Property"("propertyNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Property_propertyUniqueNumber_key" ON "Property"("propertyUniqueNumber");

-- CreateIndex
CREATE INDEX "Property_assemblyId_idx" ON "Property"("assemblyId");

-- CreateIndex
CREATE INDEX "Property_propertyNumber_idx" ON "Property"("propertyNumber");

-- CreateIndex
CREATE INDEX "Property_ownerName_idx" ON "Property"("ownerName");

-- CreateIndex
CREATE UNIQUE INDEX "Lease_rentPropertyNumber_key" ON "Lease"("rentPropertyNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Lease_rentPropertyUniqueNumber_key" ON "Lease"("rentPropertyUniqueNumber");

-- CreateIndex
CREATE INDEX "Lease_assemblyId_idx" ON "Lease"("assemblyId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_billType_idx" ON "Invoice"("billType");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_businessId_idx" ON "Invoice"("businessId");

-- CreateIndex
CREATE INDEX "Invoice_propertyId_idx" ON "Invoice"("propertyId");

-- CreateIndex
CREATE INDEX "Invoice_leaseId_idx" ON "Invoice"("leaseId");

-- CreateIndex
CREATE INDEX "Invoice_invoiceNumber_idx" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_receiptNumber_key" ON "Payment"("receiptNumber");

-- CreateIndex
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");

-- CreateIndex
CREATE INDEX "Payment_collectorId_idx" ON "Payment"("collectorId");

-- CreateIndex
CREATE INDEX "Payment_receiptNumber_idx" ON "Payment"("receiptNumber");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Fine_fineNumber_key" ON "Fine"("fineNumber");

-- CreateIndex
CREATE INDEX "Fine_fineNumber_idx" ON "Fine"("fineNumber");

-- CreateIndex
CREATE INDEX "Fine_nameOfOffender_idx" ON "Fine"("nameOfOffender");

-- CreateIndex
CREATE INDEX "Fine_status_idx" ON "Fine"("status");

-- CreateIndex
CREATE INDEX "Fine_fineRevenueCode_idx" ON "Fine"("fineRevenueCode");

-- CreateIndex
CREATE UNIQUE INDEX "BPOfficial_applicationNumber_key" ON "BPOfficial"("applicationNumber");

-- CreateIndex
CREATE INDEX "BPOfficial_applicationNumber_idx" ON "BPOfficial"("applicationNumber");

-- CreateIndex
CREATE INDEX "BPOfficial_routingStatus_idx" ON "BPOfficial"("routingStatus");

-- CreateIndex
CREATE INDEX "BPOfficial_status_idx" ON "BPOfficial"("status");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_idx" ON "AuditLog"("entity");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
