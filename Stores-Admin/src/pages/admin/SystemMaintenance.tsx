import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faServer,
  faDatabase,
  faRedo,
  faCog,
  faTrash,
  faCloudDownloadAlt,
  faPowerOff,
  faShieldAlt,
  faFileAlt,
  faExclamationTriangle,
  faCheckCircle,
  faInfoCircle,
  faSpinner,
  faPlayCircle,
  faPauseCircle,
  faSave
} from '@fortawesome/free-solid-svg-icons';

interface SystemStatus {
  apiServer: 'operational' | 'degraded' | 'down';
  database: 'operational' | 'degraded' | 'down';
  fileStorage: 'operational' | 'degraded' | 'down';
  messageQueue: 'operational' | 'degraded' | 'down';
  searchIndex: 'operational' | 'degraded' | 'down';
  lastChecked: string;
}

interface MaintenanceLog {
  id: string;
  type: 'scheduled' | 'emergency' | 'update' | 'backup' | 'cleanup';
  description: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'failed';
  affectedServices: string[];
  performedBy: string;
}

interface BackupInfo {
  id: string;
  name: string;
  size: string;
  createdAt: string;
  type: 'full' | 'partial' | 'config';
  status: 'completed' | 'in-progress' | 'failed';
  downloadUrl?: string;
}

const SystemMaintenance: React.FC = () => {
  const [activeTab, setActiveTab] = useState('status');
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    apiServer: 'operational',
    database: 'operational',
    fileStorage: 'operational',
    messageQueue: 'operational',
    searchIndex: 'operational',
    lastChecked: new Date().toISOString()
  });
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  
  const [maintenanceSettings, setMaintenanceSettings] = useState({
    scheduledStartTime: '',
    scheduledEndTime: '',
    message: 'The system is currently undergoing scheduled maintenance. Please check back later.',
    allowAdminAccess: true
  });
  
  useEffect(() => {
    fetchSystemData();
  }, []);
  
  const fetchSystemData = () => {
    // Mock data for the system status
    const mockSystemStatus: SystemStatus = {
      apiServer: 'operational',
      database: 'operational',
      fileStorage: 'operational',
      messageQueue: 'degraded',
      searchIndex: 'operational',
      lastChecked: new Date().toISOString()
    };
    
    // Mock data for maintenance logs
    const mockMaintenanceLogs: MaintenanceLog[] = [
      {
        id: 'ml-1',
        type: 'scheduled',
        description: 'Regular system maintenance and updates',
        startTime: '2025-04-01T02:00:00',
        endTime: '2025-04-01T05:00:00',
        status: 'completed',
        affectedServices: ['Web Application', 'API Services'],
        performedBy: 'System Admin'
      },
      {
        id: 'ml-2',
        type: 'backup',
        description: 'Weekly database backup',
        startTime: '2025-04-05T03:00:00',
        endTime: '2025-04-05T03:45:00',
        status: 'completed',
        affectedServices: ['Database'],
        performedBy: 'Automated System'
      },
      {
        id: 'ml-3',
        type: 'update',
        description: 'Security patches and updates',
        startTime: '2025-04-08T01:00:00',
        endTime: '2025-04-08T03:30:00',
        status: 'completed',
        affectedServices: ['Web Application', 'API Services', 'File Storage'],
        performedBy: 'System Admin'
      },
      {
        id: 'ml-4',
        type: 'emergency',
        description: 'Emergency fix for database connection issue',
        startTime: '2025-04-10T14:25:00',
        endTime: '2025-04-10T15:45:00',
        status: 'completed',
        affectedServices: ['Database', 'API Services'],
        performedBy: 'Database Admin'
      },
      {
        id: 'ml-5',
        type: 'cleanup',
        description: 'Cleanup of temporary files and old logs',
        startTime: '2025-04-11T02:00:00',
        endTime: '',
        status: 'in-progress',
        affectedServices: ['File Storage'],
        performedBy: 'Automated System'
      },
      {
        id: 'ml-6',
        type: 'scheduled',
        description: 'Monthly system maintenance - Performance optimizations',
        startTime: '2025-05-01T02:00:00',
        endTime: '2025-05-01T06:00:00',
        status: 'scheduled',
        affectedServices: ['Web Application', 'API Services', 'Database', 'Search Index'],
        performedBy: 'System Admin'
      }
    ];
    
    // Mock data for backups
    const mockBackups: BackupInfo[] = [
      {
        id: 'bk-1',
        name: 'Full Backup - 2025-04-10',
        size: '2.3 GB',
        createdAt: '2025-04-10T03:00:00',
        type: 'full',
        status: 'completed',
        downloadUrl: '#'
      },
      {
        id: 'bk-2',
        name: 'Config Backup - 2025-04-10',
        size: '15 MB',
        createdAt: '2025-04-10T03:15:00',
        type: 'config',
        status: 'completed',
        downloadUrl: '#'
      },
      {
        id: 'bk-3',
        name: 'Full Backup - 2025-04-03',
        size: '2.1 GB',
        createdAt: '2025-04-03T03:00:00',
        type: 'full',
        status: 'completed',
        downloadUrl: '#'
      },
      {
        id: 'bk-4',
        name: 'Partial Backup - User Data',
        size: '650 MB',
        createdAt: '2025-04-07T03:00:00',
        type: 'partial',
        status: 'completed',
        downloadUrl: '#'
      },
      {
        id: 'bk-5',
        name: 'Full Backup - Automated',
        size: '2.4 GB',
        createdAt: '2025-04-12T03:00:00',
        type: 'full',
        status: 'in-progress'
      }
    ];
    
    setSystemStatus(mockSystemStatus);
    setMaintenanceLogs(mockMaintenanceLogs);
    setBackups(mockBackups);
  };
  
  const refreshSystemStatus = () => {
    setIsLoading(true);
    
    // Simulate API call with a delay
    setTimeout(() => {
      setIsLoading(false);
      setSystemStatus({
        ...systemStatus,
        lastChecked: new Date().toISOString()
      });
      setSuccessMessage('System status refreshed successfully');
      
      // Clear the success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    }, 1500);
  };
  
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };
  
  const toggleMaintenanceMode = () => {
    if (maintenanceMode) {
      setConfirmAction('disable-maintenance');
    } else {
      setConfirmAction('enable-maintenance');
    }
  };
  
  const confirmToggleMaintenanceMode = () => {
    setIsLoading(true);
    
    // Simulate API call with a delay
    setTimeout(() => {
      setMaintenanceMode(!maintenanceMode);
      setConfirmAction(null);
      setIsLoading(false);
      
      if (!maintenanceMode) {
        setSuccessMessage('Maintenance mode enabled successfully');
      } else {
        setSuccessMessage('Maintenance mode disabled successfully');
      }
      
      // Clear the success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    }, 1500);
  };
  
  const cancelConfirmAction = () => {
    setConfirmAction(null);
  };
  
  const createBackup = (type: 'full' | 'partial' | 'config') => {
    setIsLoading(true);
    
    // Simulate API call with a delay
    setTimeout(() => {
      const newBackup: BackupInfo = {
        id: `bk-${backups.length + 1}`,
        name: `${type === 'full' ? 'Full' : type === 'partial' ? 'Partial' : 'Config'} Backup - ${new Date().toISOString().split('T')[0]}`,
        size: type === 'full' ? '2.5 GB' : type === 'partial' ? '800 MB' : '16 MB',
        createdAt: new Date().toISOString(),
        type,
        status: 'in-progress'
      };
      
      setBackups([newBackup, ...backups]);
      setIsLoading(false);
      setSuccessMessage(`${type === 'full' ? 'Full' : type === 'partial' ? 'Partial' : 'Config'} backup initiated successfully`);
      
      // Simulate the backup completion after some time
      setTimeout(() => {
        setBackups(prevBackups => 
          prevBackups.map(backup => 
            backup.id === newBackup.id 
              ? { ...backup, status: 'completed', downloadUrl: '#' } 
              : backup
          )
        );
      }, 5000);
      
      // Clear the success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    }, 1500);
  };
  
  const deleteBackup = (id: string) => {
    setConfirmAction(`delete-backup-${id}`);
  };
  
  const confirmDeleteBackup = (id: string) => {
    setIsLoading(true);
    
    // Simulate API call with a delay
    setTimeout(() => {
      setBackups(backups.filter(backup => backup.id !== id));
      setConfirmAction(null);
      setIsLoading(false);
      setSuccessMessage('Backup deleted successfully');
      
      // Clear the success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    }, 1500);
  };
  
  const handleMaintenanceSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setMaintenanceSettings({
        ...maintenanceSettings,
        [name]: checkbox.checked
      });
    } else {
      setMaintenanceSettings({
        ...maintenanceSettings,
        [name]: value
      });
    }
  };
  
  const saveMaintenanceSettings = () => {
    setIsLoading(true);
    
    // Simulate API call with a delay
    setTimeout(() => {
      setIsLoading(false);
      setSuccessMessage('Maintenance settings saved successfully');
      
      // Clear the success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    }, 1500);
  };
  
  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  const getStatusClass = (status: string): string => {
    switch (status) {
      case 'operational':
        return 'bg-green-100 text-green-800';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800';
      case 'down':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'scheduled':
        return 'bg-purple-100 text-purple-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <FontAwesomeIcon icon={faCheckCircle} className="text-green-500" />;
      case 'degraded':
        return <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-500" />;
      case 'down':
        return <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500" />;
      case 'completed':
        return <FontAwesomeIcon icon={faCheckCircle} className="text-green-500" />;
      case 'in-progress':
        return <FontAwesomeIcon icon={faSpinner} className="text-blue-500 fa-spin" />;
      case 'scheduled':
        return <FontAwesomeIcon icon={faInfoCircle} className="text-purple-500" />;
      case 'failed':
        return <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500" />;
      default:
        return null;
    }
  };
  
  const getMaintenanceTypeIcon = (type: string) => {
    switch (type) {
      case 'scheduled':
        return <FontAwesomeIcon icon={faCog} />;
      case 'emergency':
        return <FontAwesomeIcon icon={faExclamationTriangle} />;
      case 'update':
        return <FontAwesomeIcon icon={faCloudDownloadAlt} />;
      case 'backup':
        return <FontAwesomeIcon icon={faDatabase} />;
      case 'cleanup':
        return <FontAwesomeIcon icon={faTrash} />;
      default:
        return <FontAwesomeIcon icon={faCog} />;
    }
  };
  
  return (
    <div className="px-4 py-6">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <h2 className="text-xl font-semibold mb-4 md:mb-0">System Maintenance</h2>
        
        {activeTab === 'status' && (
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
            onClick={refreshSystemStatus}
            disabled={isLoading}
          >
            <FontAwesomeIcon icon={faRedo} className={`mr-2 ${isLoading ? 'fa-spin' : ''}`} />
            Refresh Status
          </button>
        )}
        
        {activeTab === 'maintenance' && (
          <button
            className={`${maintenanceMode ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} text-white px-4 py-2 rounded-md flex items-center`}
            onClick={toggleMaintenanceMode}
            disabled={isLoading}
          >
            <FontAwesomeIcon icon={maintenanceMode ? faPowerOff : faShieldAlt} className="mr-2" />
            {maintenanceMode ? 'Disable Maintenance Mode' : 'Enable Maintenance Mode'}
          </button>
        )}
      </div>
      
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
          <span className="block sm:inline">{successMessage}</span>
        </div>
      )}
      
      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <span className="block sm:inline">{errorMessage}</span>
        </div>
      )}
      
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          <button
            className={`flex items-center py-3 px-4 text-sm font-medium ${
              activeTab === 'status'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => handleTabChange('status')}
          >
            <FontAwesomeIcon icon={faServer} className="mr-2" />
            System Status
          </button>
          
          <button
            className={`flex items-center py-3 px-4 text-sm font-medium ${
              activeTab === 'maintenance'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => handleTabChange('maintenance')}
          >
            <FontAwesomeIcon icon={faCog} className="mr-2" />
            Maintenance Mode
          </button>
          
          <button
            className={`flex items-center py-3 px-4 text-sm font-medium ${
              activeTab === 'logs'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => handleTabChange('logs')}
          >
            <FontAwesomeIcon icon={faFileAlt} className="mr-2" />
            Maintenance Logs
          </button>
          
          <button
            className={`flex items-center py-3 px-4 text-sm font-medium ${
              activeTab === 'backups'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => handleTabChange('backups')}
          >
            <FontAwesomeIcon icon={faDatabase} className="mr-2" />
            Backups
          </button>
        </div>
        
        {/* System Status Tab */}
        {activeTab === 'status' && (
          <div className="p-6">
            <div className="mb-4 bg-blue-50 p-4 rounded-md">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <FontAwesomeIcon icon={faInfoCircle} className="text-blue-500" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">System Status Overview</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>Last checked: {formatDate(systemStatus.lastChecked)}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-md p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">API Server</h3>
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(systemStatus.apiServer)}`}>
                    {getStatusIcon(systemStatus.apiServer)}
                    <span className="ml-1 capitalize">{systemStatus.apiServer}</span>
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  The main API server handling requests from web and mobile clients.
                </p>
              </div>
              
              <div className="border border-gray-200 rounded-md p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Database</h3>
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(systemStatus.database)}`}>
                    {getStatusIcon(systemStatus.database)}
                    <span className="ml-1 capitalize">{systemStatus.database}</span>
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Primary database cluster storing application data.
                </p>
              </div>
              
              <div className="border border-gray-200 rounded-md p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">File Storage</h3>
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(systemStatus.fileStorage)}`}>
                    {getStatusIcon(systemStatus.fileStorage)}
                    <span className="ml-1 capitalize">{systemStatus.fileStorage}</span>
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Cloud storage service for user-uploaded files and images.
                </p>
              </div>
              
              <div className="border border-gray-200 rounded-md p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Message Queue</h3>
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(systemStatus.messageQueue)}`}>
                    {getStatusIcon(systemStatus.messageQueue)}
                    <span className="ml-1 capitalize">{systemStatus.messageQueue}</span>
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Service handling asynchronous tasks and message processing.
                </p>
                {systemStatus.messageQueue === 'degraded' && (
                  <div className="mt-2 bg-yellow-50 border-l-4 border-yellow-400 p-2">
                    <p className="text-xs text-yellow-700">
                      Message processing delay of ~15 minutes. Engineers are working on the issue.
                    </p>
                  </div>
                )}
              </div>
              
              <div className="border border-gray-200 rounded-md p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Search Index</h3>
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(systemStatus.searchIndex)}`}>
                    {getStatusIcon(systemStatus.searchIndex)}
                    <span className="ml-1 capitalize">{systemStatus.searchIndex}</span>
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Service powering search functionality across the platform.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Maintenance Mode Tab */}
        {activeTab === 'maintenance' && (
          <div className="p-6">
            <div className={`mb-6 p-4 rounded-md ${maintenanceMode ? 'bg-red-50 border border-red-200' : 'bg-gray-50 border border-gray-200'}`}>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {maintenanceMode ? (
                    <FontAwesomeIcon icon={faPauseCircle} className="text-red-500 text-xl" />
                  ) : (
                    <FontAwesomeIcon icon={faPlayCircle} className="text-green-500 text-xl" />
                  )}
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">
                    Maintenance Mode is currently {maintenanceMode ? 'ENABLED' : 'DISABLED'}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    {maintenanceMode 
                      ? 'The system is in maintenance mode. Only administrators can access the platform.' 
                      : 'The system is operating normally and is accessible to all users.'}
                  </p>
                </div>
              </div>
            </div>
            
            {confirmAction === 'enable-maintenance' && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-300 rounded-md">
                <h3 className="text-lg font-medium text-yellow-800">Confirm Enable Maintenance Mode</h3>
                <p className="mt-2 text-sm text-yellow-700">
                  This will make the system inaccessible to regular users. Only administrators will be able to log in.
                </p>
                <div className="mt-4 flex justify-end space-x-3">
                  <button
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                    onClick={cancelConfirmAction}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                    onClick={confirmToggleMaintenanceMode}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Processing...' : 'Confirm Enable'}
                  </button>
                </div>
              </div>
            )}
            
            {confirmAction === 'disable-maintenance' && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-300 rounded-md">
                <h3 className="text-lg font-medium text-blue-800">Confirm Disable Maintenance Mode</h3>
                <p className="mt-2 text-sm text-blue-700">
                  This will make the system accessible to all users again.
                </p>
                <div className="mt-4 flex justify-end space-x-3">
                  <button
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                    onClick={cancelConfirmAction}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                    onClick={confirmToggleMaintenanceMode}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Processing...' : 'Confirm Disable'}
                  </button>
                </div>
              </div>
            )}
            
            <div className="border border-gray-200 rounded-md p-6">
              <h3 className="text-lg font-medium mb-4">Maintenance Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label htmlFor="scheduledStartTime" className="block text-sm font-medium text-gray-700 mb-1">
                    Scheduled Start Time
                  </label>
                  <input
                    type="datetime-local"
                    id="scheduledStartTime"
                    name="scheduledStartTime"
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={maintenanceSettings.scheduledStartTime}
                    onChange={handleMaintenanceSettingsChange}
                  />
                </div>
                
                <div>
                  <label htmlFor="scheduledEndTime" className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated End Time
                  </label>
                  <input
                    type="datetime-local"
                    id="scheduledEndTime"
                    name="scheduledEndTime"
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={maintenanceSettings.scheduledEndTime}
                    onChange={handleMaintenanceSettingsChange}
                  />
                </div>
              </div>
              
              <div className="mb-6">
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                  Maintenance Message (Displayed to Users)
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={maintenanceSettings.message}
                  onChange={handleMaintenanceSettingsChange}
                ></textarea>
              </div>
              
              <div className="flex items-center mb-6">
                <input
                  type="checkbox"
                  id="allowAdminAccess"
                  name="allowAdminAccess"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={maintenanceSettings.allowAdminAccess}
                  onChange={handleMaintenanceSettingsChange}
                />
                <label htmlFor="allowAdminAccess" className="ml-2 block text-sm text-gray-900">
                  Allow administrators to access the system during maintenance
                </label>
              </div>
              
              <div className="flex justify-end">
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
                  onClick={saveMaintenanceSettings}
                  disabled={isLoading}
                >
                  <FontAwesomeIcon icon={faSave} className="mr-2" />
                  {isLoading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Maintenance Logs Tab */}
        {activeTab === 'logs' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Affected Services
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performed By
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {maintenanceLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 text-gray-500">
                          {getMaintenanceTypeIcon(log.type)}
                        </div>
                        <div className="ml-2 text-sm font-medium text-gray-900 capitalize">
                          {log.type}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{log.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        Start: {formatDate(log.startTime)}
                      </div>
                      {log.endTime && (
                        <div className="text-sm text-gray-500">
                          End: {formatDate(log.endTime)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(log.status)}`}>
                        {getStatusIcon(log.status)}
                        <span className="ml-1 capitalize">{log.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {log.affectedServices.map((service, index) => (
                          <span key={index} className="inline-block px-2 py-1 mr-1 mb-1 text-xs bg-gray-100 rounded-md">
                            {service}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.performedBy}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Backups Tab */}
        {activeTab === 'backups' && (
          <div className="p-6">
            <div className="mb-6 flex flex-wrap gap-3">
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
                onClick={() => createBackup('full')}
                disabled={isLoading}
              >
                <FontAwesomeIcon icon={faDatabase} className="mr-2" />
                Create Full Backup
              </button>
              
              <button
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center"
                onClick={() => createBackup('partial')}
                disabled={isLoading}
              >
                <FontAwesomeIcon icon={faDatabase} className="mr-2" />
                Create Partial Backup
              </button>
              
              <button
                className="bg-blue-400 hover:bg-blue-500 text-white px-4 py-2 rounded-md flex items-center"
                onClick={() => createBackup('config')}
                disabled={isLoading}
              >
                <FontAwesomeIcon icon={faCog} className="mr-2" />
                Backup Configuration
              </button>
            </div>
            
            {backups.map((backup) => (
              <div 
                key={backup.id} 
                className="mb-4 p-4 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center">
                      <span className="text-lg font-medium text-gray-900">{backup.name}</span>
                      <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${getStatusClass(backup.status)}`}>
                        {getStatusIcon(backup.status)}
                        <span className="ml-1">{backup.status}</span>
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      Created: {formatDate(backup.createdAt)} • Size: {backup.size}
                    </div>
                    <div className="mt-1">
                      <span className={`px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800`}>
                        {backup.type === 'full' ? 'Full Backup' : backup.type === 'partial' ? 'Partial Backup' : 'Config Backup'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-3 md:mt-0">
                    {backup.status === 'completed' && backup.downloadUrl && (
                      <a
                        href={backup.downloadUrl}
                        className="text-blue-600 hover:text-blue-900 px-3 py-1 border border-blue-300 rounded-md flex items-center"
                      >
                        <FontAwesomeIcon icon={faCloudDownloadAlt} className="mr-1" />
                        Download
                      </a>
                    )}
                    
                    {backup.status !== 'in-progress' && (
                      <button
                        onClick={() => deleteBackup(backup.id)}
                        className="text-red-600 hover:text-red-900 px-3 py-1 border border-red-300 rounded-md flex items-center"
                      >
                        <FontAwesomeIcon icon={faTrash} className="mr-1" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                
                {confirmAction === `delete-backup-${backup.id}` && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-700 mb-2">
                      Are you sure you want to delete this backup? This action cannot be undone.
                    </p>
                    <div className="flex justify-end space-x-2">
                      <button
                        className="px-3 py-1 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                        onClick={cancelConfirmAction}
                      >
                        Cancel
                      </button>
                      <button
                        className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700"
                        onClick={() => confirmDeleteBackup(backup.id)}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Deleting...' : 'Confirm Delete'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemMaintenance;