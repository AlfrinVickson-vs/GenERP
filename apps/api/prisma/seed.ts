import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import { PERMISSIONS } from "@erp/security";

const prisma = new PrismaClient();
const UserStatus = {
  ACTIVE: "ACTIVE"
} as const;

const permissionCodes = Object.values(PERMISSIONS);

const rolePermissions: Record<string, string[]> = {
  "System Administrator": [PERMISSIONS.ALL],
    "Company Administrator": [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.COMPANY_VIEW,
    PERMISSIONS.COMPANY_EDIT,
    "master_data.*",
    "customer.*",
    "crm.*",
    "sales.*",
    "supplier.*",
    "item.*",
    "branch.*",
    "department.*",
    "warehouse.*",
    "inventory.*",
    "reports.*",
    PERMISSIONS.INTEGRATION_VIEW,
    "hr.*",
    "approval.*",
    PERMISSIONS.NOTIFICATION_VIEW,
    "cost_center.*",
    "user.*",
    "role.*",
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.SECURITY_SETTINGS_CHANGE
  ],
  "General Manager": [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.COMPANY_VIEW,
    PERMISSIONS.MASTER_DATA_VIEW,
    PERMISSIONS.CUSTOMER_VIEW,
    PERMISSIONS.CRM_VIEW,
    PERMISSIONS.SALES_VIEW,
    PERMISSIONS.SUPPLIER_VIEW,
    PERMISSIONS.ITEM_VIEW,
    PERMISSIONS.BRANCH_VIEW,
    PERMISSIONS.DEPARTMENT_VIEW,
    PERMISSIONS.WAREHOUSE_VIEW,
    PERMISSIONS.HR_VIEW,
    PERMISSIONS.APPROVAL_VIEW,
    PERMISSIONS.APPROVAL_ACTION,
    PERMISSIONS.NOTIFICATION_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.INTEGRATION_VIEW,
    PERMISSIONS.AUDIT_VIEW
  ],
  "Finance Manager": [PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.COMPANY_VIEW, PERMISSIONS.ACCOUNTING_VIEW, PERMISSIONS.ACCOUNTING_EDIT, PERMISSIONS.FINANCIAL_REPORTS_VIEW, PERMISSIONS.REPORTS_VIEW, PERMISSIONS.REPORTS_EXPORT, PERMISSIONS.INTEGRATION_VIEW, PERMISSIONS.APPROVAL_VIEW, PERMISSIONS.APPROVAL_ACTION, PERMISSIONS.NOTIFICATION_VIEW],
  Accountant: [PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.COMPANY_VIEW, PERMISSIONS.ACCOUNTING_VIEW, PERMISSIONS.ACCOUNTING_EDIT, PERMISSIONS.FINANCIAL_REPORTS_VIEW, PERMISSIONS.REPORTS_VIEW, PERMISSIONS.REPORTS_EXPORT],
  "Sales Manager": [PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.COMPANY_VIEW, "customer.*", PERMISSIONS.ITEM_VIEW, "crm.*", "sales.*", PERMISSIONS.REPORTS_VIEW, PERMISSIONS.REPORTS_EXPORT],
  "Sales Executive": [PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.CUSTOMER_VIEW, PERMISSIONS.ITEM_VIEW, "crm.*", "sales.*"],
  "Purchase Manager": [PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.COMPANY_VIEW, "supplier.*", PERMISSIONS.ITEM_VIEW, PERMISSIONS.PURCHASE_VIEW, PERMISSIONS.PURCHASE_EDIT, PERMISSIONS.INVENTORY_VIEW],
  "Purchase Executive": [PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.SUPPLIER_VIEW, PERMISSIONS.ITEM_VIEW, PERMISSIONS.PURCHASE_VIEW, PERMISSIONS.PURCHASE_EDIT, PERMISSIONS.INVENTORY_VIEW],
  "Warehouse Manager": [PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.WAREHOUSE_VIEW, PERMISSIONS.ITEM_VIEW, "inventory.*"],
  Storekeeper: [PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.WAREHOUSE_VIEW, PERMISSIONS.ITEM_VIEW, PERMISSIONS.INVENTORY_VIEW],
  "HR Manager": [PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.DEPARTMENT_VIEW, PERMISSIONS.HR_VIEW, PERMISSIONS.HR_EDIT, PERMISSIONS.APPROVAL_VIEW, PERMISSIONS.APPROVAL_ACTION, PERMISSIONS.NOTIFICATION_VIEW, PERMISSIONS.EMPLOYEE_SALARY_VIEW],
  "HR Executive": [PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.DEPARTMENT_VIEW, PERMISSIONS.HR_VIEW, PERMISSIONS.HR_EDIT, PERMISSIONS.APPROVAL_VIEW, PERMISSIONS.NOTIFICATION_VIEW],
  "Department Manager": [PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.DEPARTMENT_VIEW, PERMISSIONS.HR_VIEW, PERMISSIONS.APPROVAL_VIEW, PERMISSIONS.APPROVAL_ACTION, PERMISSIONS.NOTIFICATION_VIEW],
  Employee: [PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.HR_VIEW, PERMISSIONS.NOTIFICATION_VIEW],
  "Internal Auditor": [PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.AUDIT_VIEW, PERMISSIONS.COMPANY_VIEW, PERMISSIONS.REPORTS_VIEW, PERMISSIONS.REPORTS_EXPORT],
  "Read-Only User": [PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.COMPANY_VIEW, PERMISSIONS.CUSTOMER_VIEW, PERMISSIONS.SUPPLIER_VIEW, PERMISSIONS.ITEM_VIEW, PERMISSIONS.CRM_VIEW, PERMISSIONS.SALES_VIEW, PERMISSIONS.REPORTS_VIEW]
};

async function main() {
  const company = await prisma.company.upsert({
    where: { singletonKey: "single-company" },
    update: {},
    create: {
      name: "GENSIS ERP Demo Company",
      registrationNumber: "DEMO-ERP-001",
      taxRegistrationNumber: "GST-DEMO-001",
      address: "10 Anson Road, Singapore",
      phone: "+65 6000 0000",
      email: "admin@eversafe-demo.test",
      website: "https://eversafe-demo.test",
      baseCurrency: "SGD",
      financialYearStartMonth: 1,
      timezone: "Asia/Singapore",
      dateFormat: "dd/MM/yyyy",
      invoiceFooter: "Thank you for your business.",
      termsAndConditions: "Demo data only. Replace before production use."
    }
  });

  const permissions = new Map<string, string>();
  for (const code of permissionCodes) {
    const [module, action = "*"] = code.split(".");
    const permission = await prisma.permission.upsert({
      where: { code },
      update: { module, action },
      create: {
        code,
        module,
        action,
        description: `${module} ${action}`
      }
    });
    permissions.set(code, permission.id);
  }

  const roles = new Map<string, string>();
  for (const [name, codes] of Object.entries(rolePermissions)) {
    const role = await prisma.role.upsert({
      where: { name },
      update: { isSystem: true },
      create: {
        name,
        description: `${name} default role`,
        isSystem: true
      }
    });
    roles.set(name, role.id);

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    for (const code of codes) {
      let permissionId = permissions.get(code);
      if (!permissionId) {
        const [module, action = "*"] = code.split(".");
        const permission = await prisma.permission.upsert({
          where: { code },
          update: { module, action },
          create: { code, module, action, description: `${module} ${action}` }
        });
        permissionId = permission.id;
      }

      await prisma.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId
        }
      });
    }
  }

  const branchNorth = await prisma.branch.upsert({
    where: { companyId_code: { companyId: company.id, code: "HQ" } },
    update: {},
    create: {
      companyId: company.id,
      code: "HQ",
      name: "Head Office",
      address: "10 Anson Road, Singapore"
    }
  });

  const branchWest = await prisma.branch.upsert({
    where: { companyId_code: { companyId: company.id, code: "WEST" } },
    update: {},
    create: {
      companyId: company.id,
      code: "WEST",
      name: "West Branch",
      address: "21 Jurong Gateway Road, Singapore"
    }
  });

  for (const unit of [
    { code: "FIN", name: "Finance", branchId: branchNorth.id },
    { code: "OPS", name: "Operations", branchId: branchNorth.id },
    { code: "SALES", name: "Sales", branchId: branchWest.id }
  ]) {
    await prisma.department.upsert({
      where: { companyId_code: { companyId: company.id, code: unit.code } },
      update: {},
      create: { companyId: company.id, ...unit }
    });
  }

  const mainWarehouse = await prisma.warehouse.upsert({
    where: { companyId_code: { companyId: company.id, code: "MAIN" } },
    update: {},
    create: { companyId: company.id, code: "MAIN", name: "Main Warehouse", branchId: branchNorth.id }
  });

  await prisma.warehouse.upsert({
    where: { companyId_code: { companyId: company.id, code: "WEST-ST" } },
    update: {},
    create: { companyId: company.id, code: "WEST-ST", name: "West Store", branchId: branchWest.id }
  });

  const baseCurrency = await prisma.currency.upsert({
    where: { companyId_code: { companyId: company.id, code: "SGD" } },
    update: {},
    create: { companyId: company.id, code: "SGD", name: "Singapore Dollar", symbol: "$", isBase: true }
  });

  const net30 = await prisma.paymentTerm.upsert({
    where: { companyId_code: { companyId: company.id, code: "NET30" } },
    update: {},
    create: { companyId: company.id, code: "NET30", name: "Net 30 Days", days: 30 }
  });

  await prisma.paymentTerm.upsert({
    where: { companyId_code: { companyId: company.id, code: "COD" } },
    update: {},
    create: { companyId: company.id, code: "COD", name: "Cash on Delivery", days: 0 }
  });

  const customerCategory = await prisma.customerCategory.upsert({
    where: { companyId_code: { companyId: company.id, code: "KEY" } },
    update: {},
    create: { companyId: company.id, code: "KEY", name: "Key Account" }
  });

  const supplierCategory = await prisma.supplierCategory.upsert({
    where: { companyId_code: { companyId: company.id, code: "LOCAL" } },
    update: {},
    create: { companyId: company.id, code: "LOCAL", name: "Local Supplier" }
  });

  const itemCategory = await prisma.itemCategory.upsert({
    where: { companyId_code: { companyId: company.id, code: "SAFETY" } },
    update: {},
    create: { companyId: company.id, code: "SAFETY", name: "Safety Equipment" }
  });

  const unitEach = await prisma.unitOfMeasure.upsert({
    where: { companyId_code: { companyId: company.id, code: "EA" } },
    update: {},
    create: { companyId: company.id, code: "EA", name: "Each" }
  });

  const gst = await prisma.taxCode.upsert({
    where: { companyId_code: { companyId: company.id, code: "GST9" } },
    update: {},
    create: { companyId: company.id, code: "GST9", name: "GST 9%", ratePercent: "9" }
  });

  await prisma.warehouseBin.upsert({
    where: { warehouseId_code: { warehouseId: mainWarehouse.id, code: "A1" } },
    update: {},
    create: { warehouseId: mainWarehouse.id, code: "A1", name: "Aisle A1" }
  });

  await prisma.customer.upsert({
    where: { companyId_code: { companyId: company.id, code: "CUST-001" } },
    update: {},
    create: {
      companyId: company.id,
      code: "CUST-001",
      name: "Harbourfront Marine Pte Ltd",
      customerType: "Business",
      contactPerson: "Alicia Tan",
      phone: "+65 6123 4567",
      email: "accounts@harbourfront-marine.test",
      billingAddress: "1 Maritime Square, Singapore",
      shippingAddress: "1 Maritime Square, Singapore",
      paymentTermId: net30.id,
      currencyId: baseCurrency.id,
      categoryId: customerCategory.id,
      creditLimit: "25000",
      notes: "Demonstration customer"
    }
  });

  const supplier = await prisma.supplier.upsert({
    where: { companyId_code: { companyId: company.id, code: "SUP-001" } },
    update: {},
    create: {
      companyId: company.id,
      code: "SUP-001",
      name: "SafeGear Supplies",
      contactPerson: "Ravi Menon",
      phone: "+65 6987 1111",
      email: "sales@safegear.test",
      address: "8 Tuas Avenue, Singapore",
      paymentTermId: net30.id,
      currencyId: baseCurrency.id,
      categoryId: supplierCategory.id,
      notes: "Demonstration supplier"
    }
  });

  const safetyHelmet = await prisma.item.upsert({
    where: { companyId_code: { companyId: company.id, code: "ITEM-001" } },
    update: {},
    create: {
      companyId: company.id,
      code: "ITEM-001",
      barcode: "888000000001",
      name: "Safety Helmet",
      description: "Industrial safety helmet",
      itemType: "Stock",
      categoryId: itemCategory.id,
      unitOfMeasureId: unitEach.id,
      purchasePrice: "12.50",
      sellingPrice: "24.00",
      minimumSellingPrice: "20.00",
      taxCodeId: gst.id,
      reorderLevel: "25",
      safetyStock: "10",
      preferredSupplierId: supplier.id,
      warehouseId: mainWarehouse.id
    }
  });

  await prisma.stockBalance.upsert({
    where: {
      companyId_itemId_warehouseId: {
        companyId: company.id,
        itemId: safetyHelmet.id,
        warehouseId: mainWarehouse.id
      }
    },
    update: {},
    create: {
      companyId: company.id,
      itemId: safetyHelmet.id,
      warehouseId: mainWarehouse.id,
      quantityOnHand: "100",
      averageCost: "12.50"
    }
  });

  await prisma.stockLedgerEntry.upsert({
    where: {
      companyId_sourceType_sourceDocumentId_itemId_warehouseId: {
        companyId: company.id,
        sourceType: "OPENING_STOCK",
        sourceDocumentId: "OPEN-ITEM-001-MAIN",
        itemId: safetyHelmet.id,
        warehouseId: mainWarehouse.id
      }
    },
    update: {},
    create: {
      companyId: company.id,
      itemId: safetyHelmet.id,
      warehouseId: mainWarehouse.id,
      movementType: "IN",
      sourceType: "OPENING_STOCK",
      sourceDocumentId: "OPEN-ITEM-001-MAIN",
      quantityIn: "100",
      quantityOut: "0",
      unitCost: "12.50",
      valuationAmount: "1250",
      balanceAfter: "100",
      remarks: "Seeded opening stock"
    }
  });

  const demoLead = await prisma.lead.upsert({
    where: { companyId_code: { companyId: company.id, code: "LEAD-00001" } },
    update: {},
    create: {
      companyId: company.id,
      code: "LEAD-00001",
      name: "Marine safety renewal",
      companyName: "Harbourfront Marine Pte Ltd",
      contactName: "Alicia Tan",
      email: "accounts@harbourfront-marine.test",
      source: "Referral",
      status: "QUALIFIED",
      expectedValue: "2400",
      notes: "Demo CRM lead"
    }
  });

  const demoOpportunity = await prisma.opportunity.upsert({
    where: { companyId_code: { companyId: company.id, code: "OPP-00001" } },
    update: {},
    create: {
      companyId: company.id,
      code: "OPP-00001",
      title: "Safety helmet replenishment",
      leadId: demoLead.id,
      customerId: (await prisma.customer.findFirstOrThrow({ where: { companyId: company.id, code: "CUST-001" } })).id,
      stage: "QUOTATION",
      status: "OPEN",
      probability: 60,
      expectedValue: "2400",
      notes: "Demo opportunity"
    }
  });

  const demoCustomer = await prisma.customer.findFirstOrThrow({ where: { companyId: company.id, code: "CUST-001" } });
  const demoQuotation = await prisma.quotation.upsert({
    where: { companyId_quoteNo: { companyId: company.id, quoteNo: "QUO-00001" } },
    update: {},
    create: {
      companyId: company.id,
      quoteNo: "QUO-00001",
      customerId: demoCustomer.id,
      opportunityId: demoOpportunity.id,
      status: "SENT",
      subtotal: "240",
      taxTotal: "0",
      total: "240",
      lines: {
        create: [
          {
            itemId: safetyHelmet.id,
            description: "ITEM-001 - Safety Helmet",
            quantity: "10",
            unitPrice: "24",
            lineTotal: "240"
          }
        ]
      }
    }
  });

  await prisma.salesOrder.upsert({
    where: { companyId_orderNo: { companyId: company.id, orderNo: "SO-00001" } },
    update: {},
    create: {
      companyId: company.id,
      orderNo: "SO-00001",
      customerId: demoCustomer.id,
      quotationId: demoQuotation.id,
      status: "CONFIRMED",
      subtotal: "240",
      taxTotal: "0",
      total: "240",
      lines: {
        create: [
          {
            itemId: safetyHelmet.id,
            description: "ITEM-001 - Safety Helmet",
            quantity: "10",
            unitPrice: "24",
            lineTotal: "240",
            reservedQuantity: "10"
          }
        ]
      }
    }
  });

  for (const unit of [
    { code: "ADMIN", name: "Administration" },
    { code: "OPS", name: "Operations" },
    { code: "SALES", name: "Sales" }
  ]) {
    await prisma.costCenter.upsert({
      where: { companyId_code: { companyId: company.id, code: unit.code } },
      update: {},
      create: { companyId: company.id, ...unit }
    });
  }

  const users = [
    ["admin", "admin@eversafe-demo.test", "System Admin", "System Administrator"],
    ["companyadmin", "companyadmin@eversafe-demo.test", "Company Admin", "Company Administrator"],
    ["gm", "gm@eversafe-demo.test", "General Manager", "General Manager"],
    ["finance", "finance@eversafe-demo.test", "Finance Manager", "Finance Manager"],
    ["accountant", "accountant@eversafe-demo.test", "Accountant", "Accountant"],
    ["salesmgr", "salesmgr@eversafe-demo.test", "Sales Manager", "Sales Manager"],
    ["purchasemgr", "purchasemgr@eversafe-demo.test", "Purchase Manager", "Purchase Manager"],
    ["warehouse", "warehouse@eversafe-demo.test", "Warehouse Manager", "Warehouse Manager"],
    ["hr", "hr@eversafe-demo.test", "HR Manager", "HR Manager"],
    ["auditor", "auditor@eversafe-demo.test", "Internal Auditor", "Internal Auditor"]
  ] as const;

  const passwordHash = await argon2.hash("Admin123!", {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1
  });

  for (const [username, email, displayName, roleName] of users) {
    const roleId = roles.get(roleName);
    if (!roleId) {
      throw new Error(`Missing seeded role ${roleName}`);
    }

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        companyId: company.id,
        email,
        username,
        displayName,
        passwordHash,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        activatedAt: new Date()
      }
    });

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId } },
      update: {},
      create: { userId: user.id, roleId }
    });
  }

  const existingApprovalRules = await prisma.approvalRule.count();
  if (existingApprovalRules === 0) {
    await prisma.approvalRule.createMany({
      data: [
        {
          name: "Purchase up to 1000",
          documentType: "purchase_request",
          maxAmount: "1000",
          approverRole: "Department Manager",
          sequence: 1
        },
        {
          name: "Purchase from 1001 to 10000",
          documentType: "purchase_request",
          minAmount: "1001",
          maxAmount: "10000",
          approverRole: "Finance Manager",
          sequence: 2
        }
      ]
    });
  }

  await prisma.auditLog.create({
    data: {
      companyId: company.id,
      action: "seed",
      module: "system",
      recordType: "Company",
      recordId: company.id,
      afterValue: JSON.stringify({ message: "Eversafe Demo Company seed data created" })
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
