import { useEffect, useState } from 'react';
import config from '../../config';
import styles from './SettingsPanel.module.css';

export function SettingsPanel({ sessions, maxGens, onExportCsv, onExportJson, onUpdateMaxGens }) {
    const [draftMaxGens, setDraftMaxGens] = useState(String(maxGens));
    const [error, setError] = useState('');

    useEffect(() => {
        setDraftMaxGens(String(maxGens));
        setError('');
    }, [maxGens]);

    const handleSubmit = (event) => {
        event.preventDefault();

        const trimmed = draftMaxGens.trim();
        const parsed = Number.parseInt(trimmed, 10);
        const isWholeNumber = String(parsed) === trimmed;

        if (!isWholeNumber || parsed < config.minMaxGens || parsed > config.maxMaxGens) {
            setError(`Enter a whole number from ${config.minMaxGens} to ${config.maxMaxGens}.`);
            return;
        }

        setError('');
        onUpdateMaxGens(parsed);
    };

    return (
        <section className={styles.panel}>
            <div className={styles.header}>
                <div>
                    <p className={styles.title}>Session controls</p>
                    <p className={styles.subtitle}>
                        Tune the generation cap and export the completed session history.
                    </p>
                </div>
                <p className={styles.status}>Stored sessions: {sessions.length}</p>
            </div>

            <div className={styles.grid}>
                <form className={styles.form} onSubmit={handleSubmit}>
                    <label className={styles.label} htmlFor="max-gens-input">
                        Max generations per session
                    </label>
                    <div className={styles.inputRow}>
                        <input
                            id="max-gens-input"
                            className={styles.input}
                            type="number"
                            min={config.minMaxGens}
                            max={config.maxMaxGens}
                            step="1"
                            value={draftMaxGens}
                            onChange={(event) => {
                                setDraftMaxGens(event.target.value);
                                setError('');
                            }}
                        />
                        <button className={styles.saveBtn} type="submit">
                            Save
                        </button>
                    </div>
                    <p className={styles.hint}>
                        Current cap: {maxGens} generations. Allowed range: {config.minMaxGens} to {config.maxMaxGens}.
                    </p>
                    {error ? <p className={styles.error}>{error}</p> : null}
                </form>

                <div className={styles.exportBlock}>
                    <p className={styles.label}>Export session history</p>
                    <div className={styles.actions}>
                        <button
                            className={styles.exportBtn}
                            type="button"
                            onClick={onExportCsv}
                            disabled={sessions.length === 0}
                        >
                            Export CSV
                        </button>
                        <button
                            className={styles.exportBtn}
                            type="button"
                            onClick={onExportJson}
                            disabled={sessions.length === 0}
                        >
                            Export JSON
                        </button>
                    </div>
                    <p className={styles.hint}>
                        CSV is spreadsheet-friendly. JSON keeps the raw session payload exactly as the dashboard sees it.
                    </p>
                </div>
            </div>
        </section>
    );
}
