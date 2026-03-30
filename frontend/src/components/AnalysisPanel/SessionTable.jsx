import styles from './SessionTable.module.css';

export function SessionTable({ sessions }) {
    if (!sessions || sessions.length === 0) {
        return <p className={styles.empty}>No sessions recorded yet.</p>;
    }

    return (
        <div className={styles.wrapper}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Avg Density</th>
                        <th>Peak Pop</th>
                        <th>Avg Entropy</th>
                        <th>P(Birth)</th>
                        <th>P(Death)</th>
                        <th>Generations</th>
                        <th>End</th>
                    </tr>
                </thead>
                <tbody>
                    {sessions.slice().reverse().map((s, i) => (
                        <tr key={i}>
                            <td>{sessions.length - i}</td>
                            <td>{s.density != null ? `${s.density}%` : '—'}</td>
                            <td>{s.peakPop ?? '—'}</td>
                            <td>{s.avgEntropy != null ? (s.avgEntropy / 100).toFixed(2) : '—'}</td>
                            <td>{s.avgPBirth != null ? (s.avgPBirth / 100).toFixed(2) : '—'}</td>
                            <td>{s.avgPDeath != null ? (s.avgPDeath / 100).toFixed(2) : '—'}</td>
                            <td>{s.generations ?? '—'}</td>
                            <td>{s.endReason === 0 ? 'stagnant' : s.endReason === 1 ? 'died' : '—'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
