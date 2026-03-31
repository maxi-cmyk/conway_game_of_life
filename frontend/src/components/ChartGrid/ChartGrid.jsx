import { PopulationChart }   from '../charts/PopulationChart';
import { EntropyChart }      from '../charts/EntropyChart';
import { ProbabilityChart }  from '../charts/ProbabilityChart';
import { ExpandableChartCard } from '../charts/ExpandableChartCard';
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
                <ExpandableChartCard
                    title="Population Over Time"
                    renderChart={() => <PopulationChart data={popHistory} />}
                />
            </div>

            <div className={styles.card}>
                <ExpandableChartCard
                    title="Entropy Over Time"
                    renderChart={() => <EntropyChart data={entropyHistory} />}
                />
            </div>

            <div className={styles.card}>
                <ExpandableChartCard
                    title="P(Birth) / P(Death)"
                    renderControls={() => (
                        <div className={styles.toggle}>
                            <button
                                className={`${styles.toggleBtn} ${windowMode === 'rolling' ? styles.active : ''}`}
                                type="button"
                                onClick={() => setWindowMode('rolling')}
                            >
                                Rolling 20
                            </button>
                            <button
                                className={`${styles.toggleBtn} ${windowMode === 'persistent' ? styles.active : ''}`}
                                type="button"
                                onClick={() => setWindowMode('persistent')}
                            >
                                Persistent
                            </button>
                        </div>
                    )}
                    renderChart={() => (
                        <ProbabilityChart
                            pBirth={windowMode === 'rolling' ? pBirthRolling : pBirthPersistent}
                            pDeath={windowMode === 'rolling' ? pDeathRolling : pDeathPersistent}
                        />
                    )}
                />
            </div>
        </div>
    );
}
