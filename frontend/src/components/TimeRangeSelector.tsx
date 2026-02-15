import React from 'react';

type TimeRange = 'today' | '7d' | '30d' | 'year' | 'all';

interface TimeRangeSelectorProps {
    activeRange: TimeRange;
    onChange: (range: TimeRange) => void;
}

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({ activeRange, onChange }) => {
    const ranges: { value: TimeRange; label: string }[] = [
        { value: 'today', label: 'Today' },
        { value: '7d', label: '7 Days' },
        { value: '30d', label: '30 Days' },
        { value: 'year', label: 'Year' },
        { value: 'all', label: 'All Time' },
    ];

    return (
        <div className="flex space-x-2 bg-gray-800 p-1 rounded-lg inline-block mb-6">
            {ranges.map((range) => (
                <button
                    key={range.value}
                    onClick={() => onChange(range.value)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeRange === range.value
                            ? 'bg-green-500 text-white shadow-lg'
                            : 'text-gray-400 hover:text-white hover:bg-gray-700'
                        }`}
                >
                    {range.label}
                </button>
            ))}
        </div>
    );
};

export default TimeRangeSelector;
