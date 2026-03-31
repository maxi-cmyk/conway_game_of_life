import styles from './SessionTable.module.css';
import { getEndReasonLabel } from '../../lib/sessions';

export function SessionTable({ sessions }) {
    if (!sessions || sessions.length === 0) {
        return (
            <div className={styles.empty}>
                <p className={styles.emptyTitle}>No sessions recorded yet</p>
                <p className={styles.emptyBody}>
                    Finish a session batch to populate the system iteration log and unlock the analysis table.
                </p>
            </div>
        );
    }

    const rows = sessions.slice().reverse();

    return (
        <div className={styles.wrapper}>
            <div className={styles.scrollArea}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Avg Density</th>
                            <th>Peak Population</th>
                            <th>Avg Entropy</th>
                            <th>P(Birth)</th>
                            <th>P(Death)</th>
                            <th>Generations</th>
                            <th>End Reason</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((session, index) => {
                            const sessionNumber = sessions.length - index;
                            const reasonLabel = getEndReasonLabel(session.endReason);

                            return (
                                <tr key={`${sessionNumber}-${reasonLabel}`}>
                                    <td className={styles.sessionId}>{formatSessionId(sessionNumber)}</td>
                                    <td className={styles.valueStrong}>
                                        {session.density != null ? `${session.density}%` : '—'}
                                    </td>
                                    <td>{formatCount(session.peakPop)}</td>
                                    <td className={styles.valueEntropy}>
                                        {session.avgEntropy != null ? (session.avgEntropy / 100).toFixed(3) : '—'}
                                    </td>
                                    <td className={styles.valueBirth}>
                                        {session.avgPBirth != null ? (session.avgPBirth / 100).toFixed(2) : '—'}
                                    </td>
                                    <td className={styles.valueDeath}>
                                        {session.avgPDeath != null ? (session.avgPDeath / 100).toFixed(2) : '—'}
                                    </td>
                                    <td>{formatCount(session.generations)}</td>
                                    <td>
                                        <span className={`${styles.reasonBadge} ${styles[getReasonTone(session.endReason)]}`}>
                                            {formatReasonLabel(reasonLabel)}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className={styles.footer}>
                <span>{`Page 01 // ${formatCount(rows.length)} Sessions Indexed`}</span>
                <span>{`Latest Run ${formatSessionId(sessions.length)}`}</span>
            </div>
        </div>
    );
}

function formatCount(value) {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
        return '—';
    }

    return numericValue.toLocaleString('en-US');
}

function formatReasonLabel(label) {
    return String(label ?? '—').replace(/\s+/g, '_').toUpperCase();
}

function formatSessionId(sessionNumber) {
    if (!Number.isFinite(sessionNumber)) {
        return '—';
    }

    return `0x${String(sessionNumber.toString(16).toUpperCase()).padStart(3, '0')}`;
}

function getReasonTone(reason) {
    if (reason === 2) {
        return 'reasonMax';
    }

    if (reason === 1) {
        return 'reasonDeath';
    }

    return 'reasonNeutral';
}
