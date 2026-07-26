import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/with-auth';
import { getEventRegistrations } from '@/lib/services/event.service';
import { successResponse, errorResponse } from '@/lib/response';
import { AppError } from '@/lib/errors';

type Params = { id: string };

// GET /api/v1/organizer/events/:id/registrations — Filter, search, and export CSV
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { id } = await params;
  return withAuth(async (r, _ctx, user) => {
    try {
      const url = new URL(r.url);
      const statusFilter = url.searchParams.get('status');
      const searchQuery = url.searchParams.get('search') || '';
      const isExportCSV = url.searchParams.get('format') === 'csv';

      const registrations = await getEventRegistrations(id, user.sub, user.role || 'student');

      // Apply filtering & searching
      let filtered = registrations.filter((reg: Record<string, unknown>) => {
        const matchesStatus = !statusFilter || statusFilter === 'all' || reg.status === statusFilter;
        
        const username = String(reg.username || '').toLowerCase();
        const fullName = String(reg.full_name || '').toLowerCase();
        const matchesSearch = !searchQuery || 
          username.includes(searchQuery.toLowerCase()) || 
          fullName.includes(searchQuery.toLowerCase());

        return matchesStatus && matchesSearch;
      });

      if (isExportCSV) {
        // Generate CSV file download response
        const headers = ['Registration ID', 'User ID', 'Username', 'Full Name', 'Status', 'Attendance Mode', 'Registered At'];
        const csvRows = filtered.map((r: Record<string, unknown>) => [
          r.id,
          r.user_id,
          r.username,
          `"${r.full_name || ''}"`,
          r.status,
          r.attendance_mode,
          r.registered_at
        ].join(','));

        const csvContent = [headers.join(','), ...csvRows].join('\n');

        return new NextResponse(csvContent, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="event-${id}-attendees.csv"`,
          },
        });
      }

      return successResponse(filtered);
    } catch (err) {
      if (err instanceof AppError) return errorResponse(err.message, err.statusCode, err.code);
      console.error('[GET /organizer/events/:id/registrations]', err);
      return errorResponse('Failed to fetch registrations.', 500);
    }
  })(req, { params: Promise.resolve({ id }) });
}
