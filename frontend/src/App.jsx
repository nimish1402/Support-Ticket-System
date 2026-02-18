import { useState, useCallback } from 'react'
import TicketForm from './components/TicketForm'
import TicketList from './components/TicketList'
import StatsDashboard from './components/StatsDashboard'

const TABS = [
    { id: 'tickets', label: '🎫 Tickets' },
    { id: 'dashboard', label: '📊 Dashboard' },
]

export default function App() {
    const [activeTab, setActiveTab] = useState('tickets')
    const [refreshTrigger, setRefreshTrigger] = useState(0)

    const handleTicketCreated = useCallback(() => {
        setRefreshTrigger((n) => n + 1)
    }, [])

    return (
        <div className="app">
            <header className="header">
                <div className="header-inner">
                    <div className="logo">
                        <div className="logo-icon">🎫</div>
                        <span>SupportDesk</span>
                    </div>
                    <nav className="nav">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                className={`nav-btn ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </header>

            <main className="main">
                {activeTab === 'tickets' ? (
                    <div className="page-layout">
                        <TicketForm onTicketCreated={handleTicketCreated} />
                        <TicketList refreshTrigger={refreshTrigger} />
                    </div>
                ) : (
                    <StatsDashboard refreshTrigger={refreshTrigger} />
                )}
            </main>
        </div>
    )
}
