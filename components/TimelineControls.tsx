import React from 'react';
import type { ViewType } from '../types';
import { SearchIcon } from './Icons';

interface TimelineControlsProps {
  view: ViewType;
  onViewChange: (view: ViewType) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onClearFilters: () => void;
}

const TimelineControls: React.FC<TimelineControlsProps> = ({
  view,
  onViewChange,
  searchTerm,
  setSearchTerm,
  onClearFilters,
}) => {
  const hasActiveFilter = searchTerm !== '';

  return (
    <div className="flex-shrink-0 p-2 bg-gray-800 border-b border-gray-700 flex flex-wrap items-center justify-between gap-2 text-sm z-10">
        <div className="flex flex-wrap items-center gap-2">
            {view === 'timeline' && (
                <>
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <SearchIcon className="h-5 w-5 text-gray-400" />
                        </span>
                        <input
                        type="text"
                        placeholder="搜索事件..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-48 pl-10 pr-3 py-2 bg-gray-700 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    
                    {hasActiveFilter && (
                      <button
                          onClick={onClearFilters}
                          className="px-3 py-2 bg-gray-600 rounded-md hover:bg-gray-500 transition-colors"
                      >
                          清除筛选
                      </button>
                    )}
                </>
            )}
        </div>
        <div className="flex items-center space-x-2">
            <button
              onClick={() => onViewChange('timeline')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                view === 'timeline'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              时间线视图
            </button>
            <button
              onClick={() => onViewChange('characters')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                view === 'characters'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              人物关系图
            </button>
        </div>
    </div>
  );
};

export default TimelineControls;
