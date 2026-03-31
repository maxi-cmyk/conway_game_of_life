import styles from './AnalysisPanel.module.css';
import { DensityScatter }  from './DensityScatter';
import { AutocorrScatter } from './AutocorrScatter';
import { EntropyVsGenerations } from './EntropyVsGenerations';
import { PeakPopVsDensity } from './PeakPopVsDensity';
import { SessionTable }    from './SessionTable';

export function AnalysisPanel({
    sessions,
    currentEntropy,
    currentDensity,
    currentPopulation,
    totalSessions,
    currentState,
    currentSession,
    batchTarget,
}) {
    const summary = buildSummary(sessions);
    const liveSessionSuffix = getLiveSessionSuffix(currentState, currentSession, batchTarget);

    return (
        <section className={styles.panel}>
            <div className={styles.header}>
                <div className={styles.headerCopy}>
                    <span className={styles.eyebrow}>Session Archive</span>
                    <h1 className={styles.title}>Session Analysis</h1>
                    <p className={styles.hint}>Recorded runs at a glance.</p>
                </div>

                <div className={styles.summaryGrid}>
                    <SummaryStat label="Stored Sessions" value={formatCount(totalSessions || sessions.length)} />
                    <SummaryStat label="Total Generations" value={formatCount(summary.totalGenerations)} tone="population" />
                    <SummaryStat label={`Current Entropy${liveSessionSuffix}`} value={currentEntropy.toFixed(3)} tone="entropy" />
                    <SummaryStat label={`Current Population${liveSessionSuffix}`} value={formatCount(currentPopulation)} tone="population" />
                </div>
            </div>

            <div className={styles.summaryStrip}>
                <SummaryChip label="Average Density" value={`${Math.round(summary.averageDensity)}%`} />
                <SummaryChip label="Average Entropy" value={summary.averageEntropy.toFixed(3)} tone="entropy" />
                <SummaryChip label="Peak Population" value={formatCount(summary.peakPopulation)} tone="population" />
                <SummaryChip label="Current Density" value={`${currentDensity}%`} tone="population" />
            </div>

            <div className={styles.content}>
                <div className={styles.chartGrid}>
                    <DensityScatter sessions={sessions} />
                    <AutocorrScatter sessions={sessions} />
                    <EntropyVsGenerations sessions={sessions} />
                    <PeakPopVsDensity sessions={sessions} />
                </div>

                <section className={styles.logSection}>
                    <div className={styles.logHeader}>
                        <div className={styles.logCopy}>
                            <span className={styles.eyebrow}>System Iteration Log</span>
                            <h2 className={styles.logTitle}>Recorded Sessions</h2>
                        </div>
                    </div>

                    <SessionTable sessions={sessions} />
                </section>
            </div>

            <div className={styles.divider}>
                //....................................................................................................................//
            </div>
        </section>
    );
}

function SummaryStat({ label, value, tone = 'default' }) {
    return (
        <div className={`${styles.summaryStat} ${styles[`summaryStat${capitalize(tone)}`] || ''}`}>
            <span className={styles.summaryLabel}>{label}</span>
            <span className={styles.summaryValue}>{value}</span>
        </div>
    );
}

function SummaryChip({ label, value, tone = 'default' }) {
    return (
        <div className={`${styles.summaryChip} ${styles[`summaryChip${capitalize(tone)}`] || ''}`}>
            <span className={styles.summaryChipLabel}>{label}</span>
            <span className={styles.summaryChipValue}>{value}</span>
        </div>
    );
}

function buildSummary(sessions) {
    if (!sessions || sessions.length === 0) {
        return {
            totalGenerations: 0,
            averageDensity: 0,
            averageEntropy: 0,
            peakPopulation: 0,
        };
    }

    let totalGenerations = 0;
    let densityTotal = 0;
    let entropyTotal = 0;
    let peakPopulation = 0;

    sessions.forEach(session => {
        totalGenerations += Number(session.generations) || 0;
        densityTotal += Number(session.density) || 0;
        entropyTotal += ((Number(session.avgEntropy) || 0) / 100);
        peakPopulation = Math.max(peakPopulation, Number(session.peakPop) || 0);
    });

    return {
        totalGenerations,
        averageDensity: densityTotal / sessions.length,
        averageEntropy: entropyTotal / sessions.length,
        peakPopulation,
    };
}

function formatCount(value) {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
        return '0';
    }

    return numericValue.toLocaleString('en-US');
}

function capitalize(value) {
    return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function getLiveSessionSuffix(currentState, currentSession, batchTarget) {
    if (batchTarget <= 0 || (currentState !== 'RUNNING' && currentState !== 'PAUSED')) {
        return '';
    }

    return ` (${Math.max(currentSession, 0)}/${Math.max(batchTarget, 0)})`;
}
