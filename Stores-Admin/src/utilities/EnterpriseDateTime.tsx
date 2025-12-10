import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Initialize the plugins
dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

const EnterpriseDateTime = ({
    date,
    showTime = false,
    showRelative = false,
    pastDueCheck = false,
    status = '',
    format = 'MMM D, YYYY',
    timeFormat = 'h:mm A',
    className = ''
  }: {
    date: string | Date | null;
    showTime?: boolean;
    showRelative?: boolean;
    pastDueCheck?: boolean;
    status?: string;
    format?: string;
    timeFormat?: string;
    className?: string;
  }) => {
    if (!date) return <span className="text-gray-400">—</span>;
    
    const dateObj = dayjs(date);
    const now = dayjs();
    const isPastDue = pastDueCheck && dateObj.isBefore(now) && status !== 'PAID';
    const isToday = dateObj.format('YYYY-MM-DD') === now.format('YYYY-MM-DD');
    const isYesterday = dateObj.format('YYYY-MM-DD') === now.subtract(1, 'day').format('YYYY-MM-DD');
    const isTomorrow = dateObj.format('YYYY-MM-DD') === now.add(1, 'day').format('YYYY-MM-DD');
    
    let dateLabel = dateObj.format(format);
    if (isToday) dateLabel = 'Today';
    if (isYesterday) dateLabel = 'Yesterday';
    if (isTomorrow) dateLabel = 'Tomorrow';
    
    const timeLabel = showTime ? dateObj.format(timeFormat) : '';
    const relativeLabel = showRelative ? dateObj.fromNow() : '';
    
    return (
      <div className={`flex flex-col ${className}`}>
        <div className={`flex items-center gap-2 ${isPastDue ? 'text-red-600 font-medium' : ''}`}>
          <span>{dateLabel}</span>
          {showTime && <span className="text-gray-500">{timeLabel}</span>}
          {isPastDue && (
            <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-800 text-xs rounded-sm whitespace-nowrap">
              Overdue
            </span>
          )}
        </div>
        {showRelative && (
          <span className="text-xs text-gray-500 mt-0.5">
            {relativeLabel}
          </span>
        )}
      </div>
    );
  };


  export default  EnterpriseDateTime;


