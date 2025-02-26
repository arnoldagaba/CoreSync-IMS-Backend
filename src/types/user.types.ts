export interface User {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    departmentId: number | null;
    createdAt: Date;
    updatedAt: Date;
    roles?: Role[];
    department?: Department;
}

export interface Role {
    id: number;
    name: string;
    description: string | null;
}

export interface Department {
    id: number;
    name: string;
    description: string | null;
    parentDepartmentId: number | null;
    createdAt: Date;
    updatedAt: Date;
    parent?: Department;
    children?: Department[];
}

// For API responses
export interface AuthResponse {
    user: User;
    token: string;
}