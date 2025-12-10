// import { useState, useEffect, useCallback } from 'react';
// import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, Pie, PieChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, Brush, AreaChart, Area } from 'recharts';
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// import { 
//   faChartLine, faClock, faDesktop, faDollarSign, faMobileAlt, faUsers, faSync, faExclamationCircle 
// } from '@fortawesome/free-solid-svg-icons';
// import { fetchAnalyticsData } from '../services/analyticsService'; // API service
// import SkeletonLoader from '../components/SkeletonLoader'; // Loading state component
// import ErrorState from '../components/ErrorState'; // Error handling component
// import { formatCurrency, formatNumber } from '../utils/formatters'; // Formatting utilities
// import DateRangePicker from '../components/DateRangePicker'; // Custom date picker
// import { useTranslation } from 'react-i18next'; // Internationalization

// const AnalyticsDashboard = () => {
//   const { t } = useTranslation();
//   const { theme } = useTheme();
//   const [dateRange, setDateRange] = useState({ start: '7d', end: 'now' });
//   const [metrics, setMetrics] = useState(null);
//   const [chartData, setChartData] = useState(null);
//   const [trafficData, setTrafficData] = useState(null);
//   const [activityLog, setActivityLog] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   const chartColors = {
//     light: { text: '#374151', grid: '#e5e7eb', primary: '#3b82f6', secondary: '#10b981' },
//     dark: { text: '#f3f4f6', grid: '#4b5563', primary: '#60a5fa', secondary: '#34d399' }
//   };

//   const loadData = useCallback(async () => {
//     try {
//       setLoading(true);
//       const data = await fetchAnalyticsData(dateRange);
//       setMetrics(data.metrics);
//       setChartData(data.userActivity);
//       setTrafficData(data.trafficSources);
//       setActivityLog(data.recentActivity);
//       setError(null);
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setLoading(false);
//     }
//   }, [dateRange]);

//   useEffect(() => {
//     loadData();
//   }, [loadData]);

//   const handleDateChange = (newRange) => {
//     setDateRange(newRange);
//   };

//   if (error) return <ErrorState message={error} onRetry={loadData} />;
//   if (loading) return <SkeletonLoader type="analytics" />;

//   return (
//     <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
//       {/* Header with Refresh Control */}
//       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
//         <div>
//           <h1 className="text-3xl font-bold">{t('analytics.title')}</h1>
//           <p className="text-gray-600 dark:text-gray-400 mt-2">
//             {t('analytics.lastUpdated')}: {new Date().toLocaleTimeString()}
//           </p>
//         </div>
//         <div className="flex gap-4 items-center">
//           <DateRangePicker value={dateRange} onChange={handleDateChange} />
//           <button 
//             onClick={loadData}
//             className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 transition-colors"
//             aria-label={t('common.refresh')}
//           >
//             <FontAwesomeIcon icon={faSync} className="text-lg" />
//           </button>
//         </div>
//       </div>

//       {/* Key Metrics Grid */}
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
//         {Object.entries(metrics).map(([key, metric]) => (
//           <div 
//             key={key}
//             className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm transition-all hover:shadow-md"
//           >
//             <div className="flex items-center justify-between">
//               <div className={`p-3 rounded-full ${metric.color} bg-opacity-20`}>
//                 <FontAwesomeIcon 
//                   icon={metric.icon} 
//                   className={`text-xl ${metric.color}`} 
//                 />
//               </div>
//               <span className={`text-sm font-semibold ${
//                 metric.trend === 'positive' ? 'text-green-600' : 'text-red-600'
//               }`}>
//                 {metric.change}
//               </span>
//             </div>
//             <h3 className="text-2xl font-bold mt-4 mb-2 dark:text-white">
//               {metric.type === 'currency' ? formatCurrency(metric.value) : 
//                metric.type === 'percentage' ? `${metric.value}%` : 
//                formatNumber(metric.value)}
//             </h3>
//             <p className="text-gray-600 dark:text-gray-400">{t(`analytics.metrics.${key}`)}</p>
//           </div>
//         ))}
//       </div>

//       {/* Interactive Main Chart */}
//       <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
//         <h2 className="text-xl font-semibold mb-6 dark:text-white">{t('analytics.userActivity')}</h2>
//         <div className="h-96">
//           <ResponsiveContainer width="100%" height="100%">
//             <AreaChart data={chartData}>
//               <CartesianGrid 
//                 strokeDasharray="3 3" 
//                 stroke={chartColors[theme].grid} 
//               />
//               <XAxis 
//                 dataKey="date" 
//                 tick={{ fill: chartColors[theme].text }}
//                 stroke={chartColors[theme].text}
//               />
//               <YAxis 
//                 tick={{ fill: chartColors[theme].text }}
//                 stroke={chartColors[theme].text}
//               />
//               <Tooltip
//                 contentStyle={{
//                   backgroundColor: theme === 'dark' ? '#1f2937' : '#fff',
//                   borderColor: theme === 'dark' ? '#374151' : '#e5e7eb'
//                 }}
//               />
//               <Legend />
//               <Area 
//                 type="monotone" 
//                 dataKey="activeUsers" 
//                 stroke={chartColors[theme].primary}
//                 fill={chartColors[theme].primary}
//                 fillOpacity={0.1}
//                 strokeWidth={2}
//                 name={t('analytics.activeUsers')}
//               />
//               <Brush
//                 dataKey="date"
//                 height={30}
//                 stroke={chartColors[theme].primary}
//                 fill={theme === 'dark' ? '#374151' : '#f3f4f6'}
//               />
//             </AreaChart>
//           </ResponsiveContainer>
//         </div>
//       </div>

//       {/* Secondary Insights Section */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
//         {/* Traffic Sources Pie Chart */}
//         <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
//           <h2 className="text-xl font-semibold mb-6 dark:text-white">{t('analytics.trafficSources')}</h2>
//           <div className="h-96">
//             <ResponsiveContainer width="100%" height="100%">
//               <PieChart>
//                 <Pie
//                   data={trafficData}
//                   dataKey="value"
//                   nameKey="source"
//                   cx="50%"
//                   cy="50%"
//                   outerRadius={120}
//                   label
//                 >
//                   {trafficData.map((entry, index) => (
//                     <Cell 
//                       key={`cell-${index}`} 
//                       fill={[
//                         chartColors[theme].primary,
//                         chartColors[theme].secondary,
//                         '#f59e0b',
//                         '#8b5cf6'
//                       ][index % 4]}
//                     />
//                   ))}
//                 </Pie>
//                 <Tooltip
//                   contentStyle={{
//                     backgroundColor: theme === 'dark' ? '#1f2937' : '#fff',
//                     borderColor: theme === 'dark' ? '#374151' : '#e5e7eb'
//                   }}
//                 />
//                 <Legend
//                   wrapperStyle={{ paddingTop: '20px' }}
//                   formatter={(value) => t(`analytics.sources.${value}`)}
//                 />
//               </PieChart>
//             </ResponsiveContainer>
//           </div>
//         </div>

//         {/* Real-Time Activity Feed */}
//         <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
//           <div className="p-6 border-b dark:border-gray-700">
//             <h2 className="text-xl font-semibold dark:text-white">{t('analytics.recentActivity')}</h2>
//           </div>
//           <div className="overflow-x-auto max-h-96">
//             <table className="w-full">
//               <thead className="bg-gray-50 dark:bg-gray-700">
//                 <tr>
//                   {['user', 'action', 'timestamp', 'status'].map((header) => (
//                     <th 
//                       key={header}
//                       className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-300"
//                     >
//                       {t(`analytics.${header}`)}
//                     </th>
//                   ))}
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
//                 {activityLog.map((log) => (
//                   <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
//                     <td className="px-6 py-4 font-medium dark:text-white">{log.user}</td>
//                     <td className="px-6 py-4 dark:text-gray-300">{t(`analytics.actions.${log.action}`)}</td>
//                     <td className="px-6 py-4 dark:text-gray-300">
//                       {new Date(log.timestamp).toLocaleString()}
//                     </td>
//                     <td className="px-6 py-4">
//                       <span className={`px-2 py-1 rounded-full text-sm ${
//                         log.status === 'success' 
//                           ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
//                           : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
//                       }`}>
//                         {t(`common.${log.status}`)}
//                       </span>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       </div>

//       {/* Additional Insights */}
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
//         {/* Performance Metrics */}
//         <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
//           <h3 className="text-lg font-semibold mb-4 dark:text-white">{t('analytics.performance')}</h3>
//           <div className="space-y-4">
//             {['loadTime', 'apiResponse', 'uptime'].map((metric) => (
//               <div key={metric} className="flex items-center justify-between">
//                 <span className="text-gray-600 dark:text-gray-400">{t(`analytics.${metric}`)}</span>
//                 <span className="font-medium dark:text-white">
//                   {metrics[metric].value}{metric === 'uptime' ? '%' : 'ms'}
//                 </span>
//               </div>
//             ))}
//           </div>
//         </div>

//         {/* Geographical Distribution */}
//         <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm lg:col-span-2">
//           <h3 className="text-lg font-semibold mb-4 dark:text-white">{t('analytics.geoDistribution')}</h3>
//           <div className="h-64">
//             <ResponsiveContainer width="100%" height="100%">
//               <BarChart data={metrics.geoDistribution}>
//                 <CartesianGrid strokeDasharray="3 3" stroke={chartColors[theme].grid} />
//                 <XAxis 
//                   dataKey="country" 
//                   tick={{ fill: chartColors[theme].text }}
//                   stroke={chartColors[theme].text}
//                 />
//                 <YAxis 
//                   tick={{ fill: chartColors[theme].text }}
//                   stroke={chartColors[theme].text}
//                 />
//                 <Tooltip
//                   contentStyle={{
//                     backgroundColor: theme === 'dark' ? '#1f2937' : '#fff',
//                     borderColor: theme === 'dark' ? '#374151' : '#e5e7eb'
//                   }}
//                 />
//                 <Bar 
//                   dataKey="users" 
//                   fill={chartColors[theme].primary} 
//                   name={t('analytics.users')}
//                 />
//               </BarChart>
//             </ResponsiveContainer>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default AnalyticsDashboard;