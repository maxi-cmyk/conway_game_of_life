import { PopulationChart }   from '../charts/PopulationChart';
import { EntropyChart }      from '../charts/EntropyChart';
import { ProbabilityChart }  from '../charts/ProbabilityChart';
import styles                from './ChartGrid.module.css';

export function ChartGrid({
    popHistory, entropyHistory,
    pBirthRolling, pDeathRolling,
    pBirthPersistent, pDeathPersistent,
    windowMode, setWindowMode,
}) {
    return (
        <div className={styles.grid}>
            <div className={styles.card}>
                <p className={styles.cardTitle}>Population over time</p>
                <PopulationChart data={popHistory} />
            </div>
            <div className={styles.card}>
                <p className={styles.cardTitle}>Entropy over time</p>
                <EntropyChart data={entropyHistory} />
            </div>
            <div className={styles.card}>
                <div className={styles.cardTitleRow}>
                    <p className={styles.cardTitle}>Birth / death probability</p>
                    <div className={styles.toggle}>
                        <button
                            className={`${styles.toggleBtn} ${windowMode === 'rolling' ? styles.active : ''}`}
                            onClick={() => setWindowMode('rolling')}
                        >
                            Rolling 20
                        </button>
                        <button
                            className={`${styles.toggleBtn} ${windowMode === 'persistent' ? styles.active : ''}`}
                            onClick={() => setWindowMode('persistent')}
                        >
                            Persistent
                        </button>
                    </div>
                </div>
                <ProbabilityChart
                    pBirth={windowMode === 'rolling' ? pBirthRolling : pBirthPersistent}
                    pDeath={windowMode === 'rolling' ? pDeathRolling : pDeathPersistent}
                />
            </div>
        </div>
    );
}
