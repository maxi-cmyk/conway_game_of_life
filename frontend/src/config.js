const config = {
    apiBase:                import.meta.env.VITE_API_URL || '',
    rollingSize:            20,
    persistentSize:         200,
    timePoints:             100,
    maxSessions:            30,
    sessionsPerBlock:       3,
    densityMin:             15,
    densityMax:             55,
    defaultBrightness:      4,
    minBrightness:          0,
    maxBrightness:          15,
    defaultMaxGens:         400,
    minMaxGens:             50,
    maxMaxGens:             2000,
    defaultHashHistory:     6,
    minHashHistory:         2,
    maxHashHistory:         12,
};

export default config;
