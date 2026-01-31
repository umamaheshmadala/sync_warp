import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

interface AuditLogFiltersProps {
    filters: {
        dateFrom: string;
        dateTo: string;
        adminId: string;
        action: string;
    };
    onFilterChange: (key: string, value: string) => void;
    onReset: () => void;
    admins: { id: string; full_name: string }[];
}

export function AuditLogFilters({ filters, onFilterChange, onReset, admins }: AuditLogFiltersProps) {
    return (
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-4 md:space-y-0 md:flex md:items-end md:gap-4 flex-wrap">
            {/* Date Range */}
            <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">From Date</label>
                <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => onFilterChange('dateFrom', e.target.value)}
                    className="w-full md:w-[150px]"
                />
            </div>
            <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">To Date</label>
                <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => onFilterChange('dateTo', e.target.value)}
                    className="w-full md:w-[150px]"
                />
            </div>

            {/* Admin Filter */}
            <div className="space-y-1 flex-1 min-w-[200px]">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</label>
                <Select
                    value={filters.adminId}
                    onValueChange={(value) => onFilterChange('adminId', value)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="All Admins" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Admins</SelectItem>
                        {admins.map((admin) => (
                            <SelectItem key={admin.id} value={admin.id}>
                                {admin.full_name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Action Filter */}
            <div className="space-y-1 flex-1 min-w-[150px]">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Action Type</label>
                <Select
                    value={filters.action}
                    onValueChange={(value) => onFilterChange('action', value)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="All Actions" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Actions</SelectItem>
                        <SelectItem value="approve">Approve</SelectItem>
                        <SelectItem value="reject">Reject</SelectItem>
                        <SelectItem value="edit">Edit</SelectItem>
                        <SelectItem value="soft_delete">Delete (Soft)</SelectItem>
                        <SelectItem value="hard_delete">Delete (Hard)</SelectItem>
                        <SelectItem value="restore">Restore</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Reset Button */}
            <Button
                variant="ghost"
                onClick={onReset}
                className="text-gray-500 hover:text-red-500 hover:bg-red-50"
                title="Reset Filters"
            >
                <X className="w-4 h-4 mr-2" />
                Reset
            </Button>
        </div>
    );
}
