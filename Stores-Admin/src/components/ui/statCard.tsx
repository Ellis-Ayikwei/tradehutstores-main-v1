// This component goes inside your UserDashboard.tsx file or can be moved to a separate file

import { faArrowDown, faArrowUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface StatCardProps {
    icon: any;
    title: string;
    value: number | string;
    color: 'blue' | 'purple' | 'green' | 'yellow' | 'red' | 'indigo';
    trend?: {
      value: number;
      isPositive: boolean;
    };
    isLoading?: boolean;
  }
  
  const StatCard: React.FC<StatCardProps> = ({ 
    icon, 
    title, 
    value, 
    color, 
    trend, 
    isLoading = false 
  }) => {
    const getColorClasses = (color: string) => {
      const colorMap: {[key: string]: {bg: string, bgDark: string, text: string, textDark: string, border: string}} = {
        blue: {
          bg: 'bg-blue-100', 
          bgDark: 'dark:bg-blue-900/50',
          text: 'text-blue-500',
          textDark: 'dark:text-blue-400',
          border: 'border-blue-500'
        },
        purple: {
          bg: 'bg-purple-100',
          bgDark: 'dark:bg-purple-900/50',
          text: 'text-purple-500',
          textDark: 'dark:text-purple-400',
          border: 'border-purple-500'
        },
        green: {
          bg: 'bg-green-100',
          bgDark: 'dark:bg-green-900/50',
          text: 'text-green-500',
          textDark: 'dark:text-green-400',
          border: 'border-green-500'
        },
        yellow: {
          bg: 'bg-yellow-100',
          bgDark: 'dark:bg-yellow-900/50',
          text: 'text-yellow-500',
          textDark: 'dark:text-yellow-400',
          border: 'border-yellow-500'
        },
        red: {
          bg: 'bg-red-100',
          bgDark: 'dark:bg-red-900/50',
          text: 'text-red-500',
          textDark: 'dark:text-red-400',
          border: 'border-red-500'
        },
        indigo: {
          bg: 'bg-indigo-100',
          bgDark: 'dark:bg-indigo-900/50',
          text: 'text-indigo-500',
          textDark: 'dark:text-indigo-400',
          border: 'border-indigo-500'
        }
      };
      
      return colorMap[color] || colorMap.blue;
    };
    
    const colors = getColorClasses(color);
    
    return (
      <div className="group relative bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border-l-4 hover:shadow-lg transition-all duration-300 hover:translate-y-[-2px] overflow-hidden" style={{borderLeftColor: `var(--tw-${color}-500)`}}>
        {/* Decorative background element */}
        <div className="absolute right-0 top-0 w-20 h-20 opacity-5 transition-all duration-300 group-hover:scale-125">
          <FontAwesomeIcon icon={icon} className="w-full h-full" />
        </div>
        
        <div className="flex items-center">
          <div className={`rounded-full ${colors.bg} ${colors.bgDark} p-3 mr-4 transition-all duration-300 group-hover:scale-110`}>
            <FontAwesomeIcon icon={icon} className={`${colors.text} ${colors.textDark} text-xl`} />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
            {isLoading ? (
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 animate-pulse rounded mt-1"></div>
            ) : (
              <div className="flex items-end">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {value}
                </p>
                
                {trend && (
                  <div className={`ml-2 mb-1 flex items-center text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    <FontAwesomeIcon 
                      icon={trend.isPositive ? faArrowUp : faArrowDown}
                      className="mr-1"
                    />
                    <span>{Math.abs(trend.value)}%</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };


export default StatCard;