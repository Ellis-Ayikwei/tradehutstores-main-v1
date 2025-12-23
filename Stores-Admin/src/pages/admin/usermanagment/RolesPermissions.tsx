import React, { useState, useEffect } from 'react';
import { usePermissionService } from '../../../hooks/usePermissionService';
import Header from './RolesPermissions/components/Header';
import StatsCards from './RolesPermissions/components/StatsCards';
import ErrorAlert from './RolesPermissions/components/ErrorAlert';
import TabNavigation from './RolesPermissions/components/TabNavigation';
import SearchBar from './RolesPermissions/components/SearchBar';
import TabContent from './RolesPermissions/components/TabContent';
import CreateEditGroupModal from './RolesPermissions/components/CreateEditGroupModal';
import ManageUsersModal from './RolesPermissions/components/ManageUsersModal';
import confirmDialog from '../../../helper/confirmDialog';
// Fallback lightweight types to satisfy the compiler if service types are not present
type Group = { id: number; name: string; user_count?: number; permission_count?: number; users?: any[] };
type GroupDetail = Group & { permissions: { id: number; name: string }[]; users: { id: string; first_name: string; last_name: string }[] };
type Permission = { id: number; name: string; codename: string };
type UserWithGroups = { id: string; email: string; first_name: string; last_name: string; user_type: 'admin' | 'provider' | 'customer'; groups: { id: number; name: string }[] };
type PermissionsByContentType = Record<string, Permission[]>;

interface RoleStats {
    totalRoles: number;
    activeGroups: number;
    permissions: number;
    assignedUsers: number;
}

interface ModalState {
    type: 'createGroup' | 'editGroup' | 'manageUsers' | 'managePermissions' | null;
    data?: any;
}

const RolesPermissions: React.FC = () => {
    // Service hook
    const { groups, permissions, userGroups, userPermissions, utils, loading, groupsLoading, permissionsLoading, error, clearError } = usePermissionService();

    // State
    const [groupsList, setGroupsList] = useState<Group[]>([]);
    const [usersList, setUsersList] = useState<UserWithGroups[]>([]);
    const [permissionsList, setPermissionsList] = useState<PermissionsByContentType>({});
    const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
    const [stats, setStats] = useState<RoleStats>({
        totalRoles: 0,
        activeGroups: 0,
        permissions: 0,
        assignedUsers: 0,
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'roles' | 'groups' | 'permissions'>('groups');
    const [selectedGroup, setSelectedGroup] = useState<GroupDetail | null>(null);
    const [modalState, setModalState] = useState<ModalState>({ type: null });
    const [sortConfig, setSortConfig] = useState<{
        key: string;
        direction: 'asc' | 'desc';
    }>({
        key: 'name',
        direction: 'asc',
    });

    // Form state for modals
    const [groupForm, setGroupForm] = useState({
        name: '',
        selectedPermissions: [] as number[],
        selectedUsers: [] as string[],
    });

    // User management modal state
    const [userManagementForm, setUserManagementForm] = useState({
        selectedGroups: [] as number[],
        availableGroups: [] as Group[],
    });

    // Load initial data
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [groupsData, usersData, permissionsData] = await Promise.all([groups.getAll(), userGroups.getUsersWithGroups(), permissions.getByContentType()]);
console.log("permissons data", permissionsData)
            setGroupsList(groupsData);
            setUsersList(usersData);
            setPermissionsList(permissionsData);

            // Flatten permissions for easier access
            const flatPermissions = Object.values(permissionsData).flat();
            setAllPermissions(flatPermissions);

            // Calculate stats
            setStats({
                totalRoles: groupsData.length,
                activeGroups: groupsData.filter((g) => (g.user_count || 0) > 0).length,
                permissions: flatPermissions.length,
                assignedUsers: usersData.filter((u) => u.groups.length > 0).length,
            });
        } catch (error) {
            console.error('Error loading data:', error);
        }
    };

    const handleCreateGroup = async () => {
        try {
            if (!groupForm.name.trim()) return;

            const newGroup = await groups.createWithPermissions(groupForm.name, groupForm.selectedPermissions);

            if (groupForm.selectedUsers.length > 0) {
                await groups.addUsers(newGroup.id, groupForm.selectedUsers);
            }

            await loadData();
            setModalState({ type: null });
            resetGroupForm();
        } catch (error) {
            console.error('Error creating group:', error);
        }
    };

    const handleEditGroup = async () => {
        try {
            if (!selectedGroup || !groupForm.name.trim()) return;

            await groups.update(selectedGroup.id, groupForm.name);
            await groups.updatePermissions(selectedGroup.id, groupForm.selectedPermissions);

            await loadData();
            setModalState({ type: null });
            resetGroupForm();
        } catch (error) {
            console.error('Error updating group:', error);
        }
    };

    const handleDeleteGroup = async (groupId: number) => {
        try {
            const confirmed = await confirmDialog({
                title: 'Delete Group',
                finalQuestion: 'Are you sure you want to delete this group?',
            });
            if (confirmed) {
                await groups.delete(groupId);
                await loadData();
            }
          
        } catch (error) {
            console.error('Error deleting group:', error);
        }
    };

    const handleManageUsers = async (groupId: number, action: 'add' | 'remove', userIds: string[]) => {
        try {
            if (action === 'add') {
                await groups.addUsers(groupId, userIds);
            } else {
                await groups.removeUsers(groupId, userIds);
            }
            await loadData();
        } catch (error) {
            console.error('Error managing users:', error);
        }
    };

    const handleUserGroupManagement = async () => {
        try {
            if (!modalState.data || userManagementForm.selectedGroups.length === 0) return;

            const userId = modalState.data.id;
            const currentUserGroups = modalState.data.groups.map((g: any) => g.id);
            const newGroups = userManagementForm.selectedGroups;
            
            // Find groups to add and remove
            const groupsToAdd = newGroups.filter((id: number) => !currentUserGroups.includes(id));
            const groupsToRemove = currentUserGroups.filter((id: number) => !newGroups.includes(id));

            // Add user to new groups
            for (const groupId of groupsToAdd) {
                await groups.addUsers(groupId, [userId]);
            }

            // Remove user from old groups
            for (const groupId of groupsToRemove) {
                await groups.removeUsers(groupId, [userId]);
            }

            await loadData();
            setModalState({ type: null });
            setUserManagementForm({ selectedGroups: [], availableGroups: [] });
        } catch (error) {
            console.error('Error managing user groups:', error);
        }
    };

    const openGroupModal = (type: 'createGroup' | 'editGroup', group?: Group | GroupDetail) => {
        if (type === 'editGroup' && group) {
            const detail = group as GroupDetail;
            setSelectedGroup(detail);
            setGroupForm({
                name: detail.name,
                selectedPermissions: (detail.permissions || []).map((p) => p.id),
                selectedUsers: (detail.users || []).map((u: any) => u.id),
            });
        } else {
            resetGroupForm();
        }
        setModalState({ type });
    };

    const openUserManagementModal = (user: UserWithGroups) => {
        setUserManagementForm({
            selectedGroups: user.groups.map(g => g.id),
            availableGroups: groupsList,
        });
        setModalState({ type: 'manageUsers', data: user });
    };

    const resetGroupForm = () => {
        setGroupForm({
            name: '',
            selectedPermissions: [],
            selectedUsers: [],
        });
        setSelectedGroup(null);
    };

    const filteredGroups = groupsList.filter((group) => group.name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (loading) {
        return (
            <div className="min-h-[400px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading roles and permissions...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Header onCreateGroup={() => openGroupModal('createGroup')} onRefresh={loadData} />
            
            <ErrorAlert error={error} onClear={clearError} />
            
            <StatsCards stats={stats} />
            
            <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
            
            <SearchBar 
                searchQuery={searchQuery} 
                onSearchChange={setSearchQuery} 
                activeTab={activeTab} 
            />
            
            <TabContent
                activeTab={activeTab}
                groups={filteredGroups}
                permissionsList={permissionsList}
                groupsLoading={groupsLoading}
                permissionsLoading={permissionsLoading}
                onEditGroup={async (groupId) => {
                    const groupDetail = await groups.getDetail(groupId);
                    openGroupModal('editGroup', groupDetail);
                }}
                onDeleteGroup={handleDeleteGroup}
            />

            <CreateEditGroupModal
                isOpen={modalState.type === 'createGroup' || modalState.type === 'editGroup'}
                isEdit={modalState.type === 'editGroup'}
                groupForm={groupForm}
                permissionsList={permissionsList}
                loading={loading}
                onClose={() => {
                                    setModalState({ type: null });
                                    resetGroupForm();
                                }}
                onSave={modalState.type === 'createGroup' ? handleCreateGroup : handleEditGroup}
                onFormChange={setGroupForm}
            />

            <ManageUsersModal
                isOpen={modalState.type === 'manageUsers'}
                user={modalState.data}
                userManagementForm={userManagementForm}
                loading={loading}
                onClose={() => {
                                    setModalState({ type: null });
                                    setUserManagementForm({ selectedGroups: [], availableGroups: [] });
                                }}
                onSave={handleUserGroupManagement}
                onFormChange={setUserManagementForm}
            />
        </div>
    );
};

export default RolesPermissions;
