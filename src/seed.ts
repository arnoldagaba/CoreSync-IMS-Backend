import { prisma } from './lib/prisma.js';
import bcrypt from 'bcrypt';

async function main() {
  // Clear existing data (optional - comment out if you don't want to clear data)
  await prisma.$transaction([
    prisma.rolePermission.deleteMany(),
    prisma.permission.deleteMany(),
    prisma.userActivityLog.deleteMany(),
    prisma.userRole.deleteMany(),
    prisma.role.deleteMany(),
    prisma.salesOrderItem.deleteMany(),
    prisma.salesOrder.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.procurementOrderItem.deleteMany(),
    prisma.procurementOrder.deleteMany(),
    prisma.inventoryItem.deleteMany(),
    prisma.vendor.deleteMany(),
    prisma.maintenanceLog.deleteMany(),
    prisma.equipment.deleteMany(),
    prisma.productionOrder.deleteMany(),
    prisma.product.deleteMany(),
    prisma.financialTransaction.deleteMany(),
    prisma.budget.deleteMany(),
    prisma.user.deleteMany(),
    prisma.department.deleteMany(),
  ]);

  console.log('Database cleared');

  // Create permissions
  const permissions = await Promise.all([
    prisma.permission.create({
      data: { name: 'users.view', description: 'Can view users' },
    }),
    prisma.permission.create({
      data: { name: 'users.create', description: 'Can create users' },
    }),
    prisma.permission.create({
      data: { name: 'users.edit', description: 'Can edit users' },
    }),
    prisma.permission.create({
      data: { name: 'users.delete', description: 'Can delete users' },
    }),
    prisma.permission.create({
      data: { name: 'departments.view', description: 'Can view departments' },
    }),
    prisma.permission.create({
      data: {
        name: 'departments.manage',
        description: 'Can manage departments',
      },
    }),
    prisma.permission.create({
      data: {
        name: 'production.view',
        description: 'Can view production data',
      },
    }),
    prisma.permission.create({
      data: { name: 'production.manage', description: 'Can manage production' },
    }),
    prisma.permission.create({
      data: { name: 'equipment.view', description: 'Can view equipment' },
    }),
    prisma.permission.create({
      data: { name: 'equipment.manage', description: 'Can manage equipment' },
    }),
    prisma.permission.create({
      data: { name: 'maintenance.log', description: 'Can log maintenance' },
    }),
    prisma.permission.create({
      data: { name: 'inventory.view', description: 'Can view inventory' },
    }),
    prisma.permission.create({
      data: { name: 'inventory.manage', description: 'Can manage inventory' },
    }),
    prisma.permission.create({
      data: { name: 'procurement.view', description: 'Can view procurement' },
    }),
    prisma.permission.create({
      data: {
        name: 'procurement.manage',
        description: 'Can manage procurement',
      },
    }),
    prisma.permission.create({
      data: { name: 'sales.view', description: 'Can view sales data' },
    }),
    prisma.permission.create({
      data: { name: 'sales.manage', description: 'Can manage sales' },
    }),
    prisma.permission.create({
      data: { name: 'finance.view', description: 'Can view financial data' },
    }),
    prisma.permission.create({
      data: { name: 'finance.manage', description: 'Can manage finances' },
    }),
    prisma.permission.create({
      data: { name: 'reports.view', description: 'Can view reports' },
    }),
    prisma.permission.create({
      data: { name: 'reports.generate', description: 'Can generate reports' },
    }),
  ]);

  console.log('Permissions created');

  // Create roles
  const roles = {
    admin: await prisma.role.create({
      data: {
        name: 'Admin',
        description: 'System administrator with full access',
        isDefault: false,
      },
    }),
    manager: await prisma.role.create({
      data: {
        name: 'Manager',
        description: 'Department manager with elevated privileges',
        isDefault: false,
      },
    }),
    operator: await prisma.role.create({
      data: {
        name: 'Operator',
        description: 'Equipment operator',
        isDefault: false,
      },
    }),
    maintenance: await prisma.role.create({
      data: {
        name: 'Maintenance',
        description: 'Maintenance personnel',
        isDefault: false,
      },
    }),
    finance: await prisma.role.create({
      data: {
        name: 'Finance',
        description: 'Finance and accounting personnel',
        isDefault: false,
      },
    }),
    sales: await prisma.role.create({
      data: {
        name: 'Sales',
        description: 'Sales personnel',
        isDefault: false,
      },
    }),
    procurement: await prisma.role.create({
      data: {
        name: 'Procurement',
        description: 'Procurement personnel',
        isDefault: false,
      },
    }),
    user: await prisma.role.create({
      data: {
        name: 'User',
        description: 'Basic user with limited access',
        isDefault: true,
      },
    }),
  };

  console.log('Roles created');

  // Assign permissions to roles
  // Admin - all permissions
  for (const permission of permissions) {
    await prisma.rolePermission.create({
      data: {
        roleId: roles.admin.id,
        permissionId: permission.id,
      },
    });
  }

  // Manager permissions
  const managerPermissions = [
    'users.view',
    'departments.view',
    'production.view',
    'production.manage',
    'equipment.view',
    'maintenance.log',
    'inventory.view',
    'procurement.view',
    'sales.view',
    'finance.view',
    'reports.view',
    'reports.generate',
  ];
  for (const permName of managerPermissions) {
    const perm = permissions.find((p) => p.name === permName);
    if (perm) {
      await prisma.rolePermission.create({
        data: {
          roleId: roles.manager.id,
          permissionId: perm.id,
        },
      });
    }
  }

  // Add permissions for other roles...
  // Operator permissions
  const operatorPermissions = [
    'equipment.view',
    'maintenance.log',
    'production.view',
  ];
  for (const permName of operatorPermissions) {
    const perm = permissions.find((p) => p.name === permName);
    if (perm) {
      await prisma.rolePermission.create({
        data: {
          roleId: roles.operator.id,
          permissionId: perm.id,
        },
      });
    }
  }

  // Maintenance permissions
  const maintenancePermissions = [
    'equipment.view',
    'equipment.manage',
    'maintenance.log',
  ];
  for (const permName of maintenancePermissions) {
    const perm = permissions.find((p) => p.name === permName);
    if (perm) {
      await prisma.rolePermission.create({
        data: {
          roleId: roles.maintenance.id,
          permissionId: perm.id,
        },
      });
    }
  }

  // Finance permissions
  const financePermissions = [
    'finance.view',
    'finance.manage',
    'reports.view',
    'reports.generate',
  ];
  for (const permName of financePermissions) {
    const perm = permissions.find((p) => p.name === permName);
    if (perm) {
      await prisma.rolePermission.create({
        data: {
          roleId: roles.finance.id,
          permissionId: perm.id,
        },
      });
    }
  }

  // Sales permissions
  const salesPermissions = [
    'sales.view',
    'sales.manage',
    'customers.view',
    'reports.view',
  ];
  for (const permName of salesPermissions) {
    const perm = permissions.find((p) => p.name === permName);
    if (perm) {
      await prisma.rolePermission.create({
        data: {
          roleId: roles.sales.id,
          permissionId: perm.id,
        },
      });
    }
  }

  // Procurement permissions
  const procurementPermissions = [
    'inventory.view',
    'inventory.manage',
    'procurement.view',
    'procurement.manage',
  ];
  for (const permName of procurementPermissions) {
    const perm = permissions.find((p) => p.name === permName);
    if (perm) {
      await prisma.rolePermission.create({
        data: {
          roleId: roles.procurement.id,
          permissionId: perm.id,
        },
      });
    }
  }

  // User role gets very basic permissions
  const userPermissions = ['departments.view', 'reports.view'];
  for (const permName of userPermissions) {
    const perm = permissions.find((p) => p.name === permName);
    if (perm) {
      await prisma.rolePermission.create({
        data: {
          roleId: roles.user.id,
          permissionId: perm.id,
        },
      });
    }
  }

  console.log('Role permissions assigned');

  // Create departments
  const departments = {
    executive: await prisma.department.create({
      data: {
        name: 'Executive Management',
        description: 'Company leadership and management',
      },
    }),
    production: await prisma.department.create({
      data: {
        name: 'Production',
        description: 'Manufacturing and production department',
      },
    }),
    maintenance: await prisma.department.create({
      data: {
        name: 'Maintenance',
        description: 'Equipment maintenance and repair',
        parentDepartmentId: null, // Will be updated after creation
      },
    }),
    finance: await prisma.department.create({
      data: {
        name: 'Finance',
        description: 'Financial management and accounting',
      },
    }),
    sales: await prisma.department.create({
      data: {
        name: 'Sales & Marketing',
        description: 'Sales and marketing activities',
      },
    }),
    procurement: await prisma.department.create({
      data: {
        name: 'Procurement',
        description: 'Purchasing and vendor management',
      },
    }),
    hr: await prisma.department.create({
      data: {
        name: 'Human Resources',
        description: 'Employee management and recruitment',
      },
    }),
    warehouse: await prisma.department.create({
      data: {
        name: 'Warehouse',
        description: 'Storage and inventory management',
        parentDepartmentId: null, // Will be updated after creation
      },
    }),
  };

  // Update parent department relationships
  await prisma.department.update({
    where: { id: departments.maintenance.id },
    data: { parentDepartmentId: departments.production.id },
  });

  await prisma.department.update({
    where: { id: departments.warehouse.id },
    data: { parentDepartmentId: departments.production.id },
  });

  console.log('Departments created');

  // Create users with hashed passwords
  const hashedPassword = await bcrypt.hash('Password123', 10);

  const users = {
    admin: await prisma.user.create({
      data: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'admin@example.com',
        password: hashedPassword,
        departmentId: departments.executive.id,
      },
    }),
    productionManager: await prisma.user.create({
      data: {
        firstName: 'Sarah',
        lastName: 'Kamya',
        email: 'sarah.kamya@example.com',
        password: hashedPassword,
        departmentId: departments.production.id,
      },
    }),
    maintenanceManager: await prisma.user.create({
      data: {
        firstName: 'David',
        lastName: 'Okello',
        email: 'david.okello@example.com',
        password: hashedPassword,
        departmentId: departments.maintenance.id,
      },
    }),
    maintenanceTech1: await prisma.user.create({
      data: {
        firstName: 'Robert',
        lastName: 'Bwire',
        email: 'robert.bwire@example.com',
        password: hashedPassword,
        departmentId: departments.maintenance.id,
      },
    }),
    maintenanceTech2: await prisma.user.create({
      data: {
        firstName: 'Agnes',
        lastName: 'Namuli',
        email: 'agnes.namuli@example.com',
        password: hashedPassword,
        departmentId: departments.maintenance.id,
      },
    }),
    financeManager: await prisma.user.create({
      data: {
        firstName: 'Mary',
        lastName: 'Nambooze',
        email: 'mary.nambooze@example.com',
        password: hashedPassword,
        departmentId: departments.finance.id,
      },
    }),
    accountant: await prisma.user.create({
      data: {
        firstName: 'Peter',
        lastName: 'Mutumba',
        email: 'peter.mutumba@example.com',
        password: hashedPassword,
        departmentId: departments.finance.id,
      },
    }),
    salesManager: await prisma.user.create({
      data: {
        firstName: 'Elizabeth',
        lastName: 'Nakimuli',
        email: 'elizabeth.nakimuli@example.com',
        password: hashedPassword,
        departmentId: departments.sales.id,
      },
    }),
    salesRep1: await prisma.user.create({
      data: {
        firstName: 'Henry',
        lastName: 'Mugisha',
        email: 'henry.mugisha@example.com',
        password: hashedPassword,
        departmentId: departments.sales.id,
      },
    }),
    salesRep2: await prisma.user.create({
      data: {
        firstName: 'Grace',
        lastName: 'Atuhaire',
        email: 'grace.atuhaire@example.com',
        password: hashedPassword,
        departmentId: departments.sales.id,
      },
    }),
    procurementManager: await prisma.user.create({
      data: {
        firstName: 'James',
        lastName: 'Kakooza',
        email: 'james.kakooza@example.com',
        password: hashedPassword,
        departmentId: departments.procurement.id,
      },
    }),
    procurementOfficer: await prisma.user.create({
      data: {
        firstName: 'Peace',
        lastName: 'Nandawula',
        email: 'peace.nandawula@example.com',
        password: hashedPassword,
        departmentId: departments.procurement.id,
      },
    }),
    hrManager: await prisma.user.create({
      data: {
        firstName: 'Martin',
        lastName: 'Ssempa',
        email: 'martin.ssempa@example.com',
        password: hashedPassword,
        departmentId: departments.hr.id,
      },
    }),
    warehouseManager: await prisma.user.create({
      data: {
        firstName: 'Frank',
        lastName: 'Tumusiime',
        email: 'frank.tumusiime@example.com',
        password: hashedPassword,
        departmentId: departments.warehouse.id,
      },
    }),
    operator1: await prisma.user.create({
      data: {
        firstName: 'Joseph',
        lastName: 'Kigozi',
        email: 'joseph.kigozi@example.com',
        password: hashedPassword,
        departmentId: departments.production.id,
      },
    }),
    operator2: await prisma.user.create({
      data: {
        firstName: 'Florence',
        lastName: 'Nabukenya',
        email: 'florence.nabukenya@example.com',
        password: hashedPassword,
        departmentId: departments.production.id,
      },
    }),
  };

  console.log('Users created');

  // Assign roles to users
  await prisma.userRole.create({
    data: { userId: users.admin.id, roleId: roles.admin.id },
  });
  await prisma.userRole.create({
    data: { userId: users.productionManager.id, roleId: roles.manager.id },
  });
  await prisma.userRole.create({
    data: { userId: users.maintenanceManager.id, roleId: roles.manager.id },
  });
  await prisma.userRole.create({
    data: { userId: users.maintenanceTech1.id, roleId: roles.maintenance.id },
  });
  await prisma.userRole.create({
    data: { userId: users.maintenanceTech2.id, roleId: roles.maintenance.id },
  });
  await prisma.userRole.create({
    data: { userId: users.financeManager.id, roleId: roles.manager.id },
  });
  await prisma.userRole.create({
    data: { userId: users.financeManager.id, roleId: roles.finance.id },
  });
  await prisma.userRole.create({
    data: { userId: users.accountant.id, roleId: roles.finance.id },
  });
  await prisma.userRole.create({
    data: { userId: users.salesManager.id, roleId: roles.manager.id },
  });
  await prisma.userRole.create({
    data: { userId: users.salesManager.id, roleId: roles.sales.id },
  });
  await prisma.userRole.create({
    data: { userId: users.salesRep1.id, roleId: roles.sales.id },
  });
  await prisma.userRole.create({
    data: { userId: users.salesRep2.id, roleId: roles.sales.id },
  });
  await prisma.userRole.create({
    data: { userId: users.procurementManager.id, roleId: roles.manager.id },
  });
  await prisma.userRole.create({
    data: { userId: users.procurementManager.id, roleId: roles.procurement.id },
  });
  await prisma.userRole.create({
    data: { userId: users.procurementOfficer.id, roleId: roles.procurement.id },
  });
  await prisma.userRole.create({
    data: { userId: users.hrManager.id, roleId: roles.manager.id },
  });
  await prisma.userRole.create({
    data: { userId: users.warehouseManager.id, roleId: roles.manager.id },
  });
  await prisma.userRole.create({
    data: { userId: users.operator1.id, roleId: roles.operator.id },
  });
  await prisma.userRole.create({
    data: { userId: users.operator2.id, roleId: roles.operator.id },
  });

  console.log('User roles assigned');

  // Create user activity logs
  const activityTypes = [
    'login',
    'view_dashboard',
    'edit_profile',
    'create_record',
    'edit_record',
    'delete_record',
  ];
  const userIds = Object.values(users).map((user) => user.id);

  // Generate 40-60 activity logs with realistic timestamps
  const numberOfLogs = Math.floor(Math.random() * 21) + 40; // 40-60 logs
  const now = new Date();
  const pastMonth = new Date(now);
  pastMonth.setMonth(now.getMonth() - 1);

  for (let i = 0; i < numberOfLogs; i++) {
    const randomUserId = userIds[Math.floor(Math.random() * userIds.length)];
    const randomActionType =
      activityTypes[Math.floor(Math.random() * activityTypes.length)];
    const randomTimestamp = new Date(
      pastMonth.getTime() +
        Math.random() * (now.getTime() - pastMonth.getTime())
    );

    // Adjust to East Africa Time (EAT is UTC+3)
    randomTimestamp.setHours(randomTimestamp.getHours() + 3);

    await prisma.userActivityLog.create({
      data: {
        userId: randomUserId,
        action: randomActionType,
        timestamp: randomTimestamp,
        details: { ip: '192.168.1.' + Math.floor(Math.random() * 255) },
      },
    });
  }

  console.log('User activity logs created');

  // Create products
  const products = {
    chair: await prisma.product.create({
      data: {
        name: 'Wooden Chair',
        description: 'Standard wooden chair for dining',
        productionCost: 75000, // 75,000 UGX
        salePrice: 150000, // 150,000 UGX
        category: 'Furniture',
      },
    }),
    table: await prisma.product.create({
      data: {
        name: 'Dining Table',
        description: 'Large wooden dining table',
        productionCost: 450000, // 450,000 UGX
        salePrice: 800000, // 800,000 UGX
        category: 'Furniture',
      },
    }),
    bed: await prisma.product.create({
      data: {
        name: 'Queen Size Bed',
        description: 'Queen size bed frame with headboard',
        productionCost: 650000, // 650,000 UGX
        salePrice: 1200000, // 1,200,000 UGX
        category: 'Furniture',
      },
    }),
    cabinet: await prisma.product.create({
      data: {
        name: 'Kitchen Cabinet',
        description: 'Standard kitchen cabinet unit',
        productionCost: 350000, // 350,000 UGX
        salePrice: 650000, // 650,000 UGX
        category: 'Furniture',
      },
    }),
    desk: await prisma.product.create({
      data: {
        name: 'Office Desk',
        description: 'Standard office desk with drawers',
        productionCost: 280000, // 280,000 UGX
        salePrice: 500000, // 500,000 UGX
        category: 'Office Furniture',
      },
    }),
    bookshelf: await prisma.product.create({
      data: {
        name: 'Bookshelf',
        description: 'Wooden bookshelf with 5 shelves',
        productionCost: 200000, // 200,000 UGX
        salePrice: 400000, // 400,000 UGX
        category: 'Furniture',
      },
    }),
  };

  console.log('Products created');

  // Create production orders
  // Helper function to add East Africa Time offset (+3 hours)
  const createEATDate = (year: number, month: number, day: number): Date => {
    const date = new Date(year, month - 1, day, 9, 0, 0); // 9 AM
    date.setHours(date.getHours() + 3); // Adjust to EAT (UTC+3)
    return date;
  };

  const productionOrders = [];

  // Past completed orders
  productionOrders.push(
    await prisma.productionOrder.create({
      data: {
        departmentId: departments.production.id,
        scheduledStartDate: createEATDate(2024, 12, 1),
        scheduledEndDate: createEATDate(2024, 12, 7),
        actualStartDate: createEATDate(2024, 12, 1),
        actualEndDate: createEATDate(2024, 12, 6),
        status: 'Completed',
        quantity: 20,
        productId: products.chair.id,
      },
    })
  );

  productionOrders.push(
    await prisma.productionOrder.create({
      data: {
        departmentId: departments.production.id,
        scheduledStartDate: createEATDate(2024, 12, 10),
        scheduledEndDate: createEATDate(2024, 12, 20),
        actualStartDate: createEATDate(2024, 12, 11),
        actualEndDate: createEATDate(2024, 12, 22),
        status: 'Completed',
        quantity: 5,
        productId: products.table.id,
      },
    })
  );

  // Current in-progress orders
  const today = new Date();
  today.setHours(today.getHours() + 3); // Adjust to EAT

  productionOrders.push(
    await prisma.productionOrder.create({
      data: {
        departmentId: departments.production.id,
        scheduledStartDate: createEATDate(2025, 2, 15),
        scheduledEndDate: createEATDate(2025, 2, 28),
        actualStartDate: createEATDate(2025, 2, 15),
        actualEndDate: null,
        status: 'In Progress',
        quantity: 3,
        productId: products.bed.id,
      },
    })
  );

  productionOrders.push(
    await prisma.productionOrder.create({
      data: {
        departmentId: departments.production.id,
        scheduledStartDate: createEATDate(2025, 2, 20),
        scheduledEndDate: createEATDate(2025, 3, 5),
        actualStartDate: createEATDate(2025, 2, 20),
        actualEndDate: null,
        status: 'In Progress',
        quantity: 8,
        productId: products.cabinet.id,
      },
    })
  );

  // Future scheduled orders
  productionOrders.push(
    await prisma.productionOrder.create({
      data: {
        departmentId: departments.production.id,
        scheduledStartDate: createEATDate(2025, 3, 10),
        scheduledEndDate: createEATDate(2025, 3, 20),
        actualStartDate: null,
        actualEndDate: null,
        status: 'Scheduled',
        quantity: 15,
        productId: products.desk.id,
      },
    })
  );

  productionOrders.push(
    await prisma.productionOrder.create({
      data: {
        departmentId: departments.production.id,
        scheduledStartDate: createEATDate(2025, 3, 20),
        scheduledEndDate: createEATDate(2025, 3, 30),
        actualStartDate: null,
        actualEndDate: null,
        status: 'Scheduled',
        quantity: 10,
        productId: products.bookshelf.id,
      },
    })
  );

  console.log('Production orders created');

  // Create equipment
  const equipment = {
    sawmill: await prisma.equipment.create({
      data: {
        name: 'Sawmill Machine',
        type: 'Cutting',
        description: 'Industrial sawmill for cutting lumber',
        departmentId: departments.production.id,
        maintenanceFrequency: 90, // Days between maintenance
      },
    }),
    planer: await prisma.equipment.create({
      data: {
        name: 'Wood Planer',
        type: 'Finishing',
        description: 'Industrial planer for smoothing wood surfaces',
        departmentId: departments.production.id,
        maintenanceFrequency: 60,
      },
    }),
    drill: await prisma.equipment.create({
      data: {
        name: 'Industrial Drill Press',
        type: 'Drilling',
        description: 'Heavy-duty drill press for precise holes',
        departmentId: departments.production.id,
        maintenanceFrequency: 45,
      },
    }),
    sander: await prisma.equipment.create({
      data: {
        name: 'Belt Sander',
        type: 'Finishing',
        description: 'Industrial belt sander for wood finishing',
        departmentId: departments.production.id,
        maintenanceFrequency: 30,
      },
    }),
    lathe: await prisma.equipment.create({
      data: {
        name: 'Wood Lathe',
        type: 'Shaping',
        description: 'Precision wood lathe for cylindrical shapes',
        departmentId: departments.production.id,
        maintenanceFrequency: 60,
      },
    }),
    forklift: await prisma.equipment.create({
      data: {
        name: 'Forklift',
        type: 'Material Handling',
        description: 'Heavy duty forklift for moving materials',
        departmentId: departments.warehouse.id,
        maintenanceFrequency: 90,
      },
    }),
  };

  console.log('Equipment created');

  // Create maintenance logs
  // Past maintenance
  await prisma.maintenanceLog.create({
    data: {
      equipmentId: equipment.sawmill.id,
      maintenanceDate: createEATDate(2024, 11, 15),
      description: 'Regular blade replacement and lubrication',
      performedBy: users.maintenanceTech1.id,
      status: 'Completed',
    },
  });

  await prisma.maintenanceLog.create({
    data: {
      equipmentId: equipment.planer.id,
      maintenanceDate: createEATDate(2024, 12, 5),
      description: 'Blade alignment and motor inspection',
      performedBy: users.maintenanceTech2.id,
      status: 'Completed',
    },
  });

  await prisma.maintenanceLog.create({
    data: {
      equipmentId: equipment.drill.id,
      maintenanceDate: createEATDate(2024, 12, 20),
      description: 'Bearing replacement and lubrication',
      performedBy: users.maintenanceTech1.id,
      status: 'Completed',
    },
  });

  await prisma.maintenanceLog.create({
    data: {
      equipmentId: equipment.forklift.id,
      maintenanceDate: createEATDate(2025, 1, 10),
      description: 'Hydraulic system maintenance and safety check',
      performedBy: users.maintenanceTech2.id,
      status: 'Completed',
    },
  });

  // Recent maintenance
  await prisma.maintenanceLog.create({
    data: {
      equipmentId: equipment.sander.id,
      maintenanceDate: createEATDate(2025, 2, 10),
      description: 'Belt replacement and motor inspection',
      performedBy: users.maintenanceTech1.id,
      status: 'Completed',
    },
  });

  // Scheduled maintenance
  await prisma.maintenanceLog.create({
    data: {
      equipmentId: equipment.lathe.id,
      maintenanceDate: createEATDate(2025, 3, 5),
      description: 'Scheduled maintenance and calibration',
      performedBy: null, // Not yet assigned
      status: 'Scheduled',
    },
  });

  await prisma.maintenanceLog.create({
    data: {
      equipmentId: equipment.sawmill.id,
      maintenanceDate: createEATDate(2025, 3, 15),
      description: 'Quarterly blade replacement and full inspection',
      performedBy: null, // Not yet assigned
      status: 'Scheduled',
    },
  });

  console.log('Maintenance logs created');

  // Create vendors
  const vendors = {
    timberSupplier: await prisma.vendor.create({
      data: {
        name: 'Kampala Timber Supply Ltd',
        contactEmail: 'info@kampalatimber.co.ug',
        contactPhone: '+256 414 555 123',
        address: 'Plot 45, Industrial Area, Kampala',
      },
    }),
    hardwareSupplier: await prisma.vendor.create({
      data: {
        name: 'Uganda Hardware Solutions',
        contactEmail: 'sales@ugandahardware.co.ug',
        contactPhone: '+256 414 666 789',
        address: 'Plot 78, Jinja Road, Kampala',
      },
    }),
    toolSupplier: await prisma.vendor.create({
      data: {
        name: 'Entebbe Tools & Equipment Ltd',
        contactEmail: 'orders@entebbetools.co.ug',
        contactPhone: '+256 414 777 456',
        address: 'Plot 22, Entebbe Road, Entebbe',
      },
    }),
    paintSupplier: await prisma.vendor.create({
      data: {
        name: 'Mukono Paints & Finishes',
        contactEmail: 'sales@mukonopaints.co.ug',
        contactPhone: '+256 414 888 234',
        address: 'Plot 56, Mukono Industrial Zone, Mukono',
      },
    }),
    transportCompany: await prisma.vendor.create({
      data: {
        name: 'Masaka Transport Services',
        contactEmail: 'logistics@masakatransport.co.ug',
        contactPhone: '+256 414 999 345',
        address: 'Plot 12, Masaka Road, Kampala',
      },
    }),
  };

  console.log('Vendors created');

  // Create inventory items
  const inventoryItems = {
    pine: await prisma.inventoryItem.create({
      data: {
        name: 'Pine Lumber',
        description: 'Standard pine lumber boards',
        quantity: 500,
        reorderLevel: 100,
        vendorId: vendors.timberSupplier.id,
        location: 'Warehouse A, Aisle 1',
      },
    }),
    oak: await prisma.inventoryItem.create({
      data: {
        name: 'Oak Lumber',
        description: 'Premium oak lumber boards',
        quantity: 250,
        reorderLevel: 50,
        vendorId: vendors.timberSupplier.id,
        location: 'Warehouse A, Aisle 2',
      },
    }),
    mahogany: await prisma.inventoryItem.create({
      data: {
        name: 'Mahogany',
        description: 'Premium mahogany wood',
        quantity: 75,
        reorderLevel: 25,
        vendorId: vendors.timberSupplier.id,
        location: 'Warehouse A, Aisle 3',
      },
    }),
    screws: await prisma.inventoryItem.create({
      data: {
        name: 'Wood Screws',
        description: 'Assorted wood screws (boxes)',
        quantity: 200,
        reorderLevel: 50,
        vendorId: vendors.hardwareSupplier.id,
        location: 'Warehouse B, Aisle 1',
      },
    }),
    nails: await prisma.inventoryItem.create({
      data: {
        name: 'Nails',
        description: 'Assorted nails (boxes)',
        quantity: 150,
        reorderLevel: 30,
        vendorId: vendors.hardwareSupplier.id,
        location: 'Warehouse B, Aisle 1',
      },
    }),
    hinges: await prisma.inventoryItem.create({
      data: {
        name: 'Door Hinges',
        description: 'Standard door hinges (pairs)',
        quantity: 100,
        reorderLevel: 25,
        vendorId: vendors.hardwareSupplier.id,
        location: 'Warehouse B, Aisle 2',
      },
    }),
    paint: await prisma.inventoryItem.create({
      data: {
        name: 'Wood Varnish',
        description: 'Clear wood varnish (5L cans)',
        quantity: 50,
        reorderLevel: 15,
        vendorId: vendors.paintSupplier.id,
        location: 'Warehouse C, Aisle 1',
      },
    }),
    stain: await prisma.inventoryItem.create({
      data: {
        name: 'Wood Stain',
        description: 'Dark oak wood stain (1L bottles)',
        quantity: 40,
        reorderLevel: 10,
        vendorId: vendors.paintSupplier.id,
        location: 'Warehouse C, Aisle 1',
      },
    }),
    sandpaper: await prisma.inventoryItem.create({
      data: {
        name: 'Sandpaper',
        description: 'Fine grit sandpaper (100 sheet packs)',
        quantity: 80,
        reorderLevel: 20,
        vendorId: vendors.toolSupplier.id,
        location: 'Warehouse B, Aisle 3',
      },
    }),
    drillBits: await prisma.inventoryItem.create({
      data: {
        name: 'Drill Bits',
        description: 'Assorted drill bit sets',
        quantity: 30,
        reorderLevel: 10,
        vendorId: vendors.toolSupplier.id,
        location: 'Warehouse B, Aisle 3',
      },
    }),
  };

  console.log('Inventory items created');

  // Create procurement orders
  // Completed procurement
  const completedProcurement = await prisma.procurementOrder.create({
    data: {
      vendorId: vendors.timberSupplier.id,
      orderDate: createEATDate(2024, 12, 10),
      status: 'Delivered',
      totalAmount: 5000000, // 5,000,000 UGX
    },
  });

  await prisma.procurementOrderItem.create({
    data: {
      procurementOrderId: completedProcurement.id,
      inventoryItemId: inventoryItems.pine.id,
      quantity: 100,
      unitPrice: 30000, // 30,000 UGX per unit
    },
  });

  await prisma.procurementOrderItem.create({
    data: {
      procurementOrderId: completedProcurement.id,
      inventoryItemId: inventoryItems.oak.id,
      quantity: 50,
      unitPrice: 50000, // 50,000 UGX per unit
    },
  });

  // In progress procurement
  const inProgressProcurement = await prisma.procurementOrder.create({
    data: {
      vendorId: vendors.hardwareSupplier.id,
      orderDate: createEATDate(2025, 2, 15),
      status: 'In Transit',
      totalAmount: 2500000, // 2,500,000 UGX
    },
  });

  await prisma.procurementOrderItem.create({
    data: {
      procurementOrderId: inProgressProcurement.id,
      inventoryItemId: inventoryItems.screws.id,
      quantity: 50,
      unitPrice: 20000, // 20,000 UGX per box
    },
  });

  await prisma.procurementOrderItem.create({
    data: {
      procurementOrderId: inProgressProcurement.id,
      inventoryItemId: inventoryItems.hinges.id,
      quantity: 30,
      unitPrice: 35000, // 35,000 UGX per pair
    },
  });

  // Pending procurement
  const pendingProcurement = await prisma.procurementOrder.create({
    data: {
      vendorId: vendors.paintSupplier.id,
      orderDate: createEATDate(2025, 2, 25),
      status: 'Ordered',
      totalAmount: 1800000, // 1,800,000 UGX
    },
  });

  await prisma.procurementOrderItem.create({
    data: {
      procurementOrderId: pendingProcurement.id,
      inventoryItemId: inventoryItems.paint.id,
      quantity: 20,
      unitPrice: 60000, // 60,000 UGX per can
    },
  });

  await prisma.procurementOrderItem.create({
    data: {
      procurementOrderId: pendingProcurement.id,
      inventoryItemId: inventoryItems.stain.id,
      quantity: 30,
      unitPrice: 20000, // 20,000 UGX per bottle
    },
  });

  console.log('Procurement orders created');

  // Create customers
  const customers = {
    hotel: await prisma.customer.create({
      data: {
        name: 'Kampala Grand Hotel',
        contactEmail: 'procurement@kampalagrand.co.ug',
        contactPhone: '+256 414 111 222',
        address: 'Plot 1, Nile Avenue, Kampala',
      },
    }),
    office: await prisma.customer.create({
      data: {
        name: 'Entebbe Business Center',
        contactEmail: 'office@entebbebc.co.ug',
        contactPhone: '+256 414 333 444',
        address: 'Plot 45, Airport Road, Entebbe',
      },
    }),
    school: await prisma.customer.create({
      data: {
        name: 'Jinja International School',
        contactEmail: 'procurement@jinjais.ac.ug',
        contactPhone: '+256 414 555 666',
        address: 'Plot 78, Main Street, Jinja',
      },
    }),
    restaurant: await prisma.customer.create({
      data: {
        name: 'Mukono Fine Dining',
        contactEmail: 'manager@mukonodining.co.ug',
        contactPhone: '+256 414 777 888',
        address: 'Plot 23, Mukono Town, Mukono',
      },
    }),
    retailer: await prisma.customer.create({
      data: {
        name: 'Mbale Furniture Emporium',
        contactEmail: 'orders@mbalefurniture.co.ug',
        contactPhone: '+256 414 999 000',
        address: 'Plot 12, Main Street, Mbale',
      },
    }),
  };

  console.log('Customers created');

  // Create sales orders
  // Completed sale
  const completedSale1 = await prisma.salesOrder.create({
    data: {
      customerId: customers.hotel.id,
      orderDate: createEATDate(2024, 12, 15),
      status: 'Delivered',
      totalAmount: 7500000, // 7,500,000 UGX
    },
  });

  await prisma.salesOrderItem.create({
    data: {
      salesOrderId: completedSale1.id,
      productId: products.chair.id,
      quantity: 50,
      unitPrice: 150000, // 150,000 UGX per chair
    },
  });

  const completedSale2 = await prisma.salesOrder.create({
    data: {
      customerId: customers.office.id,
      orderDate: createEATDate(2025, 1, 10),
      status: 'Delivered',
      totalAmount: 5000000, // 5,000,000 UGX
    },
  });

  await prisma.salesOrderItem.create({
    data: {
      salesOrderId: completedSale2.id,
      productId: products.desk.id,
      quantity: 10,
      unitPrice: 500000, // 500,000 UGX per desk
    },
  });

  // In progress sale
  const inProgressSale = await prisma.salesOrder.create({
    data: {
      customerId: customers.school.id,
      orderDate: createEATDate(2025, 2, 18),
      status: 'In Production',
      totalAmount: 4800000, // 4,800,000 UGX
    },
  });

  await prisma.salesOrderItem.create({
    data: {
      salesOrderId: inProgressSale.id,
      productId: products.chair.id,
      quantity: 20,
      unitPrice: 150000, // 150,000 UGX per chair
    },
  });

  await prisma.salesOrderItem.create({
    data: {
      salesOrderId: inProgressSale.id,
      productId: products.desk.id,
      quantity: 3,
      unitPrice: 500000, // 500,000 UGX per desk
    },
  });

  // New sale
  const newSale = await prisma.salesOrder.create({
    data: {
      customerId: customers.retailer.id,
      orderDate: createEATDate(2025, 2, 25),
      status: 'Ordered',
      totalAmount: 4000000, // 4,000,000 UGX
    },
  });

  await prisma.salesOrderItem.create({
    data: {
      salesOrderId: newSale.id,
      productId: products.bookshelf.id,
      quantity: 10,
      unitPrice: 400000, // 400,000 UGX per bookshelf
    },
  });

  console.log('Sales orders created');

  // Create financial transactions
  // Expense transactions
  await prisma.financialTransaction.create({
    data: {
      transactionDate: createEATDate(2024, 12, 1),
      description: 'Monthly payroll',
      transactionType: 'Expense',
      amount: 25000000, // 25,000,000 UGX
      departmentId: departments.finance.id,
    },
  });

  await prisma.financialTransaction.create({
    data: {
      transactionDate: createEATDate(2024, 12, 5),
      description: 'Utility bills payment',
      transactionType: 'Expense',
      amount: 3500000, // 3,500,000 UGX
      departmentId: departments.finance.id,
    },
  });

  await prisma.financialTransaction.create({
    data: {
      transactionDate: createEATDate(2024, 12, 10),
      description: 'Raw materials procurement',
      transactionType: 'Expense',
      amount: 5000000, // 5,000,000 UGX
      departmentId: departments.procurement.id,
    },
  });

  // Revenue transactions
  await prisma.financialTransaction.create({
    data: {
      transactionDate: createEATDate(2024, 12, 15),
      description: 'Hotel furniture order payment',
      transactionType: 'Revenue',
      amount: 7500000, // 7,500,000 UGX
      departmentId: departments.sales.id,
    },
  });

  await prisma.financialTransaction.create({
    data: {
      transactionDate: createEATDate(2025, 1, 10),
      description: 'Office furniture order payment',
      transactionType: 'Revenue',
      amount: 5000000, // 5,000,000 UGX
      departmentId: departments.sales.id,
    },
  });

  // Recent transactions
  await prisma.financialTransaction.create({
    data: {
      transactionDate: createEATDate(2025, 1, 1),
      description: 'Monthly payroll',
      transactionType: 'Expense',
      amount: 25000000, // 25,000,000 UGX
      departmentId: departments.finance.id,
    },
  });

  await prisma.financialTransaction.create({
    data: {
      transactionDate: createEATDate(2025, 1, 5),
      description: 'Utility bills payment',
      transactionType: 'Expense',
      amount: 3600000, // 3,600,000 UGX
      departmentId: departments.finance.id,
    },
  });

  await prisma.financialTransaction.create({
    data: {
      transactionDate: createEATDate(2025, 2, 1),
      description: 'Monthly payroll',
      transactionType: 'Expense',
      amount: 25000000, // 25,000,000 UGX
      departmentId: departments.finance.id,
    },
  });

  await prisma.financialTransaction.create({
    data: {
      transactionDate: createEATDate(2025, 2, 5),
      description: 'Utility bills payment',
      transactionType: 'Expense',
      amount: 3700000, // 3,700,000 UGX
      departmentId: departments.finance.id,
    },
  });

  await prisma.financialTransaction.create({
    data: {
      transactionDate: createEATDate(2025, 2, 15),
      description: 'Hardware supplies procurement',
      transactionType: 'Expense',
      amount: 2500000, // 2,500,000 UGX
      departmentId: departments.procurement.id,
    },
  });

  await prisma.financialTransaction.create({
    data: {
      transactionDate: createEATDate(2025, 2, 18),
      description: 'School furniture order deposit',
      transactionType: 'Revenue',
      amount: 2400000, // 2,400,000 UGX
      departmentId: departments.sales.id,
    },
  });

  console.log('Financial transactions created');

  // Create department budgets
  // Previous year budgets (2024)
  for (const dept of Object.values(departments)) {
    // Set different budget amounts based on department
    let allocatedBudget = 0;
    let spentBudget = 0;

    switch (dept.name) {
      case 'Executive Management':
        allocatedBudget = 100000000; // 100,000,000 UGX
        spentBudget = 95000000; // 95,000,000 UGX
        break;
      case 'Production':
        allocatedBudget = 250000000; // 250,000,000 UGX
        spentBudget = 245000000; // 245,000,000 UGX
        break;
      case 'Maintenance':
        allocatedBudget = 50000000; // 50,000,000 UGX
        spentBudget = 48000000; // 48,000,000 UGX
        break;
      case 'Finance':
        allocatedBudget = 80000000; // 80,000,000 UGX
        spentBudget = 78000000; // 78,000,000 UGX
        break;
      case 'Sales & Marketing':
        allocatedBudget = 150000000; // 150,000,000 UGX
        spentBudget = 145000000; // 145,000,000 UGX
        break;
      case 'Procurement':
        allocatedBudget = 400000000; // 400,000,000 UGX
        spentBudget = 395000000; // 395,000,000 UGX
        break;
      case 'Human Resources':
        allocatedBudget = 70000000; // 70,000,000 UGX
        spentBudget = 68000000; // 68,000,000 UGX
        break;
      case 'Warehouse':
        allocatedBudget = 40000000; // 40,000,000 UGX
        spentBudget = 38000000; // 38,000,000 UGX
        break;
      default:
        allocatedBudget = 50000000; // 50,000,000 UGX
        spentBudget = 45000000; // 45,000,000 UGX
    }

    await prisma.budget.create({
      data: {
        departmentId: dept.id,
        year: 2024,
        allocatedBudget,
        spentBudget,
      },
    });
  }

  // Current year budgets (2025)
  for (const dept of Object.values(departments)) {
    // Set different budget amounts based on department with 5-10% increase from previous year
    let allocatedBudget = 0;
    let spentBudget = 0; // Partial spending as it's only February 2025

    switch (dept.name) {
      case 'Executive Management':
        allocatedBudget = 110000000; // 110,000,000 UGX
        spentBudget = 15000000; // 15,000,000 UGX
        break;
      case 'Production':
        allocatedBudget = 270000000; // 270,000,000 UGX
        spentBudget = 45000000; // 45,000,000 UGX
        break;
      case 'Maintenance':
        allocatedBudget = 55000000; // 55,000,000 UGX
        spentBudget = 8000000; // 8,000,000 UGX
        break;
      case 'Finance':
        allocatedBudget = 85000000; // 85,000,000 UGX
        spentBudget = 15000000; // 15,000,000 UGX
        break;
      case 'Sales & Marketing':
        allocatedBudget = 160000000; // 160,000,000 UGX
        spentBudget = 25000000; // 25,000,000 UGX
        break;
      case 'Procurement':
        allocatedBudget = 420000000; // 420,000,000 UGX
        spentBudget = 70000000; // 70,000,000 UGX
        break;
      case 'Human Resources':
        allocatedBudget = 75000000; // 75,000,000 UGX
        spentBudget = 12000000; // 12,000,000 UGX
        break;
      case 'Warehouse':
        allocatedBudget = 44000000; // 44,000,000 UGX
        spentBudget = 7000000; // 7,000,000 UGX
        break;
      default:
        allocatedBudget = 55000000; // 55,000,000 UGX
        spentBudget = 8000000; // 8,000,000 UGX
    }

    await prisma.budget.create({
      data: {
        departmentId: dept.id,
        year: 2025,
        allocatedBudget,
        spentBudget,
      },
    });
  }

  console.log('Department budgets created');

  console.log('Seed data creation completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error in seed script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
