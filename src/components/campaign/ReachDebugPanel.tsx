/**
 * ReachDebugPanel Component
 * Shows detailed debug information about reach estimation
 * Features:
 * - Query execution time
 * - Matching users count
 * - Applied filters display
 * - SQL query viewer
 * - Refresh capability
 */

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Code, RefreshCw, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface ReachDebugPanelProps {
  sqlQuery: string;
  executionTime: number;
  totalUsers: number;
  matchingUsers: number;
  reachPercentage: number;
  filters: Record<string, any>;
  onRefresh?: () => void;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ReachDebugPanel({
  sqlQuery,
  executionTime,
  totalUsers,
  matchingUsers,
  reachPercentage,
  filters,
  onRefresh,
  className = ''
}: ReachDebugPanelProps) {
  const [showSQL, setShowSQL] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  
  const appliedFilters = Object.entries(filters).filter(([_, value]) => {
    if (value === undefined || value === null) return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  });

  const formatFilterValue = (value: any): string => {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const getPerformanceColor = (time: number): string => {
    if (time < 100) return 'text-green-600 bg-green-50';
    if (time < 500) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            <CardTitle>Reach Estimation Debug</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">
              Real-time
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Performance Stats */}
          <div className="grid grid-cols-4 gap-3">
            <div className={`p-3 rounded-lg ${getPerformanceColor(executionTime)}`}>
              <div className="text-xs font-medium">Query Time</div>
              <div className="text-xl font-bold">{executionTime}ms</div>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="text-xs font-medium text-purple-600">Total Users</div>
              <div className="text-xl font-bold text-purple-900">
                {totalUsers.toLocaleString()}
              </div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="text-xs font-medium text-green-600">Matching</div>
              <div className="text-xl font-bold text-green-900">
                {matchingUsers.toLocaleString()}
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-xs font-medium text-blue-600">Reach %</div>
              <div className="text-xl font-bold text-blue-900">
                {reachPercentage.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Applied Filters */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium">Applied Filters</div>
              <Badge variant={appliedFilters.length > 0 ? 'default' : 'secondary'}>
                {appliedFilters.length} active
              </Badge>
            </div>
            
            {appliedFilters.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {appliedFilters.map(([key, value]) => (
                  <Badge 
                    key={key} 
                    variant="secondary" 
                    className="gap-1 px-3 py-1"
                  >
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                    <span className="font-medium">{key}:</span>
                    <span className="text-muted-foreground">{formatFilterValue(value)}</span>
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <XCircle className="w-4 h-4 text-yellow-600" />
                <span>No filters applied - targeting all users in the city</span>
              </div>
            )}
          </div>

          {/* SQL Query Viewer */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSQL(!showSQL)}
                className="text-sm"
              >
                <Code className="w-4 h-4 mr-2" />
                {showSQL ? 'Hide' : 'Show'} SQL Query
              </Button>
              {showSQL && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(sqlQuery)}
                >
                  Copy
                </Button>
              )}
            </div>
            
            {showSQL && (
              <div className="relative">
                <pre className="p-4 bg-gray-900 text-green-400 rounded-lg text-xs overflow-x-auto font-mono">
                  {sqlQuery}
                </pre>
                <div className="absolute top-2 right-2">
                  <Badge variant="outline" className="bg-gray-800 text-green-400 border-green-600">
                    PostgreSQL
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="border-t pt-4">
            <div className="text-xs text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1">
              <p className="font-medium text-blue-900">💡 Debug Tips:</p>
              <ul className="space-y-0.5 text-blue-700">
                <li>• Query time &lt;100ms is excellent</li>
                <li>• Check if filters are being applied correctly</li>
                <li>• SQL query shows actual database conditions</li>
                <li>• Refresh to see real-time changes</li>
              </ul>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default ReachDebugPanel;
