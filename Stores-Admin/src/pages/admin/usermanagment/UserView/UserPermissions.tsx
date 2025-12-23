import React, { useEffect, useMemo, useState } from 'react';
import CrudModal from '../../../../components/ui/CrudModal';
import { usePermissionService } from '../../../../hooks/usePermissionService';

// Use the full UserAccount interface from UserView.tsx
interface Address {
  id: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
  address_type: 'billing' | 'shipping' | 'both';
}

// Update types to match new user shape
interface Group {
  id: number;
  name: string;
  user_count?: number;
}
interface Permission {
  id: number;
  name: string;
  codename: string;
  // Backend returns an object with app_label/model; allow flexible typing
  content_type?: any;
}
interface UserAccount {
  id: string;
  email: string;
  phone_number: string;
  first_name: string;
  last_name: string;
  user_type: 'customer' | 'provider' | 'admin';
  account_status: 'active' | 'pending' | 'suspended' | 'inactive';
  date_joined: string;
  last_active: string | null;
  profile_picture?: string | null;
  rating: string;
  groups: Group[];
  user_permissions: Permission[];
  roles: string[];
  activities?: any[];
  two_factor_enabled: boolean;
  two_factor_method: '2fa_app' | 'sms' | 'email' | null;
  last_password_change?: string;
  password_expires_at?: string;
  login_attempts?: number;
  last_failed_login?: string;
  sessionTimeout?: number;
  loginAlerts?: boolean;
  recoveryMethods?: {
    email: boolean;
    phone: boolean;
  };
  allowedIPs?: string[];
  securityHistory?: any[];
  preferences?: any;
}

interface UserPermissionsProps {
  user: UserAccount;
  isEditing: boolean;
  onSave: (user: UserAccount) => void;
  onCancel: () => void;
}

const UserPermissions: React.FC<UserPermissionsProps> = ({ user, isEditing, onSave, onCancel }) => {
  const [localUser, setLocalUser] = useState<UserAccount>(user);
  const [saving, setSaving] = useState(false);
  const { groups, permissions, userPermissions } = usePermissionService();
  console.log("the groups", groups)
  console.log("the permissions", permissions)


  const [groupsList, setGroupsList] = useState<any[]>([]);
  const [allPermissions, setAllPermissions] = useState<any[]>([]);
  const [permissionsByContentType, setPermissionsByContentType] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState<boolean>(false);
  // Group modal state
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupModalSelection, setGroupModalSelection] = useState<number[]>([]);
  const availableGroups: Group[] = useMemo(
    () => groupsList.filter((g) => !localUser.groups.some((lg) => lg.id === g.id)),
    [groupsList, localUser.groups]
  );
  // Permission modal state
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [permissionModalSelection, setPermissionModalSelection] = useState<number[]>([]);
  const [permissionSearch, setPermissionSearch] = useState<string>('');
  const [selectedResource, setSelectedResource] = useState<string>('all');
  const [contentTypeSelections, setContentTypeSelections] = useState<Record<string, boolean>>({});
  const [selectAllPermissions, setSelectAllPermissions] = useState<boolean>(false);
  // Build resource (content type) options from permissionsByContentType
  const resourceOptions: string[] = useMemo(() => {
    return ['all', ...Object.keys(permissionsByContentType).sort()];
  }, [permissionsByContentType]);
  // Available permissions are now filtered in the modal component
  // Load groups and permissions from backend
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [gs, permsByType] = await Promise.all([
          groups.getAll(),
          permissions.getByContentType(),
        ]);
        setGroupsList((gs as any[]) || []);
        setPermissionsByContentType(permsByType || {});
        const flatPerms: any[] = Object.values(permsByType || {}).flat() as any[];
        setAllPermissions(flatPerms || []);
      } catch (e) {
        // silent fail to keep UI usable
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Update global select all state when permission selection changes
  useEffect(() => {
    if (permissionModalOpen) {
      setSelectAllPermissions(isAllPermissionsSelected());
    }
  }, [permissionModalSelection, permissionSearch, selectedResource, permissionModalOpen]);

  // Groups
  const handleAddGroup = () => {
    setGroupModalSelection([]);
    setGroupModalOpen(true);
  };
  const handleGroupModalSave = async () => {
    try {
      setSaving(true);
      const selectedGroups = groupsList.filter(g => groupModalSelection.includes(g.id));
      
      // Add user to selected groups via API
      for (const group of selectedGroups) {
        await groups.addUsers(group.id, [localUser.id]);
      }
      
      // Update local state
      setLocalUser({ ...localUser, groups: [...localUser.groups, ...selectedGroups] });
    setGroupModalOpen(false);
    } catch (error) {
      console.error('Error adding user to groups:', error);
    } finally {
      setSaving(false);
    }
  };
  const handleRemoveGroup = async (groupId: number) => {
    try {
      setSaving(true);
      // Remove user from group via API
      await groups.removeUsers(groupId, [localUser.id]);
      
      // Update local state
    setLocalUser({ ...localUser, groups: localUser.groups.filter(g => g.id !== groupId) });
    } catch (error) {
      console.error('Error removing user from group:', error);
    } finally {
      setSaving(false);
    }
  };

  // Permissions
  const handleAddPermission = () => {
    setPermissionModalSelection([]);
    setContentTypeSelections({});
    setSelectAllPermissions(false);
    setPermissionModalOpen(true);
  };
  const handlePermissionModalSave = async () => {
    try {
      setSaving(true);
      const selectedPermissions = allPermissions.filter(p => permissionModalSelection.includes(p.id));
      
      // Add permissions to user via API
      const currentPermissionIds = localUser.user_permissions.map(p => p.id);
      const newPermissionIds = [...currentPermissionIds, ...selectedPermissions.map(p => p.id)];
      await userPermissions.updateUserPermissions(localUser.id, newPermissionIds);
      
      // Update local state
      setLocalUser({ ...localUser, user_permissions: [...localUser.user_permissions, ...selectedPermissions] });
    setPermissionModalOpen(false);
    } catch (error) {
      console.error('Error adding permissions to user:', error);
    } finally {
      setSaving(false);
    }
  };
  const handleRemovePermission = async (permissionId: number) => {
    try {
      setSaving(true);
      // Remove permission from user via API
      const currentPermissionIds = localUser.user_permissions.map(p => p.id);
      const newPermissionIds = currentPermissionIds.filter(id => id !== permissionId);
      await userPermissions.updateUserPermissions(localUser.id, newPermissionIds);
      
      // Update local state
    setLocalUser({ ...localUser, user_permissions: localUser.user_permissions.filter(p => p.id !== permissionId) });
    } catch (error) {
      console.error('Error removing permission from user:', error);
    } finally {
      setSaving(false);
    }
  };

  // Handle select all for a content type
  const handleContentTypeSelectAll = (contentType: string, permissions: any[]) => {
    const isSelected = contentTypeSelections[contentType];
    const permissionIds = permissions.map(p => p.id);
    
    if (isSelected) {
      // Deselect all permissions from this content type
      setPermissionModalSelection(prev => prev.filter(id => !permissionIds.includes(id)));
      setContentTypeSelections(prev => ({ ...prev, [contentType]: false }));
    } else {
      // Select all permissions from this content type
      setPermissionModalSelection(prev => [...new Set([...prev, ...permissionIds])]);
      setContentTypeSelections(prev => ({ ...prev, [contentType]: true }));
    }
  };

  // Check if all permissions in a content type are selected
  const isContentTypeFullySelected = (contentType: string, permissions: any[]) => {
    const permissionIds = permissions.map(p => p.id);
    return permissionIds.every(id => permissionModalSelection.includes(id));
  };

  // Handle global select all permissions
  const handleSelectAllPermissions = () => {
    if (selectAllPermissions) {
      // Deselect all permissions
      setPermissionModalSelection([]);
      setContentTypeSelections({});
      setSelectAllPermissions(false);
    } else {
      // Get all available permissions based on current filters
      const allAvailablePermissions: any[] = [];
      Object.entries(permissionsByContentType).forEach(([contentType, perms]) => {
        const filteredPerms = perms.filter(p => {
          const q = permissionSearch.trim().toLowerCase();
          const matchesSearch = !q || 
            (p.name || '').toLowerCase().includes(q) ||
            (p.codename || '').toLowerCase().includes(q);
          
          const matchesResource = selectedResource === 'all' || contentType === selectedResource;
          
          const notAlreadyAssigned = !localUser.user_permissions.some(lp => lp.id === p.id);
          
          return matchesSearch && matchesResource && notAlreadyAssigned;
        });
        allAvailablePermissions.push(...filteredPerms);
      });
      
      // Select all available permissions
      const allPermissionIds = allAvailablePermissions.map(p => p.id);
      setPermissionModalSelection(allPermissionIds);
      
      // Update content type selections
      const newContentTypeSelections: Record<string, boolean> = {};
      Object.entries(permissionsByContentType).forEach(([contentType, perms]) => {
        const filteredPerms = perms.filter(p => {
          const q = permissionSearch.trim().toLowerCase();
          const matchesSearch = !q || 
            (p.name || '').toLowerCase().includes(q) ||
            (p.codename || '').toLowerCase().includes(q);
          
          const matchesResource = selectedResource === 'all' || contentType === selectedResource;
          
          const notAlreadyAssigned = !localUser.user_permissions.some(lp => lp.id === p.id);
          
          return matchesSearch && matchesResource && notAlreadyAssigned;
        });
        
        if (filteredPerms.length > 0) {
          newContentTypeSelections[contentType] = true;
        }
      });
      setContentTypeSelections(newContentTypeSelections);
      setSelectAllPermissions(true);
    }
  };

  // Check if all available permissions are selected
  const isAllPermissionsSelected = () => {
    const allAvailablePermissions: any[] = [];
    Object.entries(permissionsByContentType).forEach(([contentType, perms]) => {
      const filteredPerms = perms.filter(p => {
        const q = permissionSearch.trim().toLowerCase();
        const matchesSearch = !q || 
          (p.name || '').toLowerCase().includes(q) ||
          (p.codename || '').toLowerCase().includes(q);
        
        const matchesResource = selectedResource === 'all' || contentType === selectedResource;
        
        const notAlreadyAssigned = !localUser.user_permissions.some(lp => lp.id === p.id);
        
        return matchesSearch && matchesResource && notAlreadyAssigned;
      });
      allAvailablePermissions.push(...filteredPerms);
    });
    
    return allAvailablePermissions.length > 0 && allAvailablePermissions.every(p => permissionModalSelection.includes(p.id));
  };

  // Roles removed in favor of Groups

  const handleSave = () => {
    setSaving(true);
    onSave(localUser);
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Groups Section */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h3 className="text-lg font-semibold">User Groups</h3>
          {isEditing && (
            <button
              onClick={handleAddGroup}
              className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
            >
              Add Group
            </button>
          )}
        </div>
        <div className="p-6">
          <div className="flex flex-wrap gap-2">
            {localUser.groups.map((group) => (
              <div key={group.id} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {group.name}
                {isEditing && (
                  <button
                    onClick={() => handleRemoveGroup(group.id)}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {localUser.groups.length === 0 && (
              <p className="text-gray-500 text-sm">No groups assigned</p>
            )}
          </div>
        </div>
      </div>
      {/* Group Add Modal */}
      <CrudModal
        title="Add Groups"
        visible={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        onSave={handleGroupModalSave}
        size="md"
      >
        <div className="space-y-2">
          {availableGroups.map((group) => (
            <label key={group.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={groupModalSelection.includes(group.id)}
                onChange={e => {
                  if (e.target.checked) {
                    setGroupModalSelection([...groupModalSelection, group.id]);
                  } else {
                    setGroupModalSelection(groupModalSelection.filter(gid => gid !== group.id));
                  }
                }}
                disabled={localUser.groups.some(g => g.id === group.id)}
              />
              <span className={localUser.groups.some(g => g.id === group.id) ? 'text-gray-400' : ''}>{group.name}</span>
            </label>
          ))}
        </div>
      </CrudModal>
      {/* Permissions Section */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h3 className="text-lg font-semibold">User Permissions</h3>
          {isEditing && (
            <button
              onClick={handleAddPermission}
              className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
            >
              Add Permission
            </button>
          )}
        </div>
        <div className="p-6">
          <div className="flex flex-wrap gap-2">
            {localUser.user_permissions.map((permission) => (
              <div key={permission.id} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                {permission.name}
                {isEditing && (
                  <button
                    onClick={() => handleRemovePermission(permission.id)}
                    className="ml-2 text-green-600 hover:text-green-800"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {localUser.user_permissions.length === 0 && (
              <p className="text-gray-500 text-sm">No permissions assigned</p>
            )}
          </div>
        </div>
      </div>
      {/* Permission Add Modal */}
      <CrudModal
        title="Add Permissions"
        visible={permissionModalOpen}
        onClose={() => setPermissionModalOpen(false)}
        onSave={handlePermissionModalSave}
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={permissionSearch}
              onChange={(e) => setPermissionSearch(e.target.value)}
              placeholder="Search permissions by name or codename..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm"
            />
            <select
              value={selectedResource}
              onChange={(e) => setSelectedResource(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-md text-sm"
            >
              {resourceOptions.map((opt) => (
                <option key={opt} value={opt}>{opt === 'all' ? 'All resources' : opt}</option>
              ))}
            </select>
          </div>
          
          {/* Global Select All */}
          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isAllPermissionsSelected()}
                onChange={handleSelectAllPermissions}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="font-medium text-blue-900 dark:text-blue-100">
                Select All Available Permissions
              </span>
            </div>
            <span className="text-sm text-blue-700 dark:text-blue-300">
              {permissionModalSelection.length} selected
            </span>
          </div>
          <div className="max-h-96 overflow-y-auto space-y-4">
            {Object.entries(permissionsByContentType).map(([contentType, perms]) => {
              const filteredPerms = perms.filter(p => {
                const q = permissionSearch.trim().toLowerCase();
                const matchesSearch = !q || 
                  (p.name || '').toLowerCase().includes(q) ||
                  (p.codename || '').toLowerCase().includes(q);
                
                const matchesResource = selectedResource === 'all' || 
                  (p?.content_type && typeof p.content_type === 'object' 
                    ? `${p.content_type.app_label}/${p.content_type.model}` === selectedResource
                    : false);
                
                const notAlreadyAssigned = !localUser.user_permissions.some(lp => lp.id === p.id);
                
                return matchesSearch && matchesResource && notAlreadyAssigned;
              });

              if (filteredPerms.length === 0) return null;

              return (
                <div key={contentType} className="border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900 dark:text-white capitalize">
                        {contentType} ({filteredPerms.length})
                      </h4>
                      <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <input
                          type="checkbox"
                          checked={isContentTypeFullySelected(contentType, filteredPerms)}
                          onChange={() => handleContentTypeSelectAll(contentType, filteredPerms)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        Select All
                      </label>
                    </div>
                  </div>
                  <div className="p-3 space-y-2">
                    {filteredPerms.map((permission) => (
                      <label key={permission.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
              <input
                type="checkbox"
                checked={permissionModalSelection.includes(permission.id)}
                onChange={e => {
                  if (e.target.checked) {
                              const newSelection = [...permissionModalSelection, permission.id];
                              setPermissionModalSelection(newSelection);
                              
                              // Check if all permissions in this content type are now selected
                              const allPermissionIds = filteredPerms.map(p => p.id);
                              const isAllSelected = allPermissionIds.every(id => newSelection.includes(id));
                              setContentTypeSelections(prev => ({ ...prev, [contentType]: isAllSelected }));
                              
                              // Update global select all state will be handled by useEffect
                  } else {
                    setPermissionModalSelection(permissionModalSelection.filter(pid => pid !== permission.id));
                              // Update content type selection if individual permission is unchecked
                              setContentTypeSelections(prev => ({ ...prev, [contentType]: false }));
                              // Update global select all state will be handled by useEffect
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {permission.name}
                          </span>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {permission.codename}
                          </p>
                        </div>
            </label>
          ))}
        </div>
        </div>
              );
            })}
        </div>
        </div>
      </CrudModal>
      {/* Roles UI removed (use Groups instead) */}
      {/* Save/Cancel Buttons */}
      {isEditing && (
        <div className="flex gap-2 mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 flex items-center"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default UserPermissions; 