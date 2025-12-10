import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Bell, Clock, Eye, Mail, MessageSquare, Settings } from 'lucide-react';
import DraggableDataTable, { type ColumnDefinition } from '../../../../components/ui/DraggableDataTable';

interface Notification {
  id: string;
  user: string;
  notification_type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  read_at?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  delivery_channels: string[];
  scheduled_for?: string;
  delivered_at?: string;
  email_sent: boolean;
  sms_sent: boolean;
  push_sent: boolean;
  related_object_type?: string;
  related_object_id?: string;
  action_url?: string;
  action_text?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

interface NotificationListProps {
  notifications: Notification[];
  selectedNotifications: string[];
  handleSelectNotification: (id: string) => void;
  handleSelectAll: () => void;
  markAsRead: (id: string) => void;
  filters: {
    read: 'all' | 'read' | 'unread';
    priority: 'all' | 'low' | 'normal' | 'high' | 'urgent';
    type: string;
    search: string;
  };
}

const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  selectedNotifications,
  handleSelectNotification,
  handleSelectAll,
  markAsRead,
  filters
}) => {
  const [rows, setRows] = useState<Notification[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    setRows(notifications);
  }, [notifications]);

  const onDragStart = (e: React.DragEvent<HTMLTableRowElement>, id: string) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const onDragOver = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (e: React.DragEvent<HTMLTableRowElement>, targetId: string) => {
    e.preventDefault();
    const sourceId = draggingId || e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId) return;

    const current = [...rows];
    const sourceIndex = current.findIndex((r) => r.id === sourceId);
    const targetIndex = current.findIndex((r) => r.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const [moved] = current.splice(sourceIndex, 1);
    current.splice(targetIndex, 0, moved);
    setRows(current);
    setDraggingId(null);
  };
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <div className="w-4 h-4 text-red-500">⚠️</div>;
      case 'high':
        return <div className="w-4 h-4 text-orange-500">🔶</div>;
      case 'normal':
        return <div className="w-4 h-4 text-blue-500">ℹ️</div>;
      case 'low':
        return <div className="w-4 h-4 text-green-500">✅</div>;
      default:
        return <div className="w-4 h-4 text-gray-500">ℹ️</div>;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/20';
      case 'high':
        return 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/20';
      case 'normal':
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20';
      case 'low':
        return 'border-l-green-500 bg-green-50 dark:bg-green-900/20';
      default:
        return 'border-l-gray-500 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getTypeIcon = (type: string) => {
    if (type.includes('payment')) return <Mail className="w-4 h-4" />;
    if (type.includes('message')) return <MessageSquare className="w-4 h-4" />;
    if (type.includes('system')) return <Settings className="w-4 h-4" />;
    return <Bell className="w-4 h-4" />;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const columns: ColumnDefinition[] = useMemo(() => [
    {
      accessor: 'priority',
      title: '',
      width: 40,
      render: (n: Notification) => (
        <div className="mt-1">{getPriorityIcon(n.priority)}</div>
      )
    },
    {
      accessor: 'title_message',
      title: 'Title & Message',
      render: (n: Notification) => (
        <div className="pr-4">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={`text-sm font-medium ${n.read ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>{n.title}</h4>
            {!n.read && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
          </div>
          <p className={`text-sm ${n.read ? 'text-gray-500 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'} mb-2`}>{n.message}</p>
          {n.action_url && n.action_text && (
            <a href={n.action_url} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-xs">{n.action_text}</a>
          )}
          {n.expires_at && new Date(n.expires_at) < new Date() && (
            <span className="ml-2 text-xs text-red-500 font-medium">Expired</span>
          )}
        </div>
      )
    },
    {
      accessor: 'notification_type',
      title: 'Type',
      width: 180,
      render: (n: Notification) => (
        <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
          {getTypeIcon(n.notification_type)}
          {n.notification_type.replace(/_/g, ' ')}
        </div>
      )
    },
    {
      accessor: 'recipient',
      title: 'Recipient',
      width: 220,
      render: (n: Notification) => {
        const recipient = (n as any)?.user_detail?.email
          || (n as any)?.user_email
          || (n as any)?.user_name
          || n.user
          || (n.data?.target_email as string | undefined)
          || (n.data?.target_user as string | undefined)
          || '—';
        return (
          <div className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[220px]" title={String(recipient)}>
            {String(recipient)}
          </div>
        );
      }
    },
    {
      accessor: 'delivery_channels',
      title: 'Channels',
      width: 240,
      render: (n: Notification) => (
        <div className="flex items-center gap-1">
          {n.delivery_channels.map((channel) => {
            const isDelivered = channel === 'email' ? n.email_sent : channel === 'sms' ? n.sms_sent : channel === 'push' ? n.push_sent : true;
            return (
              <span key={channel} className={`px-1.5 py-0.5 rounded text-xs ${isDelivered ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`} title={`${channel}: ${isDelivered ? 'delivered' : 'pending'}`}>
                {channel === 'in_app' ? 'App' : channel.toUpperCase()}
              </span>
            );
          })}
        </div>
      )
    },
    {
      accessor: 'time',
      title: 'Time',
      width: 220,
      render: (n: Notification) => (
        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTimeAgo(n.created_at)}
          </span>
          <span className="text-gray-400">·</span>
          <span>{formatDate(n.created_at)}</span>
        </div>
      )
    },
    {
      accessor: 'actions',
      title: '',
      width: 60,
      textAlign: 'right',
      render: (n: Notification) => (
        !n.read ? (
          <button
            onClick={() => markAsRead(n.id)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            title="Mark as read"
          >
            <Eye className="w-4 h-4" />
          </button>
        ) : null
      )
    }
  ], [markAsRead]);

  const [selectedRecords, setSelectedRecords] = useState<Notification[]>([]);

  useEffect(() => {
    const map = new Map(rows.map(r => [r.id, r] as const));
    setSelectedRecords(selectedNotifications.map(id => map.get(id)).filter(Boolean) as Notification[]);
  }, [rows, selectedNotifications]);

  const onSelectedRecordsChange = useCallback((records: any[]) => {
    const newIds = new Set((records || []).map((r: Notification) => r.id));
    const currentIds = new Set(selectedNotifications);
    // Additions
    rows.forEach(r => {
      if (newIds.has(r.id) && !currentIds.has(r.id)) {
        handleSelectNotification(r.id);
      }
      if (!newIds.has(r.id) && currentIds.has(r.id)) {
        handleSelectNotification(r.id);
      }
    });
  }, [rows, selectedNotifications, handleSelectNotification]);

  const headerContent = (
    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 flex items-center gap-3">
      <input
        type="checkbox"
        checked={selectedNotifications.length === rows.length && rows.length > 0}
        onChange={handleSelectAll}
        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
      />
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Select All</span>
    </div>
  );

  return (
    <DraggableDataTable
      title="Notifications"
      data={rows}
      columns={columns}
      loading={false}
      allowSelection={true}
      selectedRecords={selectedRecords}
      setSelectedRecords={setSelectedRecords}
      onSelectionChange={onSelectedRecordsChange}
      headerContent={headerContent}
      storeKey="notifications-table"
    />
  );
};

export default NotificationList;
