export function formatCurrency(amount: number, compact = false): string {
  if (isNaN(amount)) return '₹0';

  if (compact && Math.abs(amount) >= 100000) {
    // Indian Lakh / Crore notation
    if (Math.abs(amount) >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    }
    return `₹${(amount / 100000).toFixed(2)} L`;
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num: number): string {
  if (isNaN(num)) return '0';
  return new Intl.NumberFormat('en-IN').format(num);
}

export function formatDate(dateString: string | null | undefined, includeTime = false): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';

    if (includeTime) {
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return 'Never';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Never';

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 30) return formatDate(dateString);
    if (diffDays > 1) return `${diffDays} days ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffHours >= 1) return `${diffHours}h ago`;
    if (diffMins >= 1) return `${diffMins}m ago`;
    return 'Just now';
  } catch {
    return '—';
  }
}
