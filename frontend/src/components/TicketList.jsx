import { useState, useEffect, useCallback } from 'react'
import { ticketsApi } from '../api'

const STATUSES = ['open', 'in_progress', 'resolved', 'closed']
const CATEGORIES = ['', 'billing', 'technical', 'account', 'general']
const PRIORITIES = ['', 'low', 'medium', 'high', 'critical']

function formatDate(iso) {
    return new Date(iso).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    })
}

function TicketCard({ ticket, onStatusChange }) {
    const [expanded, setExpanded] = useState(false)
    const [updating, setUpdating] = useState(false)

    const handleStatusChange = async (e) => {
        const newStatus = e.target.value
        setUpdating(true)
        try {
            const { data } = await ticketsApi.patch(ticket.id, { status: newStatus })
            onStatusChange(data)
        } catch {
            // Status update failed silently
        } finally {
            setUpdating(false)
        }
    }

    return (
        <div
            className={`ticket-card ${expanded ? 'expanded' : ''}`}
            onClick={() => setExpanded((v) => !v)}
        >
            <div className="ticket-header">
                <div className="ticket-title">{ticket.title}</div>
                <div className="ticket-meta">
                    <span className={`badge badge-priority-${ticket.priority}`}>{ticket.priority}</span>
                    <span className={`badge badge-status-${ticket.status}`}>
                        {ticket.status.replace('_', ' ')}
                    </span>
                </div>
            </div>

            <div className="ticket-desc">
                {ticket.description.length > 120
                    ? ticket.description.slice(0, 120) + '…'
                    : ticket.description}
            </div>

            <div className="ticket-footer">
                <div style={{ display: 'flex', gap: 8 }}>
                    <span className="badge badge-category">{ticket.category}</span>
                </div>
                <span className="ticket-time">{formatDate(ticket.created_at)}</span>
            </div>

            {expanded && (
                <div
                    className="ticket-expand"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="ticket-expand-label">Update Status</div>
                    <select
                        className="status-select"
                        value={ticket.status}
                        onChange={handleStatusChange}
                        disabled={updating}
                    >
                        {STATUSES.map((s) => (
                            <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                        ))}
                    </select>
                    {updating && <span style={{ marginLeft: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Saving…</span>}
                </div>
            )}
        </div>
    )
}

export default function TicketList({ refreshTrigger }) {
    const [tickets, setTickets] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [filters, setFilters] = useState({ category: '', priority: '', status: '', search: '' })
    const [searchInput, setSearchInput] = useState('')
    const searchRef = { current: null }

    const fetchTickets = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const params = {}
            if (filters.category) params.category = filters.category
            if (filters.priority) params.priority = filters.priority
            if (filters.status) params.status = filters.status
            if (filters.search) params.search = filters.search
            const { data } = await ticketsApi.list(params)
            setTickets(Array.isArray(data) ? data : data.results || [])
        } catch {
            setError('Failed to load tickets.')
        } finally {
            setLoading(false)
        }
    }, [filters])

    useEffect(() => { fetchTickets() }, [fetchTickets, refreshTrigger])

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }))
    }

    const handleSearchChange = (e) => {
        const val = e.target.value
        setSearchInput(val)
        clearTimeout(searchRef.current)
        searchRef.current = setTimeout(() => {
            setFilters((prev) => ({ ...prev, search: val }))
        }, 400)
    }

    const handleStatusChange = (updated) => {
        setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h2 className="page-title">Tickets</h2>
                    <div className="page-subtitle">Click a ticket to update its status</div>
                </div>
                <span className="count-badge">{tickets.length} tickets</span>
            </div>

            <div className="filters-bar">
                <input
                    className="search-input"
                    type="text"
                    placeholder="🔍 Search title or description…"
                    value={searchInput}
                    onChange={handleSearchChange}
                />
                <select
                    className="filter-select"
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                >
                    <option value="">All Categories</option>
                    {CATEGORIES.filter(Boolean).map((c) => (
                        <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                </select>
                <select
                    className="filter-select"
                    value={filters.priority}
                    onChange={(e) => handleFilterChange('priority', e.target.value)}
                >
                    <option value="">All Priorities</option>
                    {PRIORITIES.filter(Boolean).map((p) => (
                        <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                    ))}
                </select>
                <select
                    className="filter-select"
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                    <option value="">All Statuses</option>
                    {STATUSES.map((s) => (
                        <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                    ))}
                </select>
            </div>

            {error && <div className="error-banner">{error}</div>}

            {loading ? (
                <div className="empty-state">
                    <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 1rem' }} />
                    <div className="empty-state-text">Loading tickets…</div>
                </div>
            ) : tickets.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📭</div>
                    <div className="empty-state-text">No tickets found. Try adjusting your filters.</div>
                </div>
            ) : (
                <div className="ticket-grid">
                    {tickets.map((ticket) => (
                        <TicketCard key={ticket.id} ticket={ticket} onStatusChange={handleStatusChange} />
                    ))}
                </div>
            )}
        </div>
    )
}
