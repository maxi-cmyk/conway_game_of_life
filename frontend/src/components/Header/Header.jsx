import { useEffect } from 'react';
import styles from './Header.module.css';

export function Header({
    session, batchTarget, totalSessions,
    state, streamStatus, onStart, onRestart, onPause, onResume,
    viewLabel,
}) {
    const streamUnavailable = streamStatus === 'reconnecting' || streamStatus === 'disconnected';
    const controlsDisabled = streamStatus !== 'connected';
    const displayState = streamUnavailable && state === 'RUNNING'
        ? 'PAUSED'
        : state;

    const statusKey = streamUnavailable || streamStatus === 'connecting'
        ? streamStatus
        : displayState;

    const statusClass = {
        connecting: styles.statusConnecting,
        reconnecting: styles.statusReconnecting,
        disconnected: styles.statusDisconnected,
        IDLE: styles.statusIdle,
        RUNNING: styles.statusRunning,
        PAUSED: styles.statusPaused,
    }[statusKey] || styles.statusIdle;

    const statusLabel = {
        connecting: 'Connecting',
        reconnecting: 'Reconnecting',
        disconnected: 'Offline',
        IDLE: 'Idle',
        RUNNING: 'Running',
        PAUSED: 'Paused',
    }[statusKey] || 'Idle';

    const paddedSession = String(Math.max(session, 0)).padStart(2, '0');
    const paddedTarget = String(Math.max(batchTarget, 0)).padStart(2, '0');
    const paddedStored = String(Math.max(totalSessions, 0)).padStart(2, '0');
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.defaultPrevented || event.repeat || event.metaKey || event.ctrlKey || event.altKey) {
                return;
            }

            if (event.target instanceof HTMLElement) {
                const tagName = event.target.tagName;

                if (event.target.isContentEditable || tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
                    return;
                }
            }

            if (controlsDisabled) {
                return;
            }

            const key = event.key.toLowerCase();

            if (displayState === 'IDLE' && key === 's') {
                event.preventDefault();
                onStart();
            } else if (displayState === 'RUNNING' && key === 'p') {
                event.preventDefault();
                onPause();
            } else if (displayState === 'PAUSED' && key === 'c') {
                event.preventDefault();
                onResume();
            } else if (displayState === 'PAUSED' && key === 'r') {
                event.preventDefault();
                onRestart();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [controlsDisabled, displayState, onPause, onRestart, onResume, onStart]);

    return (
        <header className={styles.header}>
            <div className={styles.left}>
                <div className={styles.brandRow}>
                    <span className={styles.brand}>LIFE_TERMINAL</span>
                    <span className={styles.divider}>|</span>
                    <span className={`${styles.status} ${statusClass}`}>
                        STATUS: [{statusLabel.toUpperCase()}]
                    </span>
                </div>
            </div>

            <div className={styles.center}>
                {viewLabel}
            </div>

            <div className={styles.right}>
                <div className={styles.batchMeta}>
                    <span className={styles.metaLabel}>BATCH:</span>
                    <span className={styles.metaValue}>{paddedSession}/{paddedTarget}</span>
                    <span className={styles.metaSeparator}>|</span>
                    <span className={styles.metaLabel}>STORED:</span>
                    <span className={styles.metaValue}>{paddedStored}</span>
                </div>

                <div className={styles.actions}>
                    {displayState === 'IDLE' && (
                        <button
                            className={styles.startBtn}
                            onClick={onStart}
                            disabled={controlsDisabled}
                            aria-keyshortcuts="S"
                        >
                            [S]TART
                        </button>
                    )}
                    {displayState === 'RUNNING' && (
                        <button
                            className={styles.pauseBtn}
                            onClick={onPause}
                            disabled={controlsDisabled}
                            aria-keyshortcuts="P"
                        >
                            [P]AUSE
                        </button>
                    )}
                    {displayState === 'PAUSED' && (
                        <>
                            <button
                                className={styles.resumeBtn}
                                onClick={onResume}
                                disabled={controlsDisabled}
                                aria-keyshortcuts="C"
                            >
                                [C]ONTINUE
                            </button>
                            <button
                                className={styles.restartBtn}
                                onClick={onRestart}
                                disabled={controlsDisabled}
                                aria-keyshortcuts="R"
                            >
                                [R]ESTART
                            </button>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
