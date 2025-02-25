import {
  PrismaClient,
  Role,
  Department,
  User,
  UserRole,
  Equipment,
  MaintenanceLog,
  Product,
  ProductionOrder as PrismaProductionOrder,
  Vendor,
  InventoryItem,
  ProcurementOrder,
  Customer,
  SalesOrder,
  FinancialTransaction,
  Budget,
  UserActivityLog,
} from '@prisma/client';
import bcrypt from 'bcrypt';

// Initiate Prisma Client
const prisma = new PrismaClient();

// Utility function for Ugandan date-time (East Africa Time - EAT, UTC+3)
const ugandasDateTime = (dateString: string | Date = new Date()): Date => {
  // Create date with Uganda time zone considerations (UTC+3)
  const date = new Date(dateString);
  // No need to adjust for time zone in the seed script as the database will store in UTC
  // and your application can handle the conversion to EAT when displaying
  return date;
};

type CreateMaintenanceLog = {
  equipmentId: number;
  maintenanceDate: Date;
  description: string;
  performedBy: number | null;
  status: string;
};

interface ProductionOrder {
  departmentId: number; // Changed from string | number to just number
  scheduledStartDate: Date;
  scheduledEndDate: Date;
  actualStartDate: Date | null;
  actualEndDate: Date | null;
  status: string;
  quantity: number;
  productId: number; // Assuming this should also be a number based on Prisma schema
}

// Main seed function
async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await clearDatabase();

  // Create seed data in the correct order to satisfy foreign key constraints
  const roles = await seedRoles();
  const departments = await seedDepartments();
  const users = await seedUsers();
  const userRoles = await linkUserRoles(users, roles);
  const equipment = await seedEquipment(departments);
  const maintenanceLogs = await seedMaintenanceLogs(equipment, users);
  const products = await seedProducts();
  const productionOrders = await seedProductionOrders(departments, products);
  const vendors = await seedVendors();
  const inventoryItems = await seedInventoryItems(vendors);
  const procurementOrders = await seedProcurementOrders(
    vendors,
    inventoryItems
  );
  const customers = await seedCustomers();
  const salesOrders = await seedSalesOrders(customers, products);
  const financialTransactions = await seedFinancialTransactions(departments);
  const budgets = await seedBudgets(departments);
  const userActivityLogs = await seedUserActivityLogs(users);

  console.log('Database seeding completed successfully!');
}

// Function to clear the database before seeding
async function clearDatabase() {
  const tablesToClear = [
    'UserActivityLog',
    'Budget',
    'FinancialTransaction',
    'SalesOrderItem',
    'SalesOrder',
    'Customer',
    'ProcurementOrderItem',
    'ProcurementOrder',
    'InventoryItem',
    'Vendor',
    'ProductionOrder',
    'Product',
    'MaintenanceLog',
    'Equipment',
    'UserRole',
    'User',
    'Department',
    'Role',
  ];

  for (const table of tablesToClear) {
    await prisma.$executeRawUnsafe(`DELETE FROM \`${table}\`;`);
    console.log(`Cleared ${table} table`);
  }
}

// Seed Roles
async function seedRoles() {
  const roles = [
    {
      name: 'Administrator',
      description: 'System administrator with full access',
    },
    {
      name: 'Manager',
      description: 'Department manager with approval capabilities',
    },
    { name: 'Technician', description: 'Maintenance and equipment specialist' },
    { name: 'Operator', description: 'Equipment and production line operator' },
    { name: 'Accountant', description: 'Financial records manager' },
    { name: 'HR', description: 'Human resources staff' },
    {
      name: 'Procurement',
      description: 'Responsible for ordering supplies and materials',
    },
    { name: 'Sales', description: 'Sales and customer relationship staff' },
  ];

  const createdRoles: Role[] = [];
  for (const role of roles) {
    const createdRole = await prisma.role.create({ data: role });
    createdRoles.push(createdRole);
    console.log(`Created role: ${role.name}`);
  }

  return createdRoles;
}

// Seed Departments
async function seedDepartments() {
  const createdParents: Department[] = [];
  const createdChildren: Department[] = [];
  // First create parent departments
  const parentDepartments = [
    { name: 'Executive', description: 'Executive leadership team' },
    { name: 'Operations', description: 'Core business operations' },
    {
      name: 'Administration',
      description: 'Business administration and support',
    },
  ];

  for (const dept of parentDepartments) {
    const createdDept = await prisma.department.create({
      data: {
        name: dept.name,
        description: dept.description,
        createdAt: ugandasDateTime('2023-01-01'),
        updatedAt: ugandasDateTime('2023-01-01'),
      },
    });
    createdParents.push(createdDept);
    console.log(`Created parent department: ${dept.name}`);
  }

  // Then create child departments with parent references
  const childDepartments = [
    {
      name: 'Production',
      description: 'Manufacturing and assembly',
      parentName: 'Operations',
    },
    {
      name: 'Maintenance',
      description: 'Equipment upkeep and repair',
      parentName: 'Operations',
    },
    {
      name: 'Quality Control',
      description: 'Product quality assurance',
      parentName: 'Operations',
    },
    {
      name: 'Logistics',
      description: 'Material handling and transportation',
      parentName: 'Operations',
    },
    {
      name: 'Finance',
      description: 'Financial management and reporting',
      parentName: 'Administration',
    },
    {
      name: 'Human Resources',
      description: 'Personnel management and recruitment',
      parentName: 'Administration',
    },
    {
      name: 'Procurement',
      description: 'Purchasing and vendor management',
      parentName: 'Administration',
    },
    {
      name: 'Sales & Marketing',
      description: 'Customer acquisition and retention',
      parentName: 'Administration',
    },
    {
      name: 'Research & Development',
      description: 'New product development',
      parentName: 'Operations',
    },
  ];

  for (const dept of childDepartments) {
    const parent = createdParents.find((p) => p.name === dept.parentName);

    if (parent) {
      const createdDept = await prisma.department.create({
        data: {
          name: dept.name,
          description: dept.description,
          parentDepartmentId: parent.id,
          createdAt: ugandasDateTime('2023-01-15'),
          updatedAt: ugandasDateTime('2023-01-15'),
        },
      });
      createdChildren.push(createdDept);
      console.log(
        `Created child department: ${dept.name} under ${parent.name}`
      );
    }
  }

  return [...createdParents, ...createdChildren];
}

// Seed Users
async function seedUsers() {
  // Get department IDs first
  const departments = await prisma.department.findMany();

  // Create 30 users across departments
  const users = [
    // Executive team
    {
      firstName: 'John',
      lastName: 'Mukasa',
      email: 'john.mukasa@company.ug',
      password: await bcrypt.hash('password123', 10),
      departmentId: departments.find((d) => d.name === 'Executive')?.id,
    },
    {
      firstName: 'Sarah',
      lastName: 'Namugwanya',
      email: 'sarah.namugwanya@company.ug',
      password: await bcrypt.hash('password123', 10),
      departmentId: departments.find((d) => d.name === 'Executive')?.id,
    },

    // Production team
    {
      firstName: 'David',
      lastName: 'Ochieng',
      email: 'david.ochieng@company.ug',
      password: await bcrypt.hash('password123', 10),
      departmentId: departments.find((d) => d.name === 'Production')?.id,
    },
    {
      firstName: 'Mary',
      lastName: 'Nakimuli',
      email: 'mary.nakimuli@company.ug',
      password: await bcrypt.hash('password123', 10),
      departmentId: departments.find((d) => d.name === 'Production')?.id,
    },
    {
      firstName: 'Peter',
      lastName: 'Mutesasira',
      email: 'peter.mutesasira@company.ug',
      password: await bcrypt.hash('password123', 10),
      departmentId: departments.find((d) => d.name === 'Production')?.id,
    },

    // Maintenance team
    {
      firstName: 'Robert',
      lastName: 'Odongo',
      email: 'robert.odongo@company.ug',
      password: await bcrypt.hash('password123', 10),
      departmentId: departments.find((d) => d.name === 'Maintenance')?.id,
    },
    {
      firstName: 'Janet',
      lastName: 'Nabukenya',
      email: 'janet.nabukenya@company.ug',
      password: await bcrypt.hash('password123', 10),
      departmentId: departments.find((d) => d.name === 'Maintenance')?.id,
    },

    // Finance team
    {
      firstName: 'Timothy',
      lastName: 'Katumba',
      email: 'timothy.katumba@company.ug',
      password: await bcrypt.hash('password123', 10),
      departmentId: departments.find((d) => d.name === 'Finance')?.id,
    },
    {
      firstName: 'Grace',
      lastName: 'Kisakye',
      email: 'grace.kisakye@company.ug',
      password: await bcrypt.hash('password123', 10),
      departmentId: departments.find((d) => d.name === 'Finance')?.id,
    },

    // HR team
    {
      firstName: 'Michael',
      lastName: 'Ssemakula',
      email: 'michael.ssemakula@company.ug',
      password: await bcrypt.hash('password123', 10),
      departmentId: departments.find((d) => d.name === 'Human Resources')?.id,
    },
    {
      firstName: 'Florence',
      lastName: 'Nagawa',
      email: 'florence.nagawa@company.ug',
      password: await bcrypt.hash('password123', 10),
      departmentId: departments.find((d) => d.name === 'Human Resources')?.id,
    },

    // Procurement team
    {
      firstName: 'Joseph',
      lastName: 'Okello',
      email: 'joseph.okello@company.ug',
      password: await bcrypt.hash('password123', 10),
      departmentId: departments.find((d) => d.name === 'Procurement')?.id,
    },
    {
      firstName: 'Betty',
      lastName: 'Nassali',
      email: 'betty.nassali@company.ug',
      password: await bcrypt.hash('password123', 10),
      departmentId: departments.find((d) => d.name === 'Procurement')?.id,
    },

    // Sales team
    {
      firstName: 'Richard',
      lastName: 'Mugisha',
      email: 'richard.mugisha@company.ug',
      password: await bcrypt.hash('password123', 10),
      departmentId: departments.find((d) => d.name === 'Sales & Marketing')?.id,
    },
    {
      firstName: 'Esther',
      lastName: 'Nakitto',
      email: 'esther.nakitto@company.ug',
      password: await bcrypt.hash('password123', 10),
      departmentId: departments.find((d) => d.name === 'Sales & Marketing')?.id,
    },

    // Quality Control team
    {
      firstName: 'Henry',
      lastName: 'Walusimbi',
      email: 'henry.walusimbi@company.ug',
      password: await bcrypt.hash('password123', 10),
      departmentId: departments.find((d) => d.name === 'Quality Control')?.id,
    },
    {
      firstName: 'Irene',
      lastName: 'Namboze',
      email: 'irene.namboze@company.ug',
      password: await bcrypt.hash('password123', 10),
      departmentId: departments.find((d) => d.name === 'Quality Control')?.id,
    },

    // Logistics team
    {
      firstName: 'Patrick',
      lastName: 'Mulondo',
      email: 'patrick.mulondo@company.ug',
      password: await bcrypt.hash('password123', 10),
      departmentId: departments.find((d) => d.name === 'Logistics')?.id,
    },
    {
      firstName: 'Catherine',
      lastName: 'Atuhaire',
      email: 'catherine.atuhaire@company.ug',
      password: await bcrypt.hash('password123', 10),
      departmentId: departments.find((d) => d.name === 'Logistics')?.id,
    },

    // R&D team
    {
      firstName: 'Simon',
      lastName: 'Nsubuga',
      email: 'simon.nsubuga@company.ug',
      password: await bcrypt.hash('password123', 10),
      departmentId: departments.find((d) => d.name === 'Research & Development')
        ?.id,
    },
    {
      firstName: 'Rebecca',
      lastName: 'Nambogo',
      email: 'rebecca.nambogo@company.ug',
      password: await bcrypt.hash('password123', 10),
      departmentId: departments.find((d) => d.name === 'Research & Development')
        ?.id,
    },
  ];

  const createdUsers: User[] = [];
  for (const user of users) {
    const createdUser = await prisma.user.create({
      data: {
        ...user,
        createdAt: ugandasDateTime('2023-02-01'),
        updatedAt: ugandasDateTime('2023-02-01'),
      },
    });
    createdUsers.push(createdUser);
    console.log(`Created user: ${user.firstName} ${user.lastName}`);
  }

  return createdUsers;
}

// Link Users to Roles
async function linkUserRoles(users, roles) {
  const userRoleAssignments = [
    // Executive
    { email: 'john.mukasa@company.ug', roleName: 'Administrator' },
    { email: 'sarah.namugwanya@company.ug', roleName: 'Manager' },

    // Production
    { email: 'david.ochieng@company.ug', roleName: 'Manager' },
    { email: 'mary.nakimuli@company.ug', roleName: 'Operator' },
    { email: 'peter.mutesasira@company.ug', roleName: 'Operator' },

    // Maintenance
    { email: 'robert.odongo@company.ug', roleName: 'Manager' },
    { email: 'robert.odongo@company.ug', roleName: 'Technician' },
    { email: 'janet.nabukenya@company.ug', roleName: 'Technician' },

    // Finance
    { email: 'timothy.katumba@company.ug', roleName: 'Manager' },
    { email: 'timothy.katumba@company.ug', roleName: 'Accountant' },
    { email: 'grace.kisakye@company.ug', roleName: 'Accountant' },

    // HR
    { email: 'michael.ssemakula@company.ug', roleName: 'Manager' },
    { email: 'michael.ssemakula@company.ug', roleName: 'HR' },
    { email: 'florence.nagawa@company.ug', roleName: 'HR' },

    // Procurement
    { email: 'joseph.okello@company.ug', roleName: 'Manager' },
    { email: 'joseph.okello@company.ug', roleName: 'Procurement' },
    { email: 'betty.nassali@company.ug', roleName: 'Procurement' },

    // Sales
    { email: 'richard.mugisha@company.ug', roleName: 'Manager' },
    { email: 'richard.mugisha@company.ug', roleName: 'Sales' },
    { email: 'esther.nakitto@company.ug', roleName: 'Sales' },

    // Quality Control
    { email: 'henry.walusimbi@company.ug', roleName: 'Manager' },
    { email: 'irene.namboze@company.ug', roleName: 'Operator' },

    // Logistics
    { email: 'patrick.mulondo@company.ug', roleName: 'Manager' },
    { email: 'catherine.atuhaire@company.ug', roleName: 'Operator' },

    // R&D
    { email: 'simon.nsubuga@company.ug', roleName: 'Manager' },
    { email: 'rebecca.nambogo@company.ug', roleName: 'Operator' },
  ];

  const createdUserRoles: UserRole[] = [];
  for (const assignment of userRoleAssignments) {
    const user = users.find((u) => u.email === assignment.email);
    const role = roles.find((r) => r.name === assignment.roleName);

    if (user && role) {
      const userRole = await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: role.id,
        },
      });
      createdUserRoles.push(userRole);
      console.log(`Assigned role ${role.name} to ${user.email}`);
    }
  }

  return createdUserRoles;
}

// Seed Equipment
async function seedEquipment(departments) {
  const maintenanceDeptId = departments.find(
    (d) => d.name === 'Maintenance'
  )?.id;
  const productionDeptId = departments.find((d) => d.name === 'Production')?.id;
  const qualityDeptId = departments.find(
    (d) => d.name === 'Quality Control'
  )?.id;
  const logisticsDeptId = departments.find((d) => d.name === 'Logistics')?.id;
  const rdDeptId = departments.find(
    (d) => d.name === 'Research & Development'
  )?.id;

  const equipmentData = [
    {
      name: 'Conveyor Belt A',
      type: 'Transport',
      description: 'Main assembly line conveyor belt',
      departmentId: productionDeptId,
      maintenanceFrequency: 30, // days
    },
    {
      name: 'Hydraulic Press #1',
      type: 'Manufacturing',
      description: '20-ton hydraulic press for component forming',
      departmentId: productionDeptId,
      maintenanceFrequency: 45, // days
    },
    {
      name: 'CNC Machine #1',
      type: 'Manufacturing',
      description: 'Computer numerical control machine for precision cutting',
      departmentId: productionDeptId,
      maintenanceFrequency: 60, // days
    },
    {
      name: 'Welding Robot',
      type: 'Manufacturing',
      description: 'Automated welding system for assembly',
      departmentId: productionDeptId,
      maintenanceFrequency: 30, // days
    },
    {
      name: 'Packaging Machine',
      type: 'Packaging',
      description: 'Automated packaging system for finished products',
      departmentId: productionDeptId,
      maintenanceFrequency: 45, // days
    },
    {
      name: 'Quality Inspection Camera',
      type: 'Quality Control',
      description: 'High-resolution inspection system for defect detection',
      departmentId: qualityDeptId,
      maintenanceFrequency: 90, // days
    },
    {
      name: 'Material Testing Equipment',
      type: 'Quality Control',
      description: 'Stress and durability testing apparatus',
      departmentId: qualityDeptId,
      maintenanceFrequency: 180, // days
    },
    {
      name: 'Forklift #1',
      type: 'Transport',
      description: '3-ton capacity forklift for warehouse operations',
      departmentId: logisticsDeptId,
      maintenanceFrequency: 60, // days
    },
    {
      name: 'Forklift #2',
      type: 'Transport',
      description: '2-ton capacity forklift for warehouse operations',
      departmentId: logisticsDeptId,
      maintenanceFrequency: 60, // days
    },
    {
      name: 'Conveyor Belt B',
      type: 'Transport',
      description: 'Secondary assembly line conveyor belt',
      departmentId: productionDeptId,
      maintenanceFrequency: 30, // days
    },
    {
      name: 'Laboratory Equipment Suite',
      type: 'Research',
      description: 'Combined analytical instrumentation for product testing',
      departmentId: rdDeptId,
      maintenanceFrequency: 90, // days
    },
    {
      name: 'Prototype 3D Printer',
      type: 'Prototyping',
      description: 'Industrial 3D printer for rapid prototyping',
      departmentId: rdDeptId,
      maintenanceFrequency: 45, // days
    },
  ];

  const createdEquipment: Equipment[] = [];
  for (const equipment of equipmentData) {
    const created = await prisma.equipment.create({
      data: equipment,
    });
    createdEquipment.push(created);
    console.log(`Created equipment: ${equipment.name}`);
  }

  return createdEquipment;
}

// Seed Maintenance Logs
async function seedMaintenanceLogs(equipment, users) {
  // Find maintenance users
  const maintenanceUsers = users.filter(
    (user) =>
      user.email === 'robert.odongo@company.ug' ||
      user.email === 'janet.nabukenya@company.ug'
  );

  const logs: CreateMaintenanceLog[] = [];

  // Generate maintenance logs for the past year
  for (const equip of equipment) {
    const frequency = equip.maintenanceFrequency || 30; // Default to 30 days if not specified
    const today = new Date();
    const numLogs = Math.ceil(365 / frequency); // Roughly a year's worth of logs

    for (let i = 0; i < numLogs; i++) {
      const logDate = new Date(today);
      logDate.setDate(today.getDate() - i * frequency);

      // Randomly select a maintenance user
      const randomUserIndex = Math.floor(
        Math.random() * maintenanceUsers.length
      );
      const maintainer = maintenanceUsers[randomUserIndex];

      const statuses = ['Completed', 'Scheduled', 'In Progress', 'Delayed'];
      const randomStatusIndex =
        Math.random() < 0.8 ? 0 : Math.floor(Math.random() * 3) + 1; // 80% completed, 20% other statuses

      logs.push({
        equipmentId: equip.id,
        maintenanceDate: ugandasDateTime(logDate),
        description: `Routine ${frequency}-day maintenance check for ${equip.name}`,
        performedBy: maintainer.id,
        status: statuses[randomStatusIndex],
      });
    }
  }

  const createdLogs: MaintenanceLog[] = [];
  for (const log of logs) {
    const created = await prisma.maintenanceLog.create({
      data: log,
    });
    createdLogs.push(created);
  }

  console.log(`Created ${createdLogs.length} maintenance logs`);
  return createdLogs;
}

// Seed Products
async function seedProducts() {
  const products = [
    {
      name: 'Basic Chair',
      description: 'Standard office chair with basic features',
      productionCost: 7500000, // 75,000 UGX (in cents)
      salePrice: 12000000, // 120,000 UGX (in cents)
      category: 'Office Furniture',
    },
    {
      name: 'Executive Chair',
      description: 'Premium office chair with ergonomic features',
      productionCost: 15000000, // 150,000 UGX (in cents)
      salePrice: 28000000, // 280,000 UGX (in cents)
      category: 'Office Furniture',
    },
    {
      name: 'Standard Desk',
      description: 'Basic office desk with drawers',
      productionCost: 18000000, // 180,000 UGX (in cents)
      salePrice: 30000000, // 300,000 UGX (in cents)
      category: 'Office Furniture',
    },
    {
      name: 'Executive Desk',
      description: 'Premium office desk with spacious workspace',
      productionCost: 35000000, // 350,000 UGX (in cents)
      salePrice: 60000000, // 600,000 UGX (in cents)
      category: 'Office Furniture',
    },
    {
      name: 'Filing Cabinet',
      description: 'Standard metal filing cabinet with 3 drawers',
      productionCost: 12000000, // 120,000 UGX (in cents)
      salePrice: 22000000, // 220,000 UGX (in cents)
      category: 'Office Storage',
    },
    {
      name: 'Bookshelf',
      description: 'Wooden bookshelf with 5 shelves',
      productionCost: 16000000, // 160,000 UGX (in cents)
      salePrice: 27000000, // 270,000 UGX (in cents)
      category: 'Office Storage',
    },
    {
      name: 'Conference Table',
      description: 'Large oval conference table for meetings',
      productionCost: 45000000, // 450,000 UGX (in cents)
      salePrice: 75000000, // 750,000 UGX (in cents)
      category: 'Conference Furniture',
    },
    {
      name: 'Waiting Room Chair',
      description: 'Comfortable chair for reception areas',
      productionCost: 8000000, // 80,000 UGX (in cents)
      salePrice: 13500000, // 135,000 UGX (in cents)
      category: 'Reception Furniture',
    },
    {
      name: 'Reception Desk',
      description: 'Professional front desk for reception areas',
      productionCost: 32000000, // 320,000 UGX (in cents)
      salePrice: 55000000, // 550,000 UGX (in cents)
      category: 'Reception Furniture',
    },
    {
      name: 'Cubicle Partition',
      description: 'Office divider for creating workspace privacy',
      productionCost: 9000000, // 90,000 UGX (in cents)
      salePrice: 15000000, // 150,000 UGX (in cents)
      category: 'Office Accessories',
    },
  ];

  const createdProducts: Product[] = [];
  for (const product of products) {
    const created = await prisma.product.create({
      data: product,
    });
    createdProducts.push(created);
    console.log(`Created product: ${product.name}`);
  }

  return createdProducts;
}

// Seed Production Orders
async function seedProductionOrders(departments, products) {
  const productionDeptId = Number(
    departments.find((d) => d.name === 'Production')?.id
  );

  // Add validation to ensure we have a valid department ID
  if (isNaN(productionDeptId)) {
    throw new Error('Production department not found or invalid ID');
  }

  const statuses = [
    'Planned',
    'In Progress',
    'Completed',
    'Delayed',
    'Cancelled',
  ];
  const orders: ProductionOrder[] = [];

  // Generate production orders for the past 6 months and upcoming 2 months
  for (let i = 0; i < products.length; i++) {
    // Generate 2-4 orders per product
    const numberOfOrders = Math.floor(Math.random() * 3) + 2;

    for (let j = 0; j < numberOfOrders; j++) {
      // Random date between 6 months ago and 2 months in the future
      const today = new Date();
      const randomStartOffset = Math.floor(Math.random() * 240) - 180; // -180 to 60 days

      const startDate = new Date(today);
      startDate.setDate(today.getDate() + randomStartOffset);

      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + Math.floor(Math.random() * 14) + 7); // 7-21 days production time

      // Modify the variable declarations to allow both Date and null
      let actualStartDate: Date | null = null;
      let actualEndDate: Date | null = null;

      // Determine status based on start date
      let status;

      if (startDate > today) {
        status = 'Planned';
      } else if (endDate > today) {
        status = 'In Progress';
        actualStartDate = startDate;
      } else {
        // Historical order
        const randomStatus = Math.random();
        if (randomStatus < 0.8) {
          status = 'Completed';
          actualStartDate = startDate;
          actualEndDate = endDate;
        } else if (randomStatus < 0.95) {
          status = 'Delayed';
          actualStartDate = startDate;
        } else {
          status = 'Cancelled';
        }
      }

      // Random quantity between 10 and 100
      const quantity = Math.floor(Math.random() * 91) + 10;

      orders.push({
        departmentId: productionDeptId,
        scheduledStartDate: ugandasDateTime(startDate),
        scheduledEndDate: ugandasDateTime(endDate),
        actualStartDate: actualStartDate
          ? ugandasDateTime(actualStartDate)
          : null,
        actualEndDate: actualEndDate ? ugandasDateTime(actualEndDate) : null,
        status,
        quantity,
        productId: Number(products[i].id), // Convert to number if needed
      });
    }
  }

  const createdOrders: PrismaProductionOrder[] = [];
  for (const order of orders) {
    const created = await prisma.productionOrder.create({
      data: order,
    });
    createdOrders.push(created);
  }

  console.log(`Created ${createdOrders.length} production orders`);
  return createdOrders;
}

// Seed Vendors (completing the function)
async function seedVendors() {
  const vendors = [
    {
      name: 'Kampala Wood Suppliers Ltd',
      contactEmail: 'info@kampalawoodsuppliers.co.ug',
      contactPhone: '+256712345678',
      address: '123 Industrial Area, Kampala, Uganda',
    },
    {
      name: 'East African Metals',
      contactEmail: 'sales@eastafricanmetals.co.ug',
      contactPhone: '+256723456789',
      address: '45 Jinja Road, Kampala, Uganda',
    },
    {
      name: 'Uganda Fabric Distributors',
      contactEmail: 'orders@ugandafabric.co.ug',
      contactPhone: '+256734567890',
      address: '78 Entebbe Road, Kampala, Uganda',
    },
    {
      name: 'Modern Office Supplies',
      contactEmail: 'support@modernoffice.co.ug',
      contactPhone: '+256745678901',
      address: '32 Parliament Avenue, Kampala, Uganda',
    },
    {
      name: 'Jinja Industrial Materials',
      contactEmail: 'sales@jinjaindustrial.co.ug',
      contactPhone: '+256756789012',
      address: '15 Main Street, Jinja, Uganda',
    },
    {
      name: 'Entebbe Hardware Components',
      contactEmail: 'info@entebbehardware.co.ug',
      contactPhone: '+256767890123',
      address: '56 Airport Road, Entebbe, Uganda',
    },
    {
      name: 'Mbarara Tool Distributors',
      contactEmail: 'orders@mbararatools.co.ug',
      contactPhone: '+256778901234',
      address: '89 High Street, Mbarara, Uganda',
    },
  ];

  const createdVendors: Vendor[] = [];
  for (const vendor of vendors) {
    const created = await prisma.vendor.create({
      data: vendor,
    });
    createdVendors.push(created);
    console.log(`Created vendor: ${vendor.name}`);
  }

  return createdVendors;
}

// Seed Inventory Items
async function seedInventoryItems(vendors) {
  const inventoryItems = [
    {
      name: 'Hardwood Timber',
      description: 'High-quality hardwood for furniture manufacturing',
      quantity: 350,
      reorderLevel: 100,
      vendorId: vendors.find((v) => v.name === 'Kampala Wood Suppliers Ltd')
        ?.id,
      location: 'Warehouse A, Section 1',
    },
    {
      name: 'Softwood Timber',
      description: 'Softwood panels for non-load bearing elements',
      quantity: 420,
      reorderLevel: 150,
      vendorId: vendors.find((v) => v.name === 'Kampala Wood Suppliers Ltd')
        ?.id,
      location: 'Warehouse A, Section 2',
    },
    {
      name: 'Steel Tubing',
      description: 'Steel tubes for chair and table frames',
      quantity: 580,
      reorderLevel: 200,
      vendorId: vendors.find((v) => v.name === 'East African Metals')?.id,
      location: 'Warehouse B, Section 1',
    },
    {
      name: 'Aluminum Sheets',
      description: 'Aluminum sheets for lightweight components',
      quantity: 320,
      reorderLevel: 100,
      vendorId: vendors.find((v) => v.name === 'East African Metals')?.id,
      location: 'Warehouse B, Section 2',
    },
    {
      name: 'Upholstery Fabric',
      description: 'Durable fabric for chair and sofa upholstery',
      quantity: 1200, // in meters
      reorderLevel: 400,
      vendorId: vendors.find((v) => v.name === 'Uganda Fabric Distributors')
        ?.id,
      location: 'Warehouse C, Section 1',
    },
    {
      name: 'Leather Material',
      description: 'Premium leather for executive chair upholstery',
      quantity: 380, // in square meters
      reorderLevel: 100,
      vendorId: vendors.find((v) => v.name === 'Uganda Fabric Distributors')
        ?.id,
      location: 'Warehouse C, Section 2',
    },
    {
      name: 'Office Chair Wheels',
      description: 'Standard 5-wheel set for office chairs',
      quantity: 2500, // sets
      reorderLevel: 500,
      vendorId: vendors.find((v) => v.name === 'Modern Office Supplies')?.id,
      location: 'Warehouse D, Section 1',
    },
    {
      name: 'Desk Drawer Handles',
      description: 'Metal handles for desk and cabinet drawers',
      quantity: 1800,
      reorderLevel: 400,
      vendorId: vendors.find((v) => v.name === 'Modern Office Supplies')?.id,
      location: 'Warehouse D, Section 2',
    },
    {
      name: 'Wood Screws',
      description: 'Various sizes of wood screws for assembly',
      quantity: 8500,
      reorderLevel: 2000,
      vendorId: vendors.find((v) => v.name === 'Jinja Industrial Materials')
        ?.id,
      location: 'Warehouse E, Section 1',
    },
    {
      name: 'Metal Bolts',
      description: 'Metal bolts and nuts for structural connections',
      quantity: 7200,
      reorderLevel: 1500,
      vendorId: vendors.find((v) => v.name === 'Jinja Industrial Materials')
        ?.id,
      location: 'Warehouse E, Section 2',
    },
    {
      name: 'Hydraulic Lifts',
      description: 'Hydraulic mechanisms for adjustable chairs',
      quantity: 950,
      reorderLevel: 300,
      vendorId: vendors.find((v) => v.name === 'Entebbe Hardware Components')
        ?.id,
      location: 'Warehouse F, Section 1',
    },
    {
      name: 'Desk Laminates',
      description: 'Surface laminates for desk tops',
      quantity: 680,
      reorderLevel: 250,
      vendorId: vendors.find((v) => v.name === 'Entebbe Hardware Components')
        ?.id,
      location: 'Warehouse F, Section 2',
    },
    {
      name: 'Drawer Slides',
      description: 'Metal slides for smooth drawer operation',
      quantity: 1250,
      reorderLevel: 350,
      vendorId: vendors.find((v) => v.name === 'Mbarara Tool Distributors')?.id,
      location: 'Warehouse G, Section 1',
    },
    {
      name: 'Wood Finish',
      description: 'Varnish and paint for wood finishing',
      quantity: 430, // in liters
      reorderLevel: 120,
      vendorId: vendors.find((v) => v.name === 'Mbarara Tool Distributors')?.id,
      location: 'Warehouse G, Section 2',
    },
  ];

  const createdItems: InventoryItem[] = [];
  for (const item of inventoryItems) {
    const created = await prisma.inventoryItem.create({
      data: item,
    });
    createdItems.push(created);
    console.log(`Created inventory item: ${item.name}`);
  }

  return createdItems;
}

// Seed Procurement Orders
async function seedProcurementOrders(vendors, inventoryItems) {
  const procurementOrders: ProcurementOrder[] = [];
  const orderStatuses = [
    'Pending',
    'Approved',
    'Shipped',
    'Delivered',
    'Cancelled',
  ];

  // Generate 20 procurement orders from the past year
  for (let i = 0; i < 20; i++) {
    // Random date within the past year
    const today = new Date();
    const randomDaysAgo = Math.floor(Math.random() * 365);
    const orderDate = new Date(today);
    orderDate.setDate(today.getDate() - randomDaysAgo);

    // Select random vendor
    const randomVendorIndex = Math.floor(Math.random() * vendors.length);
    const vendor = vendors[randomVendorIndex];

    // Determine status based on order date
    let status;
    if (randomDaysAgo < 7) {
      // Recent orders more likely to be pending
      status = Math.random() < 0.6 ? 'Pending' : 'Approved';
    } else if (randomDaysAgo < 14) {
      // Orders from 1-2 weeks ago likely shipped or approved
      status = Math.random() < 0.7 ? 'Shipped' : 'Approved';
    } else if (randomDaysAgo < 30) {
      // Orders from 2-4 weeks ago likely delivered or shipped
      status = Math.random() < 0.8 ? 'Delivered' : 'Shipped';
    } else {
      // Older orders mostly delivered with some cancelled
      status = Math.random() < 0.9 ? 'Delivered' : 'Cancelled';
    }

    // Create order with no items yet (will add items after creating the order)
    const order = await prisma.procurementOrder.create({
      data: {
        vendorId: vendor.id,
        orderDate: ugandasDateTime(orderDate),
        status,
        totalAmount: 0, // Will calculate this after adding items
      },
    });

    // Get inventory items relevant to this vendor
    const vendorItems = inventoryItems.filter(
      (item) => item.vendorId === vendor.id
    );

    // Determine number of items to order (1-5)
    const numItems = Math.floor(Math.random() * 5) + 1;
    let orderTotal = 0;

    // Add items to the order
    for (let j = 0; j < numItems && j < vendorItems.length; j++) {
      const item = vendorItems[j];
      const quantity = Math.floor(Math.random() * 50) + 10; // Order 10-60 units
      const unitPrice = Math.floor(Math.random() * 5000000) + 1000000; // 10,000 - 60,000 UGX (in cents)
      const itemTotal = quantity * unitPrice;
      orderTotal += itemTotal;

      await prisma.procurementOrderItem.create({
        data: {
          procurementOrderId: order.id,
          inventoryItemId: item.id,
          quantity,
          unitPrice,
        },
      });
    }

    // Update the order total
    await prisma.procurementOrder.update({
      where: { id: order.id },
      data: { totalAmount: orderTotal },
    });

    procurementOrders.push(order);
    console.log(`Created procurement order #${order.id} for ${vendor.name}`);
  }

  return procurementOrders;
}

// Seed Customers
async function seedCustomers() {
  const customers = [
    {
      name: 'Kampala City Council',
      contactEmail: 'procurement@kcc.go.ug',
      contactPhone: '+256789012345',
      address: '1 City Hall Avenue, Kampala, Uganda',
    },
    {
      name: 'Uganda National Bank',
      contactEmail: 'facilities@unb.co.ug',
      contactPhone: '+256790123456',
      address: '25 Bank Road, Kampala, Uganda',
    },
    {
      name: 'East African University',
      contactEmail: 'purchasing@eau.ac.ug',
      contactPhone: '+256701234567',
      address: '55 Education Drive, Kampala, Uganda',
    },
    {
      name: 'Mbale Regional Hospital',
      contactEmail: 'admin@mbalehospital.org.ug',
      contactPhone: '+256712345678',
      address: '10 Health Street, Mbale, Uganda',
    },
    {
      name: 'Mbarara Technology Park',
      contactEmail: 'office@mtp.co.ug',
      contactPhone: '+256723456789',
      address: '78 Innovation Avenue, Mbarara, Uganda',
    },
    {
      name: 'Entebbe International Airport Authority',
      contactEmail: 'procurement@eiaa.go.ug',
      contactPhone: '+256734567890',
      address: '1 Airport Road, Entebbe, Uganda',
    },
    {
      name: 'Uganda Broadcasting Corporation',
      contactEmail: 'facilities@ubc.ug',
      contactPhone: '+256745678901',
      address: '32 Media Circle, Kampala, Uganda',
    },
    {
      name: 'Fort Portal Municipal Council',
      contactEmail: 'admin@fortportal.go.ug',
      contactPhone: '+256756789012',
      address: '15 Government Road, Fort Portal, Uganda',
    },
    {
      name: 'Gulu University',
      contactEmail: 'procurement@gulu.ac.ug',
      contactPhone: '+256767890123',
      address: '45 University Road, Gulu, Uganda',
    },
    {
      name: 'Jinja Steel Corporation',
      contactEmail: 'office@jinjasteel.co.ug',
      contactPhone: '+256778901234',
      address: '88 Industrial Zone, Jinja, Uganda',
    },
  ];

  const createdCustomers: Customer[] = [];
  for (const customer of customers) {
    const created = await prisma.customer.create({
      data: customer,
    });
    createdCustomers.push(created);
    console.log(`Created customer: ${customer.name}`);
  }

  return createdCustomers;
}

// Seed Sales Orders
async function seedSalesOrders(customers, products) {
  const salesOrders: SalesOrder[] = [];
  const orderStatuses = [
    'Pending',
    'Processing',
    'Shipped',
    'Delivered',
    'Cancelled',
  ];

  // Create 2-5 orders for each customer
  for (const customer of customers) {
    const numOrders = Math.floor(Math.random() * 4) + 2; // 2-5 orders per customer

    for (let i = 0; i < numOrders; i++) {
      // Random date within the past year
      const today = new Date();
      const randomDaysAgo = Math.floor(Math.random() * 365);
      const orderDate = new Date(today);
      orderDate.setDate(today.getDate() - randomDaysAgo);

      // Determine status based on order date
      let status;
      if (randomDaysAgo < 7) {
        // Recent orders more likely to be pending/processing
        status = Math.random() < 0.7 ? 'Pending' : 'Processing';
      } else if (randomDaysAgo < 21) {
        // Orders from 1-3 weeks ago likely processing/shipped
        status = Math.random() < 0.6 ? 'Processing' : 'Shipped';
      } else if (randomDaysAgo < 45) {
        // Orders from 3-6 weeks ago likely shipped/delivered
        status = Math.random() < 0.7 ? 'Shipped' : 'Delivered';
      } else {
        // Older orders mostly delivered with some cancelled
        status = Math.random() < 0.95 ? 'Delivered' : 'Cancelled';
      }

      // Create order with no items yet
      const order = await prisma.salesOrder.create({
        data: {
          customerId: customer.id,
          orderDate: ugandasDateTime(orderDate),
          status,
          totalAmount: 0, // Will calculate after adding items
        },
      });

      // Determine number of products to order (1-5)
      const numItems = Math.floor(Math.random() * 5) + 1;
      let orderTotal = 0;

      // Randomly select unique products
      const shuffledProducts = [...products].sort(() => 0.5 - Math.random());
      const selectedProducts = shuffledProducts.slice(0, numItems);

      // Add products to the order
      for (const product of selectedProducts) {
        const quantity = Math.floor(Math.random() * 20) + 1; // Order 1-20 units
        const unitPrice = product.salePrice; // Use product's defined sale price
        const itemTotal = quantity * unitPrice;
        orderTotal += itemTotal;

        await prisma.salesOrderItem.create({
          data: {
            salesOrderId: order.id,
            productId: product.id,
            quantity,
            unitPrice,
          },
        });
      }

      // Update the order total
      await prisma.salesOrder.update({
        where: { id: order.id },
        data: { totalAmount: orderTotal },
      });

      salesOrders.push(order);
      console.log(`Created sales order #${order.id} for ${customer.name}`);
    }
  }

  return salesOrders;
}

// Seed Financial Transactions
async function seedFinancialTransactions(departments) {
  const transactionTypes = [
    'Income',
    'Expense',
    'Salary',
    'Procurement',
    'Sales',
    'Utilities',
    'Maintenance',
    'Other',
  ];
  const transactions: FinancialTransaction[] = [];

  // Create transactions for the past 12 months
  const today = new Date();
  for (let month = 0; month < 12; month++) {
    // For each month, create 10-20 transactions
    const numTransactions = Math.floor(Math.random() * 11) + 10; // 10-20 transactions

    for (let i = 0; i < numTransactions; i++) {
      // Random date within the current month
      const transactionDate = new Date(
        today.getFullYear(),
        today.getMonth() - month,
        Math.floor(Math.random() * 28) + 1
      );

      // Random department
      const randomDeptIndex = Math.floor(Math.random() * departments.length);
      const department = departments[randomDeptIndex];

      // Random transaction type
      const randomTypeIndex = Math.floor(
        Math.random() * transactionTypes.length
      );
      const transactionType = transactionTypes[randomTypeIndex];

      // Transaction amount based on type (in cents)
      let amount;
      let description;

      switch (transactionType) {
        case 'Income':
          amount = Math.floor(Math.random() * 5000000000) + 10000000; // 100K - 50M UGX
          description = `Revenue from ${['contract services', 'product sales', 'consulting', 'government project'][Math.floor(Math.random() * 4)]}`;
          break;
        case 'Expense':
          amount = -(Math.floor(Math.random() * 500000000) + 1000000); // 10K - 5M UGX
          description = `General expenses for ${department.name}`;
          break;
        case 'Salary':
          amount = -(Math.floor(Math.random() * 2000000000) + 5000000); // 50K - 20M UGX
          description = `Salary payments for ${department.name} staff`;
          break;
        case 'Procurement':
          amount = -(Math.floor(Math.random() * 1000000000) + 3000000); // 30K - 10M UGX
          description = `Procurement of materials for ${department.name}`;
          break;
        case 'Sales':
          amount = Math.floor(Math.random() * 3000000000) + 5000000; // 50K - 30M UGX
          description = `Sales revenue from ${department.name}`;
          break;
        case 'Utilities':
          amount = -(Math.floor(Math.random() * 200000000) + 1000000); // 10K - 2M UGX
          description = `Utility payments for ${department.name}`;
          break;
        case 'Maintenance':
          amount = -(Math.floor(Math.random() * 500000000) + 2000000); // 20K - 5M UGX
          description = `Equipment maintenance for ${department.name}`;
          break;
        default:
          amount =
            (Math.random() < 0.6 ? -1 : 1) *
            (Math.floor(Math.random() * 300000000) + 1000000); // 10K - 3M UGX
          description = `Miscellaneous ${amount > 0 ? 'income' : 'expense'} for ${department.name}`;
      }

      const transaction = await prisma.financialTransaction.create({
        data: {
          transactionDate: ugandasDateTime(transactionDate),
          description,
          transactionType,
          amount,
          departmentId: department.id,
        },
      });

      transactions.push(transaction);
    }
  }

  console.log(`Created ${transactions.length} financial transactions`);
  return transactions;
}

// Seed Budgets
async function seedBudgets(departments) {
  const budgets: Budget[] = [];
  const currentYear = new Date().getFullYear();

  // Create budgets for current year and past year for each department
  for (const department of departments) {
    for (const year of [currentYear - 1, currentYear]) {
      // Allocated budget varies by department type and size
      let allocatedBudget;

      if (department.name === 'Executive') {
        allocatedBudget = 15000000000; // 150M UGX
      } else if (
        department.name === 'Operations' ||
        department.name === 'Administration'
      ) {
        allocatedBudget = 10000000000; // 100M UGX
      } else if (
        ['Production', 'Sales & Marketing', 'Finance'].includes(department.name)
      ) {
        allocatedBudget = 7500000000; // 75M UGX
      } else if (
        ['Research & Development', 'Maintenance', 'Procurement'].includes(
          department.name
        )
      ) {
        allocatedBudget = 5000000000; // 50M UGX
      } else {
        allocatedBudget = 3000000000; // 30M UGX
      }

      // For last year, calculate spent budget (75-100% of allocated)
      // For current year, calculate spent budget based on current month (proportional)
      let spentBudget;
      if (year === currentYear - 1) {
        // Last year's budget (75-100% spent)
        const spentPercentage = Math.random() * 0.25 + 0.75; // 75-100%
        spentBudget = Math.floor(allocatedBudget * spentPercentage);
      } else {
        // Current year's budget (spent proportional to current month)
        const currentMonth = new Date().getMonth() + 1; // 1-12
        const basePercentage = currentMonth / 12; // Proportional to year progress
        const variancePercentage = Math.random() * 0.2 - 0.1; // +/- 10% variance
        const spentPercentage = Math.max(
          0,
          Math.min(1, basePercentage + variancePercentage)
        );
        spentBudget = Math.floor(allocatedBudget * spentPercentage);
      }

      const budget = await prisma.budget.create({
        data: {
          departmentId: department.id,
          year,
          allocatedBudget,
          spentBudget,
        },
      });

      budgets.push(budget);
      console.log(`Created budget for ${department.name} for year ${year}`);
    }
  }

  return budgets;
}

// Seed User Activity Logs
async function seedUserActivityLogs(users) {
  const actionTypes = [
    'Login',
    'Logout',
    'View Record',
    'Create Record',
    'Update Record',
    'Delete Record',
    'Export Data',
    'Generate Report',
    'Change Password',
    'Access Dashboard',
  ];

  const entities = [
    'User',
    'Department',
    'Equipment',
    'MaintenanceLog',
    'Product',
    'ProductionOrder',
    'Inventory',
    'Vendor',
    'ProcurementOrder',
    'Customer',
    'SalesOrder',
    'FinancialTransaction',
    'Budget',
  ];

  const logs: UserActivityLog[] = [];

  // Generate 1000 activity logs
  for (let i = 0; i < 1000; i++) {
    // Random user
    const randomUserIndex = Math.floor(Math.random() * users.length);
    const user = users[randomUserIndex];

    // Random timestamp within the past 90 days
    const today = new Date();
    const randomHoursAgo = Math.floor(Math.random() * 24 * 90); // 0-90 days in hours
    const timestamp = new Date(today);
    timestamp.setHours(timestamp.getHours() - randomHoursAgo);

    // Random action
    const randomActionIndex = Math.floor(Math.random() * actionTypes.length);
    const action = actionTypes[randomActionIndex];

    // Details object varies by action
    let details: any = {};

    if (action === 'Login' || action === 'Logout') {
      details = {
        ipAddress: `192.168.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`,
        browser: ['Chrome', 'Firefox', 'Safari', 'Edge'][
          Math.floor(Math.random() * 4)
        ],
        successful: Math.random() < 0.95, // 95% successful
      };
    } else if (
      [
        'View Record',
        'Create Record',
        'Update Record',
        'Delete Record',
      ].includes(action)
    ) {
      const entity = entities[Math.floor(Math.random() * entities.length)];
      const recordId = Math.floor(Math.random() * 100) + 1;

      details = {
        entity,
        recordId,
        changes:
          action === 'Update Record'
            ? {
                fieldName: ['name', 'description', 'status', 'quantity'][
                  Math.floor(Math.random() * 4)
                ],
                oldValue: 'Previous value',
                newValue: 'New value',
              }
            : undefined,
      };
    } else if (action === 'Export Data' || action === 'Generate Report') {
      details = {
        dataType: entities[Math.floor(Math.random() * entities.length)],
        format: ['PDF', 'Excel', 'CSV', 'JSON'][Math.floor(Math.random() * 4)],
        recordCount: Math.floor(Math.random() * 1000) + 10,
      };
    } else if (action === 'Change Password') {
      details = {
        successful: true,
        ipAddress: `192.168.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`,
      };
    } else if (action === 'Access Dashboard') {
      details = {
        dashboard: ['Executive', 'Operations', 'Sales', 'Finance', 'Inventory'][
          Math.floor(Math.random() * 5)
        ],
        duration: Math.floor(Math.random() * 30) + 1, // 1-30 minutes
      };
    }

    const log = await prisma.userActivityLog.create({
      data: {
        userId: user.id,
        action,
        timestamp: ugandasDateTime(timestamp),
        details,
      },
    });

    logs.push(log);
  }

  console.log(`Created ${logs.length} user activity logs`);
  return logs;
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });