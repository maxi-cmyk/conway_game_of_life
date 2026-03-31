import { useState, useEffect, useRef, useCallback } from 'react';
import config from '../config';
import { buildSessionCsv, buildSessionJson } from '../lib/sessions';

export function useSimData() {
    // Live snapshot
    const [snap, setSnap] = useState({
        pop: 0, born: 0, died: 0, entropy: 0,
        pBirth: 0, pDeath: 0, density: 0,
        session: 0, batchTarget: 0, totalSessions: 0,
        maxGens: config.defaultMaxGens, state: 'IDLE'
    });

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

    const resetLiveHistory = useCallback(() => {
        setPopHistory([]);
        setEntropyHistory([]);
        setPBirthRolling([]);
        setPDeathRolling([]);
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

    const push = useCallback((setter, value, maxLen) => {
        setter(prev => {
            const next = [...prev, value];
            return next.length > maxLen ? next.slice(1) : next;
        });
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

        if (d.totalSessions > lastTotalSessionsRef.current) {
            await fetchHistory();
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
        let active = true;
        let timeoutId;

        const poll = async () => {
            try {
                await fetchSnapshot();

                if (!active) {
                    return;
                }
            } catch (error) {
                // Ignore transient polling failures and try again on the next tick.
            } finally {
                if (active) {
                    timeoutId = window.setTimeout(poll, config.pollInterval);
                }
            }
        };

        poll();

        return () => {
            active = false;
            window.clearTimeout(timeoutId);
        };
    }, [fetchHistory, fetchSnapshot]);

    const syncAfterAction = useCallback((nextState, overrides = {}) => {
        const optimistic = { ...overrides, state: nextState };

        setSnap(prev => ({ ...prev, ...optimistic }));
        fetchSnapshot({
            appendRunningData: false,
            fallbackSnapshot: optimistic,
        }).catch(() => {});
    }, [fetchSnapshot]);

    const start = useCallback(() => {
        const input = window.prompt(
            'How many sessions should this run play through? Enter a whole number from 5 to 30.',
            String(config.sessionsPerBlock)
        );

        if (input === null) {
            return;
        }

        const count = Number.parseInt(input.trim(), 10);
        const isWholeNumber = String(count) === input.trim();

        if (!isWholeNumber || count < 5 || count > 30) {
            window.alert('Enter a whole number from 5 to 30.');
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
        fetch(`${config.apiBase}/clear`, { method: 'POST' })
            .then(() => {
                resetLiveHistory();
                setPBirthPersistent([]);
                setPDeathPersistent([]);
                setSessions([]);
                lastTotalSessionsRef.current = 0;
                syncAfterAction('IDLE', { session: 0, batchTarget: 0, totalSessions: 0 });
            })
            .catch(() => {});
    }, [resetLiveHistory, syncAfterAction]);

    const downloadExport = useCallback((filename, type, content) => {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');

        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 0);
    }, []);

    const exportCSV = useCallback(() => {
        if (sessions.length === 0) {
            return;
        }

        const runId = new Date().toISOString().slice(0, 10);
        const csv = buildSessionCsv(sessions, runId);
        downloadExport(`game_of_life_${runId}.csv`, 'text/csv;charset=utf-8', csv);
    }, [downloadExport, sessions]);

    const exportJSON = useCallback(() => {
        if (sessions.length === 0) {
            return;
        }

        const runId = new Date().toISOString().slice(0, 10);
        const json = buildSessionJson(sessions);
        downloadExport(`game_of_life_${runId}.json`, 'application/json;charset=utf-8', json);
    }, [downloadExport, sessions]);

    const updateMaxGens = useCallback((nextMaxGens) => {
        fetch(`${config.apiBase}/settings?maxGens=${nextMaxGens}`, { method: 'POST' })
            .then(async () => {
                setSnap(prev => ({ ...prev, maxGens: nextMaxGens }));
                await fetchSnapshot({ appendRunningData: false });
            })
            .catch(() => {});
    }, [fetchSnapshot]);

    return {
        ...snap,
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
        updateMaxGens,
    };
}
