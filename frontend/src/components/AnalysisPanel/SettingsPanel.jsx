import { useEffect, useRef, useState } from 'react';
import config from '../../config';
import styles from './SettingsPanel.module.css';

function toDraft(settings) {
    return {
        maxGens: String(settings.maxGens),
        hashHistory: String(settings.hashHistory),
        exportLabel: '',
    };
}

function parseWholeNumber(value, min, max, label) {
    const trimmed = value.trim();
    const parsed = Number.parseInt(trimmed, 10);
    const isWholeNumber = String(parsed) === trimmed;

    if (!isWholeNumber || parsed < min || parsed > max) {
        return {
            error: `${label}: enter a whole number from ${min} to ${max}.`,
        };
    }

    return { value: parsed };
}

function clampWholeNumber(value, min, max, fallback) {
    const parsed = Number.parseInt(String(value), 10);

    if (Number.isNaN(parsed)) {
        return fallback;
    }

    return Math.min(max, Math.max(min, parsed));
}

export function SettingsPanel({
    sessions,
    settings,
    settingsStatus,
    clearStatus,
    onExportCsv,
    onExportJson,
    onClear,
    onUpdateSettings,
}) {
    const [draft, setDraft] = useState(() => toDraft(settings));
    const [brightnessDraft, setBrightnessDraft] = useState(() => String(settings.brightness));
    const [error, setError] = useState('');
    const brightnessTimeoutRef = useRef();
    const queuedBrightnessRef = useRef(null);

    useEffect(() => {
        setDraft(prev => ({
            ...prev,
            maxGens: String(settings.maxGens),
            hashHistory: String(settings.hashHistory),
        }));
    }, [settings.maxGens, settings.hashHistory]);

    useEffect(() => {
        setBrightnessDraft(String(settings.brightness));
    }, [settings.brightness]);

    useEffect(() => () => {
        window.clearTimeout(brightnessTimeoutRef.current);

        if (queuedBrightnessRef.current != null) {
            onUpdateSettings({ brightness: queuedBrightnessRef.current });
        }
    }, [onUpdateSettings]);

    const handleDraftChange = (key, value) => {
        setDraft(prev => ({
            ...prev,
            [key]: value,
        }));
        setError('');
    };

    const flushBrightnessUpdate = () => {
        window.clearTimeout(brightnessTimeoutRef.current);

        if (queuedBrightnessRef.current == null) {
            return;
        }

        const nextBrightness = queuedBrightnessRef.current;
        queuedBrightnessRef.current = null;
        onUpdateSettings({ brightness: nextBrightness });
    };

    const handleBrightnessChange = (value) => {
        setBrightnessDraft(value);
        setError('');

        const nextBrightness = clampWholeNumber(value, config.minBrightness, config.maxBrightness, settings.brightness);
        queuedBrightnessRef.current = nextBrightness;

        window.clearTimeout(brightnessTimeoutRef.current);
        brightnessTimeoutRef.current = window.setTimeout(() => {
            flushBrightnessUpdate();
        }, 120);
    };

    const handleSubmit = (event) => {
        event.preventDefault();

        const nextMaxGens = parseWholeNumber(
            draft.maxGens,
            config.minMaxGens,
            config.maxMaxGens,
            'Max generations'
        );

        if (nextMaxGens.error) {
            setError(nextMaxGens.error);
            return;
        }

        const nextHashHistory = parseWholeNumber(
            draft.hashHistory,
            config.minHashHistory,
            config.maxHashHistory,
            'Stagnation window'
        );

        if (nextHashHistory.error) {
            setError(nextHashHistory.error);
            return;
        }

        setError('');
        onUpdateSettings({
            maxGens: nextMaxGens.value,
            hashHistory: nextHashHistory.value,
        });
    };

    const statusMessage = {
        saving: 'Saving changes…',
        saved: 'Changes saved.',
        error: 'Could not save device settings. Keeping previous firmware values.',
    }[settingsStatus];

    const shouldShowExportReminder = sessions.length > 0;
    const exportReminder = sessions.length >= config.maxSessions
        ? `History is full at ${config.maxSessions} sessions. Export your results before starting again.`
        : `Export your results soon. The dashboard keeps up to ${config.maxSessions} sessions.`;
    const clearErrorMessage = clearStatus === 'error'
        ? 'Could not clear stored history. Try again.'
        : '';

    return (
        <section className={styles.panel}>
            <div className={styles.header}>
                <div className={styles.headerCopy}>
                    <p className={styles.eyebrow}>System Control</p>
                    <p className={styles.title}>Settings</p>
                </div>
                <div className={styles.summaryStat}>
                    <span className={styles.summaryLabel}>Stored Sessions</span>
                    <span className={styles.summaryValue}>{sessions.length}</span>
                </div>
            </div>

            <div className={styles.grid}>
                <form className={styles.form} onSubmit={handleSubmit}>
                    <section className={styles.groupCard}>
                        <div className={styles.groupHeader}>
                            <p className={styles.sectionTitle}>Matrix Brightness</p>
                        </div>

                        <label className={styles.field}>
                            <span className={styles.label}>updates immediately</span>
                            <div className={styles.rangeRow}>
                                <input
                                    className={styles.range}
                                    type="range"
                                    min={config.minBrightness}
                                    max={config.maxBrightness}
                                    step="1"
                                    value={brightnessDraft}
                                    onChange={(event) => handleBrightnessChange(event.target.value)}
                                    onBlur={flushBrightnessUpdate}
                                    onPointerUp={flushBrightnessUpdate}
                                    onTouchEnd={flushBrightnessUpdate}
                                />
                                <span className={styles.valueBadge}>{brightnessDraft}</span>
                            </div>
                        </label>
                    </section>

                    <section className={`${styles.groupCard} ${styles.groupCardDeferred}`}>
                        <div className={styles.groupHeader}>
                            <p className={styles.sectionTitle}>Next Session modifications</p>
                            <p className={styles.hint}>Set these first, then start a fresh session to use them.</p>
                        </div>

                        <div className={styles.fieldGrid}>
                            <label className={styles.field}>
                                <span className={styles.label}>Max Generations</span>
                                <input
                                    className={styles.input}
                                    type="number"
                                    min={config.minMaxGens}
                                    max={config.maxMaxGens}
                                    step="1"
                                    value={draft.maxGens}
                                    onChange={(event) => handleDraftChange('maxGens', event.target.value)}
                                />
                                <span className={styles.hint}>Applies to the next freshly seeded session only.</span>
                            </label>

                            <label className={styles.field}>
                                <span className={styles.label}>Stagnation Window</span>
                                <input
                                    className={styles.input}
                                    type="number"
                                    min={config.minHashHistory}
                                    max={config.maxHashHistory}
                                    step="1"
                                    value={draft.hashHistory}
                                    onChange={(event) => handleDraftChange('hashHistory', event.target.value)}
                                />
                                <span className={styles.hint}>Checks this many recent hashes for repeats on the next fresh session.</span>
                            </label>
                        </div>

                        <div className={styles.formFooter}>
                            <button className={styles.saveBtn} type="submit">
                                Apply Next Session Settings
                            </button>
                        </div>
                    </section>

                    {statusMessage ? (
                        <p className={`${styles.feedback} ${settingsStatus === 'error' ? styles.error : ''}`}>
                            {statusMessage}
                        </p>
                    ) : null}
                    {error ? <p className={`${styles.feedback} ${styles.error}`}>{error}</p> : null}
                </form>

                <div className={styles.exportBlock}>
                    <p className={styles.sectionTitle}>Export Session History</p>
                    <p className={styles.hint}>
                        CSV is spreadsheet-friendly. JSON keeps the raw session payload exactly as the dashboard sees it.
                    </p>
                    <label className={styles.field}>
                        <span className={styles.label}>File Name</span>
                        <input
                            className={styles.input}
                            type="text"
                            placeholder="run1_2026_04_01"
                            value={draft.exportLabel}
                            onChange={(event) => handleDraftChange('exportLabel', event.target.value)}
                        />
                        <span className={styles.hint}>Include the date: <code>runX_YYYY_MM_DD</code>, for example <code>run1_2026_04_01</code>. Spaces and punctuation are cleaned automatically.</span>
                    </label>
                    {shouldShowExportReminder ? (
                        <p className={styles.reminder}>{exportReminder}</p>
                    ) : null}
                    <div className={styles.actions}>
                        <button
                            className={styles.exportBtn}
                            type="button"
                            onClick={() => onExportCsv(draft.exportLabel)}
                            disabled={sessions.length === 0}
                        >
                            Export CSV
                        </button>
                        <button
                            className={styles.exportBtn}
                            type="button"
                            onClick={() => onExportJson(draft.exportLabel)}
                            disabled={sessions.length === 0}
                        >
                            Export JSON
                        </button>
                    </div>
                    <div className={styles.tertiaryBlock}>
                        <p className={styles.tertiaryTitle}>Reset Stored Results</p>
                        <p className={styles.hint}>
                            Clears recorded session history and returns the dashboard to its idle state.
                        </p>
                        <button
                            className={styles.clearBtn}
                            type="button"
                            onClick={onClear}
                            disabled={clearStatus === 'clearing'}
                        >
                            <span className={styles.clearBtnContent}>
                                {clearStatus === 'clearing' ? (
                                    <span className={styles.spinner} aria-hidden="true" />
                                ) : null}
                                {clearStatus === 'clearing' ? 'Clearing…' : 'Clear History'}
                            </span>
                        </button>
                        {clearErrorMessage ? (
                            <p className={`${styles.feedback} ${styles.error}`}>{clearErrorMessage}</p>
                        ) : null}
                    </div>
                </div>
            </div>
        </section>
    );
}
