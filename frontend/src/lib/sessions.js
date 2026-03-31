const END_REASON_LABELS = {
    0: 'stagnant',
    1: 'died',
    2: 'max gens',
};

const END_REASON_EXPORT_LABELS = {
    0: 'stagnant',
    1: 'died',
    2: 'max_gens',
};

export function getEndReasonLabel(reason) {
    return END_REASON_LABELS[reason] ?? '—';
}

export function getEndReasonExportLabel(reason) {
    return END_REASON_EXPORT_LABELS[reason] ?? String(reason ?? '');
}

export function buildSessionCsv(sessions, runId) {
    const header = 'run_id,session,density,peakPop,avgEntropy,avgPBirth,avgPDeath,generations,endReason,autocorr';
    const rows = sessions.map((session, index) => [
        runId,
        index + 1,
        session.density ?? '',
        session.peakPop ?? '',
        session.avgEntropy != null ? (session.avgEntropy / 100).toFixed(2) : '',
        session.avgPBirth != null ? (session.avgPBirth / 100).toFixed(3) : '',
        session.avgPDeath != null ? (session.avgPDeath / 100).toFixed(3) : '',
        session.generations ?? '',
        getEndReasonExportLabel(session.endReason),
        session.autocorr != null ? (session.autocorr / 100).toFixed(3) : '',
    ].join(','));

    return [header, ...rows].join('\n');
}

export function buildSessionJson(sessions) {
    return JSON.stringify(sessions, null, 2);
}
