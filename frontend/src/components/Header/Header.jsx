import config from '../../config';
import styles from './Header.module.css';

export function Header({
    density, pop, born, died, entropy,
    pBirth, pDeath, session, batchTarget, totalSessions,
    state, onStart, onRestart, onPause, onResume, onClear
}) {
    const badgeClass = {
        IDLE: styles.idle,
        RUNNING: styles.running,
        PAUSED: styles.paused,
    }[state] || styles.idle;

    const badgeLabel = {
        IDLE: 'Idle',
        RUNNING: 'Running',
        PAUSED: 'Paused',
    }[state] || 'Idle';

    const sessionDisplay = batchTarget > 0
        ? `${session} / ${batchTarget}`
        : '0 / 0';

    const shouldShowExportReminder = state === 'IDLE' && totalSessions > 0;
    const exportReminder = totalSessions >= config.maxSessions
        ? `History is full at ${config.maxSessions} sessions. Export your results before starting again.`
        : `Batch finished. Export your results soon — the dashboard keeps up to ${config.maxSessions} sessions.`;

    return (
        <header className={styles.header}>
            <div className={styles.top}>
                <div className={styles.titleRow}>
                    <h1 className={styles.title}>Conway's Game of Life</h1>
                    <span className={`${styles.badge} ${badgeClass}`}>
                        {badgeLabel}
                    </span>
                </div>
                <div className={styles.actions}>
                    {state === 'IDLE' && (
                        <button
                            className={styles.startBtn}
                            onClick={onStart}
                        >
                            Start
                        </button>
                    )}
                    {state === 'RUNNING' && (
                        <button
                            className={styles.pauseBtn}
                            onClick={onPause}
                        >
                            Pause
                        </button>
                    )}
                    {state === 'PAUSED' && (
                        <>
                            <button
                                className={styles.resumeBtn}
                                onClick={onResume}
                            >
                                Resume
                            </button>
                            <button
                                className={styles.restartBtn}
                                onClick={onRestart}
                            >
                                Restart
                            </button>
                        </>
                    )}
                    <button
                        className={styles.clearBtn}
                        onClick={onClear}
                    >
                        Clear
                    </button>
                </div>
            </div>
            <div className={styles.metrics}>
                <Metric label="Population" value={pop}                        color="var(--color-pop)" />
                <Metric label="Born"       value={born}                       color="var(--color-birth)" />
                <Metric label="Died"       value={died}                       color="var(--color-death)" />
                <Metric label="Entropy"    value={entropy.toFixed(3)}         color="var(--color-entropy)" />
                <Metric label="Density"    value={`${density}%`}              color="var(--text-primary)" />
                <Metric label="P(Birth)"   value={pBirth.toFixed(3)}          color="var(--color-birth)" />
                <Metric label="P(Death)"   value={pDeath.toFixed(3)}          color="var(--color-death)" />
                <Metric label="Session"    value={sessionDisplay}             color="var(--text-secondary)" />
                <Metric label="Total"      value={totalSessions}              color="var(--text-secondary)" />
            </div>
            {shouldShowExportReminder ? (
                <p className={styles.reminder}>
                    {exportReminder}
                </p>
            ) : null}
        </header>
    );
}

function Metric({ label, value, color }) {
    return (
        <div className={styles.metric}>
            <span className={styles.metricLabel}>{label}</span>
            <span className={styles.metricValue} style={{ color }}>{value}</span>
        </div>
    );
}
