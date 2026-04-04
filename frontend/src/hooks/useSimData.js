import { useState, useEffect, useRef, useCallback } from 'react';
import config from '../config';
import { buildSessionCsv, buildSessionJson } from '../lib/sessions';

function clampNumber(value, min, max, fallback) {
    const parsed = Number.parseInt(String(value), 10);

    if (Number.isNaN(parsed)) {
        return fallback;
    }

    return Math.min(max, Math.max(min, parsed));
}

function sanitizeExportLabel(label) {
    return String(label ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 40);
}

function getExportIdWithDate(label) {
    const safeLabel = sanitizeExportLabel(label);
    let exportId = safeLabel || 'session_history';
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateSuffix = `_${year}_${month}_${day}`;
    if (!exportId.endsWith(dateSuffix)) {
        exportId += dateSuffix;
    }
    return exportId;
}

export function useSimData() {
    // Live snapshot
    const [snap, setSnap] = useState({
        pop: 0, born: 0, died: 0, entropy: 0,
        pBirth: 0, pDeath: 0, density: 0,
        session: 0, batchTarget: 0, totalSessions: 0, state: 'IDLE'
    });

    const [settings, setSettings] = useState({
        brightness: config.defaultBrightness,
        maxGens: config.defaultMaxGens,
        hashHistory: config.defaultHashHistory,
    });

    const [settingsStatus, setSettingsStatus] = useState('idle');
    const [clearStatus, setClearStatus] = useState('idle');
    const [streamStatus, setStreamStatus] = useState('connecting');

    // Rolling time series (last N points)
    const [popHistory,     setPopHistory]     = useState([]);
    const [entropyHistory, setEntropyHistory] = useState([]);

    // Probability windows
    const [pBirthRolling,    setPBirthRolling]    = useState([]);
    const [pDeathRolling,    setPDeathRolling]    = useState([]);
    const [pBirthPersistent, setPBirthPersistent] = useState([]);
    const [pDeathPersistent, setPDeathPersistent] = useState([]);

    // Session history from /history
    const [sessions, setSessions] = useState([]);

    // UI state
    const [windowMode, setWindowMode] = useState('rolling');

    // Internal refs — don't need to trigger re-renders
    const lastTotalSessionsRef = useRef(0);
    const pendingHistoryTargetRef = useRef(0);
    const settingsStatusTimeoutRef = useRef();
    const clearStatusTimeoutRef = useRef();
    const streamStatusRef = useRef('connecting');
    const settingsRequestIdRef = useRef(0);

    const resetLiveHistory = useCallback(() => {
        setPopHistory([]);
        setEntropyHistory([]);
        setPBirthRolling([]);
        setPDeathRolling([]);
    }, []);

    const setTransientSettingsStatus = useCallback((nextStatus) => {
        window.clearTimeout(settingsStatusTimeoutRef.current);
        setSettingsStatus(nextStatus);

        if (nextStatus === 'saved') {
            settingsStatusTimeoutRef.current = window.setTimeout(() => {
                setSettingsStatus('idle');
            }, 1600);
        }
    }, []);

    const setTransientClearStatus = useCallback((nextStatus) => {
        window.clearTimeout(clearStatusTimeoutRef.current);
        setClearStatus(nextStatus);

        if (nextStatus === 'error') {
            clearStatusTimeoutRef.current = window.setTimeout(() => {
                setClearStatus('idle');
            }, 2200);
        }
    }, []);

    const fetchHistory = useCallback(async () => {
        try {
            const response = await fetch(`${config.apiBase}/history`);
            const data = await response.json();
            const nextSessions = data.sessions || [];
            setSessions(nextSessions);
            lastTotalSessionsRef.current = nextSessions.length;
            return nextSessions;
        } catch (error) {
            return [];
        }
    }, []);

    const fetchSettings = useCallback(async () => {
        try {
            const response = await fetch(`${config.apiBase}/settings`);
            const data = await response.json();

            setSettings(prev => ({
                ...prev,
                brightness: clampNumber(data.brightness, config.minBrightness, config.maxBrightness, prev.brightness),
                maxGens: clampNumber(data.maxGens, config.minMaxGens, config.maxMaxGens, prev.maxGens),
                hashHistory: clampNumber(data.hashHistory, config.minHashHistory, config.maxHashHistory, prev.hashHistory),
            }));

            return data;
        } catch (error) {
            return null;
        }
    }, []);

    const push = useCallback((setter, value, maxLen) => {
        setter(prev => {
            const next = [...prev, value];
            return next.length > maxLen ? next.slice(1) : next;
        });
    }, []);

    const updateStreamStatus = useCallback((nextStatus) => {
        streamStatusRef.current = nextStatus;
        setStreamStatus(nextStatus);
    }, []);

    const applySnapshot = useCallback(async (d, options = {}) => {
        const {
            appendRunningData = true,
            fallbackSnapshot = null,
        } = options;

        const nextSnap = fallbackSnapshot
            ? {
                ...d,
                state: d.state === 'IDLE' && fallbackSnapshot.state === 'RUNNING'
                    ? fallbackSnapshot.state
                    : d.state,
                session: d.batchTarget > 0
                    ? d.session
                    : (fallbackSnapshot.session ?? d.session),
                batchTarget: d.batchTarget > 0
                    ? d.batchTarget
                    : (fallbackSnapshot.batchTarget ?? d.batchTarget),
            }
            : d;

        setSnap(nextSnap);

        if (d.totalSessions > lastTotalSessionsRef.current && d.totalSessions > pendingHistoryTargetRef.current) {
            pendingHistoryTargetRef.current = d.totalSessions;
            await fetchHistory();
            pendingHistoryTargetRef.current = lastTotalSessionsRef.current;
            resetLiveHistory();
        }

        if (appendRunningData && d.state === 'RUNNING') {
            push(setPopHistory, d.pop, config.timePoints);
            push(setEntropyHistory, d.entropy, config.timePoints);
            push(setPBirthRolling, d.pBirth, config.rollingSize);
            push(setPDeathRolling, d.pDeath, config.rollingSize);
            push(setPBirthPersistent, d.pBirth, config.persistentSize);
            push(setPDeathPersistent, d.pDeath, config.persistentSize);
        }
    }, [fetchHistory, push, resetLiveHistory]);

    const fetchSnapshot = useCallback(async (options = {}) => {
        const response = await fetch(`${config.apiBase}/data`);
        const data = await response.json();
        await applySnapshot(data, options);
        return data;
    }, [applySnapshot]);

    useEffect(() => {
        fetchHistory();
        fetchSettings();
    }, [fetchHistory, fetchSettings]);

    useEffect(() => {
        let active = true;
        let source = null;

        if (typeof window === 'undefined' || !('EventSource' in window)) {
            fetchSnapshot({ appendRunningData: false }).catch(() => {});
            updateStreamStatus('disconnected');
            return () => {
                active = false;
            };
        }

        updateStreamStatus('connecting');
        source = new EventSource(`${config.apiBase}/events`);

        const handleSnapshot = (event) => {
            try {
                const data = JSON.parse(event.data);
                applySnapshot(data).catch(() => {});
            } catch (error) {
                // Ignore malformed events and wait for the next full snapshot.
            }
        };

        const handleSettings = (event) => {
            try {
                const data = JSON.parse(event.data);

                setSettings(prev => ({
                    ...prev,
                    brightness: clampNumber(data.brightness, config.minBrightness, config.maxBrightness, prev.brightness),
                    maxGens: clampNumber(data.maxGens, config.minMaxGens, config.maxMaxGens, prev.maxGens),
                    hashHistory: clampNumber(data.hashHistory, config.minHashHistory, config.maxHashHistory, prev.hashHistory),
                }));
            } catch (error) {
                // Ignore malformed settings updates and keep the last known values.
            }
        };

        const handleOpen = () => {
            if (!active) {
                return;
            }

            updateStreamStatus('connected');
        };

        const handleError = () => {
            if (!active || source == null) {
                return;
            }

            updateStreamStatus(
                source.readyState === EventSource.CLOSED
                    ? 'disconnected'
                    : 'reconnecting'
            );
        };

        source.addEventListener('snapshot', handleSnapshot);
        source.addEventListener('settings', handleSettings);
        source.addEventListener('open', handleOpen);
        source.onerror = handleError;

        return () => {
            active = false;
            if (source != null) {
                source.close();
            }
        };
    }, [applySnapshot, fetchSnapshot, updateStreamStatus]);

    useEffect(() => () => {
        window.clearTimeout(settingsStatusTimeoutRef.current);
        window.clearTimeout(clearStatusTimeoutRef.current);
    }, []);

    const syncAfterAction = useCallback((nextState, overrides = {}) => {
        const optimistic = { ...overrides, state: nextState };

        setSnap(prev => ({ ...prev, ...optimistic }));
        if (streamStatusRef.current !== 'connected') {
            fetchSnapshot({
                appendRunningData: false,
                fallbackSnapshot: optimistic,
            }).catch(() => {});
        }
    }, [fetchSnapshot]);

    const start = useCallback(() => {
        const input = window.prompt(
            'How many sessions should this run play through? Enter a whole number from 3 to 30.',
            String(config.sessionsPerBlock)
        );

        if (input === null) {
            return;
        }

        const count = Number.parseInt(input.trim(), 10);
        const isWholeNumber = String(count) === input.trim();

        if (!isWholeNumber || count < 3 || count > 30) {
            window.alert('Enter a whole number from 3 to 30.');
            return;
        }

        fetch(`${config.apiBase}/run?count=${count}`, { method: 'POST' })
            .then(() => {
                resetLiveHistory();
                syncAfterAction('RUNNING', { session: 1, batchTarget: count });
            })
            .catch(() => {});
    }, [resetLiveHistory, syncAfterAction]);

    const restart = useCallback(() => {
        fetch(`${config.apiBase}/restart`, { method: 'POST' })
            .then(() => {
                resetLiveHistory();
                syncAfterAction('RUNNING');
            })
            .catch(() => {});
    }, [resetLiveHistory, syncAfterAction]);

    const pause = useCallback(() => {
        fetch(`${config.apiBase}/pause`, { method: 'POST' })
            .then(() => {
                syncAfterAction('PAUSED');
            })
            .catch(() => {});
    }, [syncAfterAction]);

    const resume = useCallback(() => {
        fetch(`${config.apiBase}/resume`, { method: 'POST' })
            .then(() => {
                syncAfterAction('RUNNING');
            })
            .catch(() => {});
    }, [syncAfterAction]);

    const clearHistory = useCallback(() => {
        setClearStatus('clearing');
        fetch(`${config.apiBase}/clear`, { method: 'POST' })
            .then(() => {
                resetLiveHistory();
                setPBirthPersistent([]);
                setPDeathPersistent([]);
                setSessions([]);
                lastTotalSessionsRef.current = 0;
                pendingHistoryTargetRef.current = 0;
                syncAfterAction('IDLE', {
                    pop: 0,
                    born: 0,
                    died: 0,
                    entropy: 0,
                    pBirth: 0,
                    pDeath: 0,
                    session: 0,
                    batchTarget: 0,
                    totalSessions: 0,
                });
                setClearStatus('idle');
            })
            .catch(() => {
                setTransientClearStatus('error');
            });
    }, [resetLiveHistory, setTransientClearStatus, syncAfterAction]);

    const downloadExport = useCallback((filename, type, content) => {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');

        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 0);
    }, []);

    const exportCSV = useCallback((label = '') => {
        if (sessions.length === 0) {
            return;
        }

        const exportId = getExportIdWithDate(label);
        const csv = buildSessionCsv(sessions, exportId);
        downloadExport(`${exportId}.csv`, 'text/csv;charset=utf-8', csv);
    }, [downloadExport, sessions]);

    const exportJSON = useCallback((label = '') => {
        if (sessions.length === 0) {
            return;
        }

        const exportId = getExportIdWithDate(label);
        const json = buildSessionJson(sessions);
        downloadExport(`${exportId}.json`, 'application/json;charset=utf-8', json);
    }, [downloadExport, sessions]);

    const updateSettings = useCallback(async (partial) => {
        const requestId = settingsRequestIdRef.current + 1;
        settingsRequestIdRef.current = requestId;
        const firmwarePayload = {};

        if (partial.brightness != null) {
            firmwarePayload.brightness = clampNumber(
                partial.brightness,
                config.minBrightness,
                config.maxBrightness,
                settings.brightness
            );
        }

        if (partial.maxGens != null) {
            firmwarePayload.maxGens = clampNumber(
                partial.maxGens,
                config.minMaxGens,
                config.maxMaxGens,
                settings.maxGens
            );
        }

        if (partial.hashHistory != null) {
            firmwarePayload.hashHistory = clampNumber(
                partial.hashHistory,
                config.minHashHistory,
                config.maxHashHistory,
                settings.hashHistory
            );
        }

        if (Object.keys(firmwarePayload).length === 0) {
            setTransientSettingsStatus('saved');
            return;
        }

        setSettingsStatus('saving');

        try {
            const response = await fetch(`${config.apiBase}/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(firmwarePayload),
            });
            const data = await response.json();

            if (requestId !== settingsRequestIdRef.current) {
                return;
            }

            setSettings(prev => ({
                ...prev,
                brightness: clampNumber(data.brightness, config.minBrightness, config.maxBrightness, prev.brightness),
                maxGens: clampNumber(data.maxGens, config.minMaxGens, config.maxMaxGens, prev.maxGens),
                hashHistory: clampNumber(data.hashHistory, config.minHashHistory, config.maxHashHistory, prev.hashHistory),
            }));

            setTransientSettingsStatus('saved');
        } catch (error) {
            if (requestId !== settingsRequestIdRef.current) {
                return;
            }
            setSettingsStatus('error');
        }
    }, [setTransientSettingsStatus, settings]);

    return {
        ...snap,
        settings,
        settingsStatus,
        clearStatus,
        streamStatus,
        popHistory,
        entropyHistory,
        pBirthRolling,
        pDeathRolling,
        pBirthPersistent,
        pDeathPersistent,
        sessions,
        windowMode,
        setWindowMode,
        start,
        restart,
        pause,
        resume,
        clearHistory,
        exportCSV,
        exportJSON,
        updateSettings,
    };
}
