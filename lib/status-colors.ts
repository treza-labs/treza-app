/**
 * Centralized status color utility for consistent styling across enclave views
 * 
 * This ensures that status colors match between the table view and details page.
 * The colors follow a logical semantic pattern:
 * - Green: Success/Active states (DEPLOYED, ACTIVE, RESUMING)
 * - Blue: In-progress states (DEPLOYING)  
 * - Yellow: Pending states (PENDING_DEPLOY)
 * - Orange: Destructive pending/transition states (PENDING_DESTROY, DESTROYING)
 * - Purple: Pause-related states (PAUSING, PAUSED)
 * - Red: Error states (FAILED)
 * - Gray: Inactive/neutral states (DESTROYED, default)
 */

export type EnclaveStatus = 
  | 'ACTIVE'
  | 'DEPLOYED' 
  | 'DEPLOYING'
  | 'PENDING_DEPLOY'
  | 'PENDING_DESTROY'
  | 'DESTROYING'
  | 'DESTROYED'
  | 'PAUSING'
  | 'PAUSED'
  | 'RESUMING'
  | 'FAILED';

interface StatusColors {
  table: string; // Classes for table badges (rounded pills)
  details: string; // Classes for details page badges (with borders)
}

const STATUS_COLORS: Record<EnclaveStatus, StatusColors> = {
  ACTIVE: {
    table: 'bg-green-500/10 text-green-400',
    details: 'text-green-400 bg-green-500/10 border-green-500/20'
  },
  DEPLOYED: {
    table: 'bg-green-500/10 text-green-400',
    details: 'text-green-400 bg-green-500/10 border-green-500/20'
  },
  DEPLOYING: {
    table: 'bg-blue-500/10 text-blue-400',
    details: 'text-blue-400 bg-blue-500/10 border-blue-500/20'
  },
  PENDING_DEPLOY: {
    table: 'bg-yellow-500/10 text-yellow-400',
    details: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
  },
  PENDING_DESTROY: {
    table: 'bg-orange-500/10 text-orange-400',
    details: 'text-orange-400 bg-orange-500/10 border-orange-500/20'
  },
  DESTROYING: {
    table: 'bg-orange-500/10 text-orange-400',
    details: 'text-orange-400 bg-orange-500/10 border-orange-500/20'
  },
  DESTROYED: {
    table: 'bg-gray-500/10 text-gray-400',
    details: 'text-gray-400 bg-gray-500/10 border-gray-500/20'
  },
  PAUSING: {
    table: 'bg-purple-500/10 text-purple-400',
    details: 'text-purple-400 bg-purple-500/10 border-purple-500/20'
  },
  PAUSED: {
    table: 'bg-purple-500/10 text-purple-400',
    details: 'text-purple-400 bg-purple-500/10 border-purple-500/20'
  },
  RESUMING: {
    table: 'bg-blue-500/10 text-blue-400',
    details: 'text-blue-400 bg-blue-500/10 border-blue-500/20'
  },
  FAILED: {
    table: 'bg-red-500/10 text-red-400',
    details: 'text-red-400 bg-red-500/10 border-red-500/20'
  }
};

const DEFAULT_COLORS: StatusColors = {
  table: 'bg-gray-500/10 text-gray-400',
  details: 'text-gray-400 bg-gray-500/10 border-gray-500/20'
};

/**
 * Get status colors for table view (badge style)
 */
export function getTableStatusColors(status: string): string {
  const statusColors = STATUS_COLORS[status as EnclaveStatus];
  return statusColors?.table || DEFAULT_COLORS.table;
}

/**
 * Get status colors for details view (badge with border)
 */
export function getDetailsStatusColors(status: string): string {
  const statusColors = STATUS_COLORS[status as EnclaveStatus];
  return statusColors?.details || DEFAULT_COLORS.details;
}

/**
 * Format status text for display (replace underscores with spaces and uppercase)
 */
export function formatStatusText(status: string): string {
  return status.replace('_', ' ').toUpperCase();
}
