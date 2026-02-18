import { useState, useEffect } from 'react'
import { ticketsApi } from '../api'

function BreakdownChart({ title, data }) {
    const total = Object.values(data).reduce((s, v) => s + v, 0)
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1])

    return (
        <div className="breakdown-card">
            <div className="breakdown-title">{title}</div>
            {entries.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No data yet</div>
            ) : (
                entries.map(([key, count]) => (
                    <div key={key} className="breakdown-item">
                        <span className="breakdown-key">{key.replace('_', ' ')}</span>
                        <div className="breakdown-bar-wrap">
                            <div
                                className="breakdown-bar"
                                style={{ width: total > 0 ? `${(count / total) * 100}%` : '0%' }}
                            />
                        </div>
                        <span className="breakdown-count">{count}</span>
                    </div>
                ))
            )}
        </div>
    )
}

export default function StatsDashboard({ refreshTrigger }) {
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true)
            setError('')
            try {
                const { data } = await ticketsApi.stats()
                setStats(data)
            } catch {
                setError('Failed to load statistics.')
            } finally {
                setLoading(false)
            }
        }
        fetchStats()
    }, [refreshTrigger])

    if (loading) {
        return (
            <div className="empty-state">
                <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 1rem' }} />
                <div className="empty-state-text">Loading statistics…</div>
            </div>
        )
    }

    if (error) {
        return <div className="error-banner">{error}</div>
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h2 className="page-title">Dashboard</h2>
                    <div className="page-subtitle">Real-time ticket statistics</div>
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-value">{stats.total_tickets}</div>
                    <div className="stat-label">Total Tickets</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{stats.open_tickets}</div>
                    <div className="stat-label">Open Tickets</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{stats.avg_tickets_per_day}</div>
                    <div className="stat-label">Avg / Day</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">
                        {stats.total_tickets > 0
                            ? `${Math.round(((stats.total_tickets - stats.open_tickets) / stats.total_tickets) * 100)}%`
                            : '—'}
                    </div>
                    <div className="stat-label">Resolution Rate</div>
                </div>
            </div>

            <div className="breakdown-grid">
                <BreakdownChart title="By Priority" data={stats.priority_breakdown} />
                <BreakdownChart title="By Category" data={stats.category_breakdown} />
            </div>
        </div>
    )
}
