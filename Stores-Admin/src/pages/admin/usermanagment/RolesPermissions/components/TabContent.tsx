import React from 'react';
import GroupsTab from './GroupsTab';
import PermissionsTab from './PermissionsTab';

type Group = { id: number; name: string; user_count?: number; permission_count?: number; users?: any[] };
type Permission = { id: number; name: string; codename: string };
type PermissionsByContentType = Record<string, Permission[]>;

interface TabContentProps {
    activeTab: 'groups' | 'permissions';
    groups: Group[];
    permissionsList: PermissionsByContentType;
    groupsLoading: boolean;
    permissionsLoading: boolean;
    onEditGroup: (groupId: number) => void;
    onDeleteGroup: (groupId: number) => void;
}

const TabContent: React.FC<TabContentProps> = ({
    activeTab,
    groups,
    permissionsList,
    groupsLoading,
    permissionsLoading,
    onEditGroup,
    onDeleteGroup,
}) => {
    return (
        <div className="p-6">
            {activeTab === 'groups' && (
                <GroupsTab
                    groups={groups}
                    onEditGroup={onEditGroup}
                    onManageUsers={() => {}}
                    onDeleteGroup={onDeleteGroup}
                />
            )}

            {activeTab === 'permissions' && (
                <PermissionsTab
                    permissionsList={permissionsList}
                    loading={permissionsLoading}
                />
            )}
        </div>
    );
};

export default TabContent;
