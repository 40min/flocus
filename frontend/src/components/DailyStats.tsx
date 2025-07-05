import React from 'react';
import { useDailyStats } from 'hooks/useDailyStats';
import { formatDurationFromSeconds } from 'lib/utils';
import { Timer, CheckCircle } from 'lucide-react';

const DailyStats: React.FC = () => {
  const { data: stats, isLoading, isError, error } = useDailyStats();

  if (isLoading) {
    return (
      <div className="flex items-center gap-6 text-sm text-slate-600 bg-background-card p-2 rounded-md">
        <div className="flex items-center gap-2 animate-pulse">
          <Timer className="h-5 w-5" />
          <span>Loading stats...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    console.error('Failed to load daily stats:', error);
    return (
      <div className="flex items-center gap-6 text-sm text-red-500">
        <div className="flex items-center gap-2">
          <Timer className="h-5 w-5" />
          <span>Error</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6 text-sm text-slate-600">
      <div className="flex items-center gap-2" title="Total time worked today">
        <Timer className="h-5 w-5" />
        <span className="font-medium">{formatDurationFromSeconds(stats?.total_seconds_spent ?? 0)}</span>
        <span className="hidden sm:inline">Time Worked</span>
      </div>
      <div className="flex items-center gap-2" title="Pomodoros completed today">
        <CheckCircle className="h-5 w-5 text-green-500" />
        <span className="font-medium">{stats?.pomodoros_completed ?? 0}</span>
        <span className="hidden sm:inline">Pomos Done</span>
      </div>
    </div>
  );
};

export default DailyStats;
