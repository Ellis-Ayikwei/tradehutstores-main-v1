import axiosInstance from './axiosInstance';

// =================== TYPES AND INTERFACES ===================

export interface Permission {
    id: number;
    name: string;
    codename: string;
    content_type: {
        id: number;
        model: string;
        app_label: string;
    };
}

export interface Group {
    id: number;
    name: string;
    user_count?: number;
    permission_count?: number;
}

export interface GroupDetail extends Group {
    users: UserBasic[];
    permissions: Permission[];
}

export interface UserBasic {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    user_type: 'customer' | 'provider' | 'admin';
    account_status: 'active' | 'pending' | 'suspended' | 'inactive';
}

export interface UserWithGroups extends UserBasic {
    groups: Group[];
    user_permissions: Permission[];
    is_staff: boolean;
    is_superuser: boolean;
    profile_picture?: string;
    phone_number?: string;
    rating?: number;
    last_active?: string;
    date_joined: string;
}

export interface GroupOperationResponse {
    status: string;
    added_users?: string[];
    removed_users?: string[];
    groups_added?: string[];
    groups_removed?: string[];
    permission_count?: number;
    users_affected?: number;
    groups_affected?: number;
}

export interface UserPermissionsData {
    user: {
        id: string;
        email: string;
        user_type: string;
    };
    groups: Array<{
        id: number;
        name: string;
        permissions: Permission[];
    }>;
    individual_permissions: Permission[];
    all_permissions: Array<Permission & { source: 'group' | 'individual' }>;
}

export interface BulkUserGroupData {
    user_ids: string[];
    group_ids?: number[];
}

export interface AssignUserToGroupsData {
    user_id: string;
    group_ids: number[];
}

export interface PermissionsByContentType {
    [contentType: string]: Permission[];
}

// User Management Interfaces
export interface AdminUserData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password?: string;
    employeeId: string;
    department: string;
    position: string;
    dateOfBirth: string;
    address: {
        street: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
    };
    emergencyContact: {
        name: string;
        phone: string;
        relationship: string;
    };
    permissions: {
        roles: number[];
        groups: number[];
        customPermissions: number[];
    };
    accountSettings: {
        isSuperuser: boolean;
        isStaff: boolean;
        isActive: boolean;
        mustChangePassword: boolean;
        twoFactorAuth: boolean;
    };
    workSchedule: {
        workingHours: string;
        timeZone: string;
        workDays: string[];
    };
    notes: string;
    status: 'active' | 'pending' | 'suspended' | 'inactive';
    verificationStatus: 'verified' | 'unverified' | 'pending' | 'rejected';
}

export interface UserResponse {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    user_type: string;
    account_status: string;
    is_staff: boolean;
    is_superuser: boolean;
    date_joined: string;
    last_login?: string;
}

// =================== API ENDPOINTS ===================

const ENDPOINTS = {
    // Groups - Updated to match Django routes
    GROUPS: 'groups/',
    GROUP_DETAIL: (id: number) => `groups/${id}/`,
    GROUP_ADD_USERS: (id: number) => `groups/${id}/add_users/`,
    GROUP_REMOVE_USERS: (id: number) => `groups/${id}/remove_users/`,
    GROUP_UPDATE_PERMISSIONS: (id: number) => `groups/${id}/update_permissions/`,
    GROUP_AVAILABLE_USERS: (id: number) => `groups/${id}/available_users/`,

    // Permissions - Updated to match Django routes
    PERMISSIONS: 'permissions/',
    PERMISSIONS_BY_CONTENT_TYPE: 'permissions/by_content_type/',

    // User Management - Updated to match Django routes
    USERS: 'users/',
    USER_DETAIL: (id: string) => `users/${id}/`,
    CREATE_ADMIN: 'users/create_admin/',
    USERS_WITH_GROUPS: 'user-groups/users_with_groups/',
    BULK_ADD_TO_GROUPS: 'user-groups/bulk_add_to_groups/',
    BULK_REMOVE_FROM_GROUPS: 'user-groups/bulk_remove_from_groups/',
    ASSIGN_USER_TO_GROUPS: 'user-groups/assign_user_to_groups/',

    // User Permissions - Updated to match Django routes
    USER_GROUPS_PERMISSIONS: (userId: string) => `users/${userId}/groups_and_permissions/`,
    USER_UPDATE_GROUPS: (userId: string) => `users/${userId}/update_groups/`,
    USER_ADD_TO_GROUPS: (userId: string) => `users/${userId}/add_to_groups/`,
    USER_REMOVE_FROM_GROUPS: (userId: string) => `users/${userId}/remove_from_groups/`,
    USER_UPDATE_PERMISSIONS: (userId: string) => `users/${userId}/update_permissions/`,
    USER_ACTIVATE: (userId: string) => `users/${userId}/activate/`,
    USER_DEACTIVATE: (userId: string) => `users/${userId}/deactivate/`,
};

// =================== GROUP MANAGEMENT ===================

class GroupService {
    /**
     * Get all groups with optional search filtering
     */
    async getGroups(search?: string): Promise<Group[]> {
        try {
            const params = search ? { search } : {};
            const response = await axiosInstance.get(ENDPOINTS.GROUPS, { params });
            return response.data.results || response.data;
        } catch (error) {
            console.error('Error fetching groups:', error);
            throw new Error('Failed to fetch groups');
        }
    }

    /**
     * Get detailed information about a specific group
     */
    async getGroupDetail(groupId: number): Promise<GroupDetail> {
        try {
            const response = await axiosInstance.get(ENDPOINTS.GROUP_DETAIL(groupId));
            return response.data;
        } catch (error) {
            console.error('Error fetching group detail:', error);
            throw new Error('Failed to fetch group details');
        }
    }

    /**
     * Create a new group
     */
    async createGroup(name: string): Promise<Group> {
        try {
            const response = await axiosInstance.post(ENDPOINTS.GROUPS, { name });
            return response.data;
        } catch (error) {
            console.error('Error creating group:', error);
            throw new Error('Failed to create group');
        }
    }

    /**
     * Update a group's name
     */
    async updateGroup(groupId: number, name: string): Promise<Group> {
        try {
            const response = await axiosInstance.patch(ENDPOINTS.GROUP_DETAIL(groupId), { name });
            return response.data;
        } catch (error) {
            console.error('Error updating group:', error);
            throw new Error('Failed to update group');
        }
    }

    /**
     * Delete a group (only if no users are assigned)
     */
    async deleteGroup(groupId: number): Promise<void> {
        try {
            await axiosInstance.delete(ENDPOINTS.GROUP_DETAIL(groupId));
        } catch (error) {
            console.error('Error deleting group:', error);
            throw new Error('Failed to delete group');
        }
    }

    /**
     * Add users to a group
     */
    async addUsersToGroup(groupId: number, userIds: string[]): Promise<GroupOperationResponse> {
        try {
            const response = await axiosInstance.post(ENDPOINTS.GROUP_ADD_USERS(groupId), {
                user_ids: userIds,
            });
            return response.data;
        } catch (error) {
            console.error('Error adding users to group:', error);
            throw new Error('Failed to add users to group');
        }
    }

    /**
     * Remove users from a group
     */
    async removeUsersFromGroup(groupId: number, userIds: string[]): Promise<GroupOperationResponse> {
        try {
            const response = await axiosInstance.post(ENDPOINTS.GROUP_REMOVE_USERS(groupId), {
                user_ids: userIds,
            });
            return response.data;
        } catch (error) {
            console.error('Error removing users from group:', error);
            throw new Error('Failed to remove users from group');
        }
    }

    /**
     * Update group permissions
     */
    async updateGroupPermissions(groupId: number, permissionIds: number[]): Promise<GroupOperationResponse> {
        try {
            const response = await axiosInstance.post(ENDPOINTS.GROUP_UPDATE_PERMISSIONS(groupId), {
                permission_ids: permissionIds,
            });
            return response.data;
        } catch (error) {
            console.error('Error updating group permissions:', error);
            throw new Error('Failed to update group permissions');
        }
    }

    /**
     * Get users not in a specific group
     */
    async getAvailableUsers(groupId: number, search?: string): Promise<UserBasic[]> {
        try {
            const params = search ? { search } : {};
            const response = await axiosInstance.get(ENDPOINTS.GROUP_AVAILABLE_USERS(groupId), { params });
            return response.data.results || response.data;
        } catch (error) {
            console.error('Error fetching available users:', error);
            throw new Error('Failed to fetch available users');
        }
    }
}

// =================== PERMISSION MANAGEMENT ===================

class PermissionService {
    /**
     * Get all permissions with optional filtering
     */
    async getPermissions(filters?: { content_type?: string; search?: string }): Promise<Permission[]> {
        try {
            const response = await axiosInstance.get(ENDPOINTS.PERMISSIONS, { params: filters });
            console.log("the permissions response", response.data)
            debugger;
            return response.data.results || response.data;
        } catch (error) {
            console.error('Error fetching permissions:', error);
            throw new Error('Failed to fetch permissions');
        }
    }

    /**
     * Get permissions grouped by content type
     */
    async getPermissionsByContentType(): Promise<PermissionsByContentType> {
        try {
            const response = await axiosInstance.get(ENDPOINTS.PERMISSIONS_BY_CONTENT_TYPE);
            return response.data;
        } catch (error) {
            console.error('Error fetching permissions by content type:', error);
            throw new Error('Failed to fetch permissions by content type');
        }
    }
}

// =================== USER GROUP MANAGEMENT ===================

class UserGroupService {
    /**
     * Get all users with their group information
     */
    async getUsersWithGroups(filters?: { type?: string; search?: string }): Promise<UserWithGroups[]> {
        try {
            const response = await axiosInstance.get(ENDPOINTS.USERS_WITH_GROUPS, { params: filters });
            return response.data.results || response.data;
        } catch (error) {
            console.error('Error fetching users with groups:', error);
            throw new Error('Failed to fetch users with groups');
        }
    }

    /**
     * Bulk add multiple users to multiple groups
     */
    async bulkAddToGroups(data: BulkUserGroupData): Promise<GroupOperationResponse> {
        try {
            const response = await axiosInstance.post(ENDPOINTS.BULK_ADD_TO_GROUPS, data);
            return response.data;
        } catch (error) {
            console.error('Error bulk adding users to groups:', error);
            throw new Error('Failed to bulk add users to groups');
        }
    }

    /**
     * Bulk remove multiple users from multiple groups
     */
    async bulkRemoveFromGroups(data: BulkUserGroupData): Promise<GroupOperationResponse> {
        try {
            const response = await axiosInstance.post(ENDPOINTS.BULK_REMOVE_FROM_GROUPS, data);
            return response.data;
        } catch (error) {
            console.error('Error bulk removing users from groups:', error);
            throw new Error('Failed to bulk remove users from groups');
        }
    }

    /**
     * Assign a user to multiple groups (replaces existing groups)
     */
    async assignUserToGroups(data: AssignUserToGroupsData): Promise<GroupOperationResponse> {
        try {
            const response = await axiosInstance.post(ENDPOINTS.ASSIGN_USER_TO_GROUPS, data);
            return response.data;
        } catch (error) {
            console.error('Error assigning user to groups:', error);
            throw new Error('Failed to assign user to groups');
        }
    }
}

// =================== USER PERMISSION MANAGEMENT ===================

class UserPermissionService {
    /**
     * Get user's detailed groups and permissions
     */
    async getUserGroupsAndPermissions(userId: string): Promise<UserPermissionsData> {
        try {
            const response = await axiosInstance.get(ENDPOINTS.USER_GROUPS_PERMISSIONS(userId));
            return response.data;
        } catch (error) {
            console.error('Error fetching user groups and permissions:', error);
            throw new Error('Failed to fetch user groups and permissions');
        }
    }

    /**
     * Update user's group memberships (replace all groups)
     */
    async updateUserGroups(userId: string, groupIds: number[]): Promise<GroupOperationResponse> {
        try {
            const response = await axiosInstance.post(ENDPOINTS.USER_UPDATE_GROUPS(userId), {
                group_ids: groupIds,
            });
            return response.data;
        } catch (error) {
            console.error('Error updating user groups:', error);
            throw new Error('Failed to update user groups');
        }
    }

    /**
     * Add user to additional groups
     */
    async addUserToGroups(userId: string, groupIds: number[]): Promise<GroupOperationResponse> {
        try {
            const response = await axiosInstance.post(ENDPOINTS.USER_ADD_TO_GROUPS(userId), {
                group_ids: groupIds,
            });
            return response.data;
        } catch (error) {
            console.error('Error adding user to groups:', error);
            throw new Error('Failed to add user to groups');
        }
    }

    /**
     * Remove user from specific groups
     */
    async removeUserFromGroups(userId: string, groupIds: number[]): Promise<GroupOperationResponse> {
        try {
            const response = await axiosInstance.post(ENDPOINTS.USER_REMOVE_FROM_GROUPS(userId), {
                group_ids: groupIds,
            });
            return response.data;
        } catch (error) {
            console.error('Error removing user from groups:', error);
            throw new Error('Failed to remove user from groups');
        }
    }

    /**
     * Update user's individual permissions
     */
    async updateUserPermissions(userId: string, permissionIds: number[]): Promise<GroupOperationResponse> {
        try {
            const response = await axiosInstance.post(ENDPOINTS.USER_UPDATE_PERMISSIONS(userId), {
                permission_ids: permissionIds,
            });
            return response.data;
        } catch (error) {
            console.error('Error updating user permissions:', error);
            throw new Error('Failed to update user permissions');
        }
    }
}

// =================== USER MANAGEMENT ===================

class UserManagementService {
    /**
     * Create a new admin user
     */
    async createAdmin(userData: AdminUserData): Promise<UserResponse> {
        try {
            // Transform frontend data to backend format
            const backendData = {
                first_name: userData.firstName,
                last_name: userData.lastName,
                email: userData.email,
                phone_number: userData.phone,
                password: userData.password,
                employee_id: userData.employeeId,
                department: userData.department,
                position: userData.position,
                date_of_birth: userData.dateOfBirth,
                address: userData.address,
                emergency_contact: userData.emergencyContact,
                is_superuser: userData.accountSettings.isSuperuser,
                is_staff: userData.accountSettings.isStaff,
                is_active: userData.accountSettings.isActive,
                must_change_password: userData.accountSettings.mustChangePassword,
                two_factor_auth: userData.accountSettings.twoFactorAuth,
                work_schedule: userData.workSchedule,
                notes: userData.notes,
                account_status: userData.status,
                verification_status: userData.verificationStatus,
                groups: userData.permissions.groups,
                permissions: userData.permissions.customPermissions,
            };

            const response = await axiosInstance.post(ENDPOINTS.CREATE_ADMIN, backendData);
            return response.data;
        } catch (error) {
            console.error('Error creating admin user:', error);
            throw new Error('Failed to create admin user');
        }
    }

    /**
     * Get user by ID
     */
    async getUser(userId: string): Promise<UserResponse> {
        try {
            const response = await axiosInstance.get(ENDPOINTS.USER_DETAIL(userId));
            return response.data;
        } catch (error) {
            console.error('Error fetching user:', error);
            throw new Error('Failed to fetch user');
        }
    }

    /**
     * Update user
     */
    async updateUser(userId: string, userData: Partial<AdminUserData>): Promise<UserResponse> {
        try {
            // Transform frontend data to backend format
            const backendData = {
                first_name: userData.firstName,
                last_name: userData.lastName,
                email: userData.email,
                phone_number: userData.phone,
                employee_id: userData.employeeId,
                department: userData.department,
                position: userData.position,
                date_of_birth: userData.dateOfBirth,
                address: userData.address,
                emergency_contact: userData.emergencyContact,
                is_superuser: userData.accountSettings?.isSuperuser,
                is_staff: userData.accountSettings?.isStaff,
                is_active: userData.accountSettings?.isActive,
                must_change_password: userData.accountSettings?.mustChangePassword,
                two_factor_auth: userData.accountSettings?.twoFactorAuth,
                work_schedule: userData.workSchedule,
                notes: userData.notes,
                account_status: userData.status,
                verification_status: userData.verificationStatus,
            };

            const response = await axiosInstance.patch(ENDPOINTS.USER_DETAIL(userId), backendData);
            return response.data;
        } catch (error) {
            console.error('Error updating user:', error);
            throw new Error('Failed to update user');
        }
    }

    /**
     * Activate user
     */
    async activateUser(userId: string): Promise<GroupOperationResponse> {
        try {
            const response = await axiosInstance.post(ENDPOINTS.USER_ACTIVATE(userId));
            return response.data;
        } catch (error) {
            console.error('Error activating user:', error);
            throw new Error('Failed to activate user');
        }
    }

    /**
     * Deactivate user
     */
    async deactivateUser(userId: string): Promise<GroupOperationResponse> {
        try {
            const response = await axiosInstance.post(ENDPOINTS.USER_DEACTIVATE(userId));
            return response.data;
        } catch (error) {
            console.error('Error deactivating user:', error);
            throw new Error('Failed to deactivate user');
        }
    }
}

// =================== UNIFIED SERVICE EXPORT ===================

class PermissionManagementService {
    public groups: GroupService;
    public permissions: PermissionService;
    public userGroups: UserGroupService;
    public userPermissions: UserPermissionService;
    public userManagement: UserManagementService;

    constructor() {
        this.groups = new GroupService();
        this.permissions = new PermissionService();
        this.userGroups = new UserGroupService();
        this.userPermissions = new UserPermissionService();
        this.userManagement = new UserManagementService();
    }

    // =================== CONVENIENCE METHODS ===================

    /**
     * Get complete overview of groups, users, and permissions
     */
    async getCompleteOverview(filters?: { search?: string }) {
        try {
            const [groups, users, permissions] = await Promise.all([
                this.groups.getGroups(filters?.search),
                this.userGroups.getUsersWithGroups({ search: filters?.search }),
                this.permissions.getPermissionsByContentType(),
            ]);

            return {
                groups,
                users,
                permissions,
                summary: {
                    totalGroups: groups.length,
                    totalUsers: users.length,
                    totalPermissions: Object.values(permissions).flat().length,
                    activeUsers: users.filter((u) => u.account_status === 'active').length,
                    usersWithGroups: users.filter((u) => u.groups.length > 0).length,
                },
            };
        } catch (error) {
            console.error('Error fetching complete overview:', error);
            throw new Error('Failed to fetch complete overview');
        }
    }

    /**
     * Quick method to create a group and assign permissions
     */
    async createGroupWithPermissions(name: string, permissionIds: number[]): Promise<GroupDetail> {
        try {
            const group = await this.groups.createGroup(name);
            if (permissionIds.length > 0) {
                await this.groups.updateGroupPermissions(group.id, permissionIds);
            }
            return await this.groups.getGroupDetail(group.id);
        } catch (error) {
            console.error('Error creating group with permissions:', error);
            throw new Error('Failed to create group with permissions');
        }
    }

    /**
     * Quick method to assign a user to multiple groups with specific permissions
     */
    async setupUserRoleComplete(userId: string, groupIds: number[], individualPermissionIds?: number[]): Promise<UserPermissionsData> {
        try {
            // Assign user to groups
            await this.userPermissions.updateUserGroups(userId, groupIds);

            // Add individual permissions if provided
            if (individualPermissionIds && individualPermissionIds.length > 0) {
                await this.userPermissions.updateUserPermissions(userId, individualPermissionIds);
            }

            // Return updated user permissions
            return await this.userPermissions.getUserGroupsAndPermissions(userId);
        } catch (error) {
            console.error('Error setting up user role:', error);
            throw new Error('Failed to setup user role completely');
        }
    }

    /**
     * Get statistics about permission usage
     */
    async getPermissionStats() {
        try {
            const [groups, users, permissions] = await Promise.all([this.groups.getGroups(), this.userGroups.getUsersWithGroups(), this.permissions.getPermissions()]);

            const stats = {
                groups: {
                    total: groups.length,
                    withUsers: groups.filter((g) => (g.user_count || 0) > 0).length,
                    empty: groups.filter((g) => (g.user_count || 0) === 0).length,
                },
                users: {
                    total: users.length,
                    withGroups: users.filter((u) => u.groups.length > 0).length,
                    withoutGroups: users.filter((u) => u.groups.length === 0).length,
                    withIndividualPermissions: users.filter((u) => u.user_permissions.length > 0).length,
                    byType: {
                        admin: users.filter((u) => u.user_type === 'admin').length,
                        provider: users.filter((u) => u.user_type === 'provider').length,
                        customer: users.filter((u) => u.user_type === 'customer').length,
                    },
                },
                permissions: {
                    total: permissions.length,
                    byContentType: permissions.reduce((acc, perm) => {
                        const type = perm.content_type.model;
                        acc[type] = (acc[type] || 0) + 1;
                        return acc;
                    }, {} as Record<string, number>),
                },
            };

            return stats;
        } catch (error) {
            console.error('Error fetching permission stats:', error);
            throw new Error('Failed to fetch permission statistics');
        }
    }
}

// =================== EXPORT ===================

const permissionService = new PermissionManagementService();
export default permissionService;

// Export individual services for specific use cases
export const groupService = permissionService.groups;
export const permissionOnlyService = permissionService.permissions;
export const userGroupService = permissionService.userGroups;
export const userPermissionService = permissionService.userPermissions;
export const userManagementService = permissionService.userManagement;
