import { useState, useCallback } from 'react';
import permissionService, {
    Group,
    GroupDetail,
    Permission,
    UserWithGroups,
    UserPermissionsData,
    GroupOperationResponse,
    PermissionsByContentType,
    BulkUserGroupData,
    AssignUserToGroupsData,
    UserBasic,
    AdminUserData,
    UserResponse,
} from '../services/permissionService';

interface UsePermissionServiceReturn {
    // Loading states
    loading: boolean;
    groupsLoading: boolean;
    permissionsLoading: boolean;

    // Error states
    error: string | null;

    // Group operations
    groups: {
        getAll: (search?: string) => Promise<Group[]>;
        getDetail: (groupId: number) => Promise<GroupDetail>;
        create: (name: string) => Promise<Group>;
        update: (groupId: number, name: string) => Promise<Group>;
        delete: (groupId: number) => Promise<void>;
        addUsers: (groupId: number, userIds: string[]) => Promise<GroupOperationResponse>;
        removeUsers: (groupId: number, userIds: string[]) => Promise<GroupOperationResponse>;
        updatePermissions: (groupId: number, permissionIds: number[]) => Promise<GroupOperationResponse>;
        getAvailableUsers: (groupId: number, search?: string) => Promise<UserBasic[]>;
        createWithPermissions: (name: string, permissionIds: number[]) => Promise<GroupDetail>;
    };

    // Permission operations
    permissions: {
        getAll: (filters?: { content_type?: string; search?: string }) => Promise<Permission[]>;
        getByContentType: () => Promise<PermissionsByContentType>;
    };

    // User-group operations
    userGroups: {
        getUsersWithGroups: (filters?: { type?: string; search?: string }) => Promise<UserWithGroups[]>;
        bulkAddToGroups: (data: BulkUserGroupData) => Promise<GroupOperationResponse>;
        bulkRemoveFromGroups: (data: BulkUserGroupData) => Promise<GroupOperationResponse>;
        assignUserToGroups: (data: AssignUserToGroupsData) => Promise<GroupOperationResponse>;
    };

    // User permission operations
    userPermissions: {
        getUserGroupsAndPermissions: (userId: string) => Promise<UserPermissionsData>;
        updateUserGroups: (userId: string, groupIds: number[]) => Promise<GroupOperationResponse>;
        addUserToGroups: (userId: string, groupIds: number[]) => Promise<GroupOperationResponse>;
        removeUserFromGroups: (userId: string, groupIds: number[]) => Promise<GroupOperationResponse>;
        updateUserPermissions: (userId: string, permissionIds: number[]) => Promise<GroupOperationResponse>;
        setupUserRoleComplete: (userId: string, groupIds: number[], individualPermissionIds?: number[]) => Promise<UserPermissionsData>;
    };

    // User management operations
    userManagement: {
        createAdmin: (userData: AdminUserData) => Promise<UserResponse>;
        getUser: (userId: string) => Promise<UserResponse>;
        updateUser: (userId: string, userData: Partial<AdminUserData>) => Promise<UserResponse>;
        activateUser: (userId: string) => Promise<GroupOperationResponse>;
        deactivateUser: (userId: string) => Promise<GroupOperationResponse>;
    };

    // Utility operations
    utils: {
        getCompleteOverview: (filters?: { search?: string }) => Promise<any>;
        getPermissionStats: () => Promise<any>;
    };

    // Reset functions
    clearError: () => void;
}

export const usePermissionService = (): UsePermissionServiceReturn => {
    const [loading, setLoading] = useState(false);
    const [groupsLoading, setGroupsLoading] = useState(false);
    const [permissionsLoading, setPermissionsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAsync = useCallback(async <T>(operation: () => Promise<T>, setSpecificLoading?: (loading: boolean) => void): Promise<T> => {
        try {
            setError(null);
            setLoading(true);
            if (setSpecificLoading) setSpecificLoading(true);

            const result = await operation();
            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
            if (setSpecificLoading) setSpecificLoading(false);
        }
    }, []);

    // Group operations
    const groups = {
        getAll: useCallback((search?: string) => handleAsync(() => permissionService.groups.getGroups(search), setGroupsLoading), [handleAsync]),

        getDetail: useCallback((groupId: number) => handleAsync(() => permissionService.groups.getGroupDetail(groupId)), [handleAsync]),

        create: useCallback((name: string) => handleAsync(() => permissionService.groups.createGroup(name)), [handleAsync]),

        update: useCallback((groupId: number, name: string) => handleAsync(() => permissionService.groups.updateGroup(groupId, name)), [handleAsync]),

        delete: useCallback((groupId: number) => handleAsync(() => permissionService.groups.deleteGroup(groupId)), [handleAsync]),

        addUsers: useCallback((groupId: number, userIds: string[]) => handleAsync(() => permissionService.groups.addUsersToGroup(groupId, userIds)), [handleAsync]),

        removeUsers: useCallback((groupId: number, userIds: string[]) => handleAsync(() => permissionService.groups.removeUsersFromGroup(groupId, userIds)), [handleAsync]),

        updatePermissions: useCallback((groupId: number, permissionIds: number[]) => handleAsync(() => permissionService.groups.updateGroupPermissions(groupId, permissionIds)), [handleAsync]),

        getAvailableUsers: useCallback((groupId: number, search?: string) => handleAsync(() => permissionService.groups.getAvailableUsers(groupId, search)), [handleAsync]),

        createWithPermissions: useCallback((name: string, permissionIds: number[]) => handleAsync(() => permissionService.createGroupWithPermissions(name, permissionIds)), [handleAsync]),
    };

    // Permission operations
    const permissions = {
        getAll: useCallback((filters?: { content_type?: string; search?: string }) => handleAsync(() => permissionService.permissions.getPermissions(filters), setPermissionsLoading), [handleAsync]),

        getByContentType: useCallback(() => handleAsync(() => permissionService.permissions.getPermissionsByContentType()), [handleAsync]),
    };

    // User-group operations
    const userGroups = {
        getUsersWithGroups: useCallback((filters?: { type?: string; search?: string }) => handleAsync(() => permissionService.userGroups.getUsersWithGroups(filters)), [handleAsync]),

        bulkAddToGroups: useCallback((data: BulkUserGroupData) => handleAsync(() => permissionService.userGroups.bulkAddToGroups(data)), [handleAsync]),

        bulkRemoveFromGroups: useCallback((data: BulkUserGroupData) => handleAsync(() => permissionService.userGroups.bulkRemoveFromGroups(data)), [handleAsync]),

        assignUserToGroups: useCallback((data: AssignUserToGroupsData) => handleAsync(() => permissionService.userGroups.assignUserToGroups(data)), [handleAsync]),
    };

    // User permission operations
    const userPermissions = {
        getUserGroupsAndPermissions: useCallback((userId: string) => handleAsync(() => permissionService.userPermissions.getUserGroupsAndPermissions(userId)), [handleAsync]),

        updateUserGroups: useCallback((userId: string, groupIds: number[]) => handleAsync(() => permissionService.userPermissions.updateUserGroups(userId, groupIds)), [handleAsync]),

        addUserToGroups: useCallback((userId: string, groupIds: number[]) => handleAsync(() => permissionService.userPermissions.addUserToGroups(userId, groupIds)), [handleAsync]),

        removeUserFromGroups: useCallback((userId: string, groupIds: number[]) => handleAsync(() => permissionService.userPermissions.removeUserFromGroups(userId, groupIds)), [handleAsync]),

        updateUserPermissions: useCallback(
            (userId: string, permissionIds: number[]) => handleAsync(() => permissionService.userPermissions.updateUserPermissions(userId, permissionIds)),
            [handleAsync]
        ),

        setupUserRoleComplete: useCallback(
            (userId: string, groupIds: number[], individualPermissionIds?: number[]) => handleAsync(() => permissionService.setupUserRoleComplete(userId, groupIds, individualPermissionIds)),
            [handleAsync]
        ),
    };

    // User management operations
    const userManagement = {
        createAdmin: useCallback((userData: AdminUserData) => handleAsync(() => permissionService.userManagement.createAdmin(userData)), [handleAsync]),

        getUser: useCallback((userId: string) => handleAsync(() => permissionService.userManagement.getUser(userId)), [handleAsync]),

        updateUser: useCallback((userId: string, userData: Partial<AdminUserData>) => handleAsync(() => permissionService.userManagement.updateUser(userId, userData)), [handleAsync]),

        activateUser: useCallback((userId: string) => handleAsync(() => permissionService.userManagement.activateUser(userId)), [handleAsync]),

        deactivateUser: useCallback((userId: string) => handleAsync(() => permissionService.userManagement.deactivateUser(userId)), [handleAsync]),
    };

    // Utility operations
    const utils = {
        getCompleteOverview: useCallback((filters?: { search?: string }) => handleAsync(() => permissionService.getCompleteOverview(filters)), [handleAsync]),

        getPermissionStats: useCallback(() => handleAsync(() => permissionService.getPermissionStats()), [handleAsync]),
    };

    const clearError = useCallback(() => setError(null), []);

    return {
        loading,
        groupsLoading,
        permissionsLoading,
        error,
        groups,
        permissions,
        userGroups,
        userPermissions,
        userManagement,
        utils,
        clearError,
    };
};
