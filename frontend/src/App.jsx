import { useEffect, useState } from 'react';
import config from './config';
import { useSimData } from './hooks/useSimData';
import { Header } from './components/Header/Header';
import { ChartGrid } from './components/ChartGrid/ChartGrid';
import { AnalysisPanel } from './components/AnalysisPanel/AnalysisPanel';
import { SettingsPanel } from './components/AnalysisPanel/SettingsPanel';
import styles from './App.module.css';

const VIEWS = [
    { id: 'dashboard', label: 'Dashboard', marker: '[01]', title: 'DASHBOARD' },
    { id: 'analysis', label: 'Session Analysis', marker: '[02]', title: 'SESSION_ANALYSIS' },
    { id: 'settings', label: 'Settings', marker: '[03]', title: 'SETTINGS' },
];

const FOOTER_LINK_LABELS = {
    connected: 'LINK_CONNECTED',
    connecting: 'LINK_CONNECTING',
    reconnecting: 'LINK_RECONNECTING',
    disconnected: 'LINK_OFFLINE',
};

export default function App() {
    const sim = useSimData();
    const [activeView, setActiveView] = useState('dashboard');

    const currentView = VIEWS.find(view => view.id === activeView) || VIEWS[0];
    const sessionDisplay = sim.batchTarget > 0
        ? `${sim.session}/${sim.batchTarget}`
        : '0/0';
    const footerLink = FOOTER_LINK_LABELS[sim.streamStatus] || FOOTER_LINK_LABELS.connecting;

    useEffect(() => {
        document.title = `LIFE_TERMINAL // ${currentView.title}`;
    }, [currentView.title]);

    return (
        <div className={styles.app}>
            <div className={styles.crtOverlay} aria-hidden="true" />

            <Header
                session={sim.session}
                batchTarget={sim.batchTarget}
                totalSessions={sim.totalSessions}
                state={sim.state}
                streamStatus={sim.streamStatus}
                viewLabel={currentView.title}
                onStart={sim.start}
                onRestart={sim.restart}
                onPause={sim.pause}
                onResume={sim.resume}
            />

            <div className={styles.workspace}>
                <aside className={styles.sidebar}>
                    <nav className={styles.nav}>
                        {VIEWS.map(view => (
                            <button
                                key={view.id}
                                type="button"
                                className={`${styles.navButton} ${activeView === view.id ? styles.navButtonActive : ''}`}
                                onClick={() => setActiveView(view.id)}
                            >
                                <span className={styles.navMarker}>{view.marker}</span>
                                <span>{view.label}</span>
                            </button>
                        ))}
                    </nav>

                    <div className={styles.sidebarBottom}>
                        <div className={styles.sidebarStatusRow}>
                            <span className={styles.sidebarStatusLabel}>Active View</span>
                            <span className={styles.sidebarStatusValue}>{currentView.title}</span>
                        </div>
                        <div className={styles.sidebarStatusRow}>
                            <span className={styles.sidebarStatusLabel}>Batch</span>
                            <span className={styles.sidebarStatusValue}>{sessionDisplay}</span>
                        </div>
                        <div className={styles.sidebarStatusRow}>
                            <span className={styles.sidebarStatusLabel}>Stored</span>
                            <span className={styles.sidebarStatusValue}>{sim.totalSessions}</span>
                        </div>
                        <div className={styles.sidebarStatusRow}>
                            <span className={styles.sidebarStatusLabel}>Density</span>
                            <span className={styles.sidebarStatusValue}>{sim.density}%</span>
                        </div>
                    </div>
                </aside>

                <main className={styles.main}>
                    <div className={styles.mobileNav}>
                        {VIEWS.map(view => (
                            <button
                                key={view.id}
                                type="button"
                                className={`${styles.mobileNavButton} ${activeView === view.id ? styles.mobileNavButtonActive : ''}`}
                                onClick={() => setActiveView(view.id)}
                            >
                                {view.label}
                            </button>
                        ))}
                    </div>

                    {activeView === 'dashboard' ? (
                        <DashboardView sim={sim} />
                    ) : null}

                    {activeView === 'analysis' ? (
                        <AnalysisPanel
                            sessions={sim.sessions}
                            currentEntropy={sim.entropy}
                            currentDensity={sim.density}
                            currentPopulation={sim.pop}
                            totalSessions={sim.totalSessions}
                            currentState={sim.state}
                            currentSession={sim.session}
                            batchTarget={sim.batchTarget}
                        />
                    ) : null}

                    {activeView === 'settings' ? (
                        <SettingsPanel
                            sessions={sim.sessions}
                            settings={sim.settings}
                            settingsStatus={sim.settingsStatus}
                            clearStatus={sim.clearStatus}
                            onExportCsv={sim.exportCSV}
                            onExportJson={sim.exportJSON}
                            onClear={sim.clearHistory}
                            onUpdateSettings={sim.updateSettings}
                        />
                    ) : null}
                </main>
            </div>

            <footer className={styles.footer}>
                <div className={styles.footerGroup}>
                    <span className={styles.footerPrimary}>CONWAY_OS // {footerLink}</span>
                </div>
                <div className={styles.footerGroup}>
                    <span className={styles.footerAccent}>{sim.streamStatus === 'connected' ? 'SYS_READY' : 'SYS_WAIT'}</span>
                </div>
            </footer>
        </div>
    );
}

function DashboardView({ sim }) {
    const sessionDisplay = sim.batchTarget > 0
        ? `${sim.session}/${sim.batchTarget}`
        : '0/0';

    return (
        <section className={styles.dashboard}>
            <div className={styles.pageHeader}>
                <div className={styles.pageIntro}>
                    <span className={styles.pageEyebrow}>Live Telemetry</span>
                    <h1 className={styles.pageTitle}>Dashboard</h1>
                </div>
            </div>

            <div className={styles.pageSummaryStrip}>
                <PageStat label="Population" value={formatCount(sim.pop)} color="var(--color-pop)" />
                <PageStat label="Born" value={`+${formatCount(sim.born)}`} color="var(--color-birth)" />
                <PageStat label="Died" value={`-${formatCount(sim.died)}`} color="var(--color-death)" />
                <PageStat label="Entropy" value={sim.entropy.toFixed(3)} color="var(--color-entropy)" />
                <PageStat label="Session Batch" value={sessionDisplay} color="var(--text-primary)" />
            </div>

            <div className={styles.dashboardOverviewRow}>
                <section className={`${styles.surfaceCard} ${styles.heroPanel}`}>
                    <div className={styles.heroHeader}>
                        <span className={styles.panelEyebrow}>Rates &amp; Density</span>
                    </div>
                    <div className={styles.rateGrid}>
                        <MeterBlock
                            label="Density"
                            value={`${sim.density}%`}
                            percent={sim.density}
                            min={config.densityMin}
                            max={config.densityMax}
                            color="var(--color-pop)"
                        />
                        <MeterBlock
                            label="P(Birth)"
                            value={`${Math.round(sim.pBirth * 100)}%`}
                            percent={sim.pBirth * 100}
                            color="var(--color-birth)"
                        />
                        <MeterBlock
                            label="P(Death)"
                            value={`${Math.round(sim.pDeath * 100)}%`}
                            percent={sim.pDeath * 100}
                            color="var(--color-death)"
                        />
                    </div>
                </section>

                <section className={`${styles.surfaceCard} ${styles.heroPanel}`}>
                    <div className={styles.heroHeader}>
                        <span className={styles.panelEyebrow}>Run Ledger</span>
                    </div>
                    <div className={styles.ledgerGrid}>
                        <LedgerRow label="Current Session" value={sessionDisplay} />
                        <LedgerRow label="Stored Sessions" value={formatCount(sim.totalSessions)} />
                        <LedgerRow label="Density Range" value={`${config.densityMin}-${config.densityMax}%`} />
                        <LedgerRow label="Stream Status" value={sim.streamStatus} accent />
                    </div>
                </section>
            </div>

            <div className={styles.sectionIntro}>
                <h2 className={styles.sectionTitle}>Live Graphs</h2>
            </div>

            <ChartGrid
                popHistory={sim.popHistory}
                entropyHistory={sim.entropyHistory}
                pBirthRolling={sim.pBirthRolling}
                pDeathRolling={sim.pDeathRolling}
                pBirthPersistent={sim.pBirthPersistent}
                pDeathPersistent={sim.pDeathPersistent}
                windowMode={sim.windowMode}
                setWindowMode={sim.setWindowMode}
            />
        </section>
    );
}

function PageStat({ label, value, color }) {
    return (
        <div className={styles.pageStat}>
            <span className={styles.pageStatLabel}>{label}</span>
            <span className={styles.pageStatValue} style={{ color }}>{value}</span>
        </div>
    );
}

function MetricBlock({ label, value, color }) {
    return (
        <div className={styles.metricBlock}>
            <span className={styles.metricLabel}>{label}</span>
            <span className={styles.metricValue} style={{ color }}>{value}</span>
        </div>
    );
}

function MeterBlock({ label, value, percent, min = 0, max = 100, color }) {
    const normalized = ((percent - min) / Math.max(max - min, 1)) * 100;
    const width = `${Math.max(0, Math.min(100, normalized))}%`;

    return (
        <div className={styles.meterBlock}>
            <div className={styles.meterMeta}>
                <span className={styles.metricLabel}>{label}</span>
                <span className={styles.meterValue}>{value}</span>
            </div>
            <div className={styles.meterTrack}>
                <div className={styles.meterFill} style={{ width, background: color }} />
            </div>
        </div>
    );
}

function LedgerRow({ label, value, accent = false }) {
    return (
        <div className={styles.ledgerRow}>
            <span className={styles.ledgerLabel}>{label}</span>
            <span className={`${styles.ledgerValue} ${accent ? styles.ledgerValueAccent : ''}`}>{value}</span>
        </div>
    );
}

function formatCount(value) {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
        return '0';
    }

    return numericValue.toLocaleString('en-US');
}
