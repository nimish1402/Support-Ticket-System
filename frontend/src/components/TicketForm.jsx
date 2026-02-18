import { useState, useEffect, useRef, useCallback } from 'react'
import { ticketsApi } from '../api'

const CATEGORIES = ['billing', 'technical', 'account', 'general']
const PRIORITIES = ['low', 'medium', 'high', 'critical']

export default function TicketForm({ onTicketCreated }) {
    const [form, setForm] = useState({
        title: '',
        description: '',
        category: 'general',
        priority: 'low',
    })
    const [submitting, setSubmitting] = useState(false)
    const [classifying, setClassifying] = useState(false)
    const [suggestion, setSuggestion] = useState(null)
    const [error, setError] = useState('')
    const debounceRef = useRef(null)

    const classifyDescription = useCallback(async (desc) => {
        if (!desc || desc.trim().length < 10) return
        setClassifying(true)
        try {
            const { data } = await ticketsApi.classify(desc)
            setSuggestion(data)
            setForm((prev) => ({
                ...prev,
                category: data.suggested_category,
                priority: data.suggested_priority,
            }))
        } catch {
            // Graceful failure - keep current selections
        } finally {
            setClassifying(false)
        }
    }, [])

    const handleDescriptionChange = (e) => {
        const val = e.target.value
        setForm((prev) => ({ ...prev, description: val }))
        setSuggestion(null)
        clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => classifyDescription(val), 700)
    }

    useEffect(() => () => clearTimeout(debounceRef.current), [])

    const handleChange = (e) => {
        const { name, value } = e.target
        setForm((prev) => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        if (!form.title.trim()) { setError('Title is required.'); return }
        if (!form.description.trim()) { setError('Description is required.'); return }

        setSubmitting(true)
        try {
            const { data } = await ticketsApi.create(form)
            setForm({ title: '', description: '', category: 'general', priority: 'low' })
            setSuggestion(null)
            onTicketCreated(data)
        } catch (err) {
            const msg = err.response?.data
                ? Object.values(err.response.data).flat().join(' ')
                : 'Failed to create ticket. Please try again.'
            setError(msg)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="card">
            <h2 className="card-title">
                <span>🎫</span> New Ticket
            </h2>

            <form onSubmit={handleSubmit}>
                {error && <div className="error-banner">{error}</div>}

                <div className="form-group">
                    <label className="form-label" htmlFor="title">Title *</label>
                    <input
                        id="title"
                        name="title"
                        className="form-input"
                        type="text"
                        value={form.title}
                        onChange={handleChange}
                        maxLength={200}
                        placeholder="Brief summary of the issue"
                        required
                    />
                    <div className="input-hint">{form.title.length}/200</div>
                </div>

                <div className="form-group">
                    <label className="form-label" htmlFor="description">
                        Description *
                        {classifying && (
                            <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--accent)' }}>
                                <span className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} /> AI classifying…
                            </span>
                        )}
                    </label>
                    <textarea
                        id="description"
                        className="form-textarea"
                        value={form.description}
                        onChange={handleDescriptionChange}
                        placeholder="Describe the issue in detail…"
                        required
                    />
                </div>

                {suggestion && (
                    <div className="ai-suggestion">
                        <span className="ai-icon">🤖</span>
                        <span>
                            AI suggested: <strong>{suggestion.suggested_category}</strong> /{' '}
                            <strong>{suggestion.suggested_priority}</strong> priority. You can override below.
                        </span>
                    </div>
                )}

                <div className="form-row">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" htmlFor="category">Category</label>
                        <select
                            id="category"
                            name="category"
                            className="form-select"
                            value={form.category}
                            onChange={handleChange}
                        >
                            {CATEGORIES.map((c) => (
                                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" htmlFor="priority">Priority</label>
                        <select
                            id="priority"
                            name="priority"
                            className="form-select"
                            value={form.priority}
                            onChange={handleChange}
                        >
                            {PRIORITIES.map((p) => (
                                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                    <button
                        type="submit"
                        className="btn btn-primary btn-full"
                        disabled={submitting}
                    >
                        {submitting ? <><span className="spinner" /> Submitting…</> : '✓ Submit Ticket'}
                    </button>
                </div>
            </form>
        </div>
    )
}
