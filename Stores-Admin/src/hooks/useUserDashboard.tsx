import { useState, useEffect } from 'react';
import useAuthUser from 'react-auth-kit/hooks/useAuthUser';
import axiosInstance from '../services/axiosInstance';

interface UserDashboardStats {
    totalMoves: number;
    pendingRequests: number;
    upcomingMoves: number;
}

interface UserMoveRequest {
    id: string;
    title: string;
    type: string;
    progress: number;
    staff_required: number;
    color: string;
    items: number;
    pickup_location: string;
    dropoff_location: string;
    status: 'draft' | 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
}

interface UpcomingMove {
    time: string;
    date: string;
    pickup: string;
    dropoff: string;
    service_type: string;
}

interface UseUserDashboardReturn {
    loading: boolean;
    error: string | null;
    stats: UserDashboardStats;
    moveRequests: UserMoveRequest[];
    upcomingMoves: UpcomingMove[];
    refreshDashboard: () => Promise<void>;
}

export const useUserDashboard = (): UseUserDashboardReturn => {
    const auth = useAuthUser();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [moveRequests, setMoveRequests] = useState<UserMoveRequest[]>([]);
    const [stats, setStats] = useState<UserDashboardStats>({
        totalMoves: 0,
        pendingRequests: 0,
        upcomingMoves: 0,
    });
    const [upcomingMoves, setUpcomingMoves] = useState<UpcomingMove[]>([]);

    const calculateProgress = (status: UserMoveRequest['status']): number => {
        const statusWeights: { [key in UserMoveRequest['status']]: number } = {
            draft: 20,
            pending: 40,
            confirmed: 60,
            in_progress: 80,
            completed: 100,
            cancelled: 0,
        };
        return statusWeights[status];
    };

    const getStatusColor = (status: UserMoveRequest['status']): string => {
        const colors: { [key in UserMoveRequest['status']]: string } = {
            draft: 'bg-gray-600',
            pending: 'bg-purple-600',
            confirmed: 'bg-cyan-500',
            in_progress: 'bg-orange-500',
            completed: 'bg-green-600',
            cancelled: 'bg-red-600',
        };
        return colors[status];
    };

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await axiosInstance.get('/requests/', {
                params: { user_id: auth?.id },
            });

            // Transform requests data
            const requests = response.data.map((request: any) => ({
                id: request.id,
                title: `Move from ${request.pickup_location?.city || 'Unknown'} to ${request.dropoff_location?.city || 'Unknown'}`,
                type: request.service_type,
                progress: calculateProgress(request.status),
                staff_required: request.staff_required || 1,
                color: getStatusColor(request.status),
                items: request.items?.length || 0,
                pickup_location: request.pickup_location?.city || 'Unknown',
                dropoff_location: request.dropoff_location?.city || 'Unknown',
                status: request.status,
            }));

            // Calculate statistics
            const stats = {
                totalMoves: response.data.length,
                pendingRequests: response.data.filter((req: any) => req.status === 'pending').length,
                upcomingMoves: response.data.filter((req: any) => req.status === 'confirmed').length,
            };

            // Get upcoming moves
            const upcomingMoves = response.data
                .filter((req: any) => req.status === 'confirmed')
                .map((move: any) => ({
                    time: new Date(move.preferred_pickup_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    date: new Date(move.preferred_pickup_date).toLocaleDateString(),
                    pickup: move.pickup_location?.city || 'Unknown',
                    dropoff: move.dropoff_location?.city || 'Unknown',
                    service_type: move.service_type,
                }));

            setMoveRequests(requests);
            setStats(stats);
            setUpcomingMoves(upcomingMoves);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setError('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [auth?.id]);

    return {
        loading,
        error,
        stats,
        moveRequests,
        upcomingMoves,
        refreshDashboard: fetchDashboardData,
    };
};

export default useUserDashboard;
