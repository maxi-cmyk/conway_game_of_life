const config = {
    apiBase:          import.meta.env.VITE_API_URL || '',
    pollInterval:     150,
    rollingSize:      20,
    persistentSize:   200,
    timePoints:       100,
    maxSessions:      30,
    sessionsPerBlock: 5,
    defaultMaxGens:   400,
    minMaxGens:       50,
    maxMaxGens:       2000,
};

export default config;
