export interface RegisterInput {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    departmentId?: number;
}

export interface LoginInput {
    email: string;
    password: string;
}

export interface ResetPasswordInput {
    oldPassword: string;
    newPassword: string;
}
