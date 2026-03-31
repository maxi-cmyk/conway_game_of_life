import { useState } from 'react';
import styles from './AnalysisPanel.module.css';
import { SettingsPanel }   from './SettingsPanel';
import { DensityScatter }  from './DensityScatter';
import { AutocorrScatter } from './AutocorrScatter';
import { SessionTable }    from './SessionTable';

export function AnalysisPanel({ sessions, maxGens, onExportCsv, onExportJson, onUpdateMaxGens }) {
    const [open, setOpen] = useState(false);

    return (
        <section className={styles.panel}>
            <button
                className={styles.trigger}
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
            >
                Analysis
                <span className={`${styles.chevron} ${open ? styles.open : ''}`}>↓</span>
            </button>
            {open && (
                <div className={styles.content}>
                    <SettingsPanel
                        sessions={sessions}
                        maxGens={maxGens}
                        onExportCsv={onExportCsv}
                        onExportJson={onExportJson}
                        onUpdateMaxGens={onUpdateMaxGens}
                    />
                    <div className={styles.scatterRow}>
                        <DensityScatter   sessions={sessions} />
                        <AutocorrScatter  sessions={sessions} />
                    </div>
                    <SessionTable sessions={sessions} />
                </div>
            )}
        </section>
    );
}
