import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { IconArrowLeft, IconUsers, IconUserPlus, IconUserMinus, IconSearch, IconRefresh, IconFilter } from '@tabler/icons-react';
import { usePermissionService } from '../../../../hooks/usePermissionService';

type User = {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    user_type: 'admin' | 'provider' | 'customer';
};

type Group = {
    id: number;
    name: string;
    user_count?: number;
    users?: User[];
};

const GroupPage: React.FC = () => {
    const { groupId } = useParams<{ groupId: string }>();
    const navigate = useNavigate();
    const { groups, userGroups } = usePermissionService();
    
    const [group, setGroup] = useState<Group | null>(null);
    const [usersInGroup, setUsersInGroup] = useState<User[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [userTypeFilter, setUserTypeFilter] = useState<string>('all');
    
    // Selection state
    const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);
    const [selectedToRemove, setSelectedToRemove] = useState<string[]>([]);

    useEffect(() => {
        if (groupId) {
            loadGroupData();
        }
    }, [groupId]);

    const loadGroupData = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            const [groupData, usersData] = await Promise.all([
                groups.getDetail(parseInt(groupId!)),
                userGroups.getUsersWithGroups()
            ]);
            
            setGroup(groupData);
            setUsersInGroup(groupData.users || []);
            setAllUsers(usersData);
        } catch (error) {
            console.error('Error loading group data:', error);
        } finally {
            if (isRefresh) {
                setRefreshing(false);
            } else {
                setLoading(false);
            }
        }
    };

    const handleAddUsers = async () => {
        if (selectedToAdd.length === 0) return;
        
        try {
            await groups.addUsers(parseInt(groupId!), selectedToAdd);
            await loadGroupData(false);
            setSelectedToAdd([]);
        } catch (error) {
            console.error('Error adding users:', error);
        }
    };

    const handleRemoveUsers = async () => {
        if (selectedToRemove.length === 0) return;
        
        try {
            await groups.removeUsers(parseInt(groupId!), selectedToRemove);
            await loadGroupData(false);
            setSelectedToRemove([]);
        } catch (error) {
            console.error('Error removing users:', error);
        }
    };

    const toggleUserSelection = (userId: string, action: 'add' | 'remove') => {
        if (action === 'add') {
            setSelectedToAdd(prev => 
                prev.includes(userId) 
                    ? prev.filter(id => id !== userId)
                    : [...prev, userId]
            );
        } else {
            setSelectedToRemove(prev => 
                prev.includes(userId) 
                    ? prev.filter(id => id !== userId)
                    : [...prev, userId]
            );
        }
    };

    // Select All functionality
    const handleSelectAllToAdd = () => {
        if (selectedToAdd.length === availableUsers.length) {
            setSelectedToAdd([]);
        } else {
            setSelectedToAdd(availableUsers.map(user => user.id));
        }
    };

    const handleSelectAllToRemove = () => {
        if (selectedToRemove.length === filteredUsersInGroup.length) {
            setSelectedToRemove([]);
        } else {
            setSelectedToRemove(filteredUsersInGroup.map(user => user.id));
        }
    };

    // Filter users not in the group
    const availableUsers = allUsers.filter(user => {
        const notInGroup = !usersInGroup.some(groupUser => groupUser.id === user.id);
        const matchesSearch = user.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            user.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            user.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesUserType = userTypeFilter === 'all' || user.user_type === userTypeFilter;
        
        return notInGroup && matchesSearch && matchesUserType;
    });

    // Filter users in the group
    const filteredUsersInGroup = usersInGroup.filter(user => {
        const matchesSearch = user.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            user.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            user.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesUserType = userTypeFilter === 'all' || user.user_type === userTypeFilter;
        
        return matchesSearch && matchesUserType;
    });

    // if (loading) {
    //     return (
    //         <div className="min-h-[400px] flex items-center justify-center">
    //             <div className="flex flex-col items-center gap-4">
    //                 <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
    //                 <p className="text-gray-600 dark:text-gray-400">Loading group data...</p>
    //             </div>
    //         </div>
    //     );
    // }

    if (!group) {
        return (
            <div className="min-h-[400px] flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600 dark:text-gray-400">Group not found</p>
                    <button
                        onClick={() => navigate('/admin/users/roles')}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Back to Groups
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/admin/users/roles')}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <IconArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{group.name}</h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            {usersInGroup.length} users in group
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => loadGroupData(true)}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                    <IconRefresh className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <IconSearch className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search users by name or email..."
                        className="block w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <IconFilter className="h-5 w-5 text-gray-400" />
                    <select
                        value={userTypeFilter}
                        onChange={(e) => setUserTypeFilter(e.target.value)}
                        className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                        <option value="all">All User Types</option>
                        <option value="admin">Admin</option>
                        <option value="provider">Provider</option>
                        <option value="customer">Customer</option>
                    </select>
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Users in Group */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <IconUsers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                    Users in Group ({filteredUsersInGroup.length})
                                </h3>
                            </div>
                            <div className="flex items-center gap-2">
                                {filteredUsersInGroup.length > 0 && (
                                    <button
                                        onClick={handleSelectAllToRemove}
                                        className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        {selectedToRemove.length === filteredUsersInGroup.length ? 'Deselect All' : 'Select All'}
                                    </button>
                                )}
                                {selectedToRemove.length > 0 && (
                                    <button
                                        onClick={handleRemoveUsers}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                                    >
                                        <IconUserMinus className="w-4 h-4" />
                                        Remove ({selectedToRemove.length})
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="p-4 max-h-96 overflow-y-auto">
                        {filteredUsersInGroup.length > 0 ? (
                            <div className="space-y-2">
                                {filteredUsersInGroup.map((user) => (
                                    <div
                                        key={user.id}
                                        className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedToRemove.includes(user.id)}
                                            onChange={() => toggleUserSelection(user.id, 'remove')}
                                            className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                                        />
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {user.first_name} {user.last_name}
                                            </p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
                                            <span className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${
                                                user.user_type === 'admin' 
                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                                                    : user.user_type === 'provider'
                                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                            }`}>
                                                {user.user_type}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <IconUsers className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                                <p className="text-gray-600 dark:text-gray-400">No users in group</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Available Users */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <IconUserPlus className="w-5 h-5 text-green-600 dark:text-green-400" />
                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                    Available Users ({availableUsers.length})
                                </h3>
                            </div>
                            <div className="flex items-center gap-2">
                                {availableUsers.length > 0 && (
                                    <button
                                        onClick={handleSelectAllToAdd}
                                        className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        {selectedToAdd.length === availableUsers.length ? 'Deselect All' : 'Select All'}
                                    </button>
                                )}
                                {selectedToAdd.length > 0 && (
                                    <button
                                        onClick={handleAddUsers}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                                    >
                                        <IconUserPlus className="w-4 h-4" />
                                        Add ({selectedToAdd.length})
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="p-4 max-h-96 overflow-y-auto">
                        {availableUsers.length > 0 ? (
                            <div className="space-y-2">
                                {availableUsers.map((user) => (
                                    <div
                                        key={user.id}
                                        className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedToAdd.includes(user.id)}
                                            onChange={() => toggleUserSelection(user.id, 'add')}
                                            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                                        />
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {user.first_name} {user.last_name}
                                            </p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
                                            <span className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${
                                                user.user_type === 'admin' 
                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                                                    : user.user_type === 'provider'
                                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                            }`}>
                                                {user.user_type}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <IconUserPlus className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                                <p className="text-gray-600 dark:text-gray-400">No available users</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GroupPage;