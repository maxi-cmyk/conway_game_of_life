// t critical values for 95% CI (two-tailed, alpha=0.025)
const T_CRIT = {
    1:12.706, 2:4.303,  3:3.182,  4:2.776,  5:2.571,
    6:2.447,  7:2.365,  8:2.306,  9:2.262,  10:2.228,
    11:2.201, 12:2.179, 13:2.160, 14:2.145, 15:2.131,
    16:2.120, 17:2.110, 18:2.101, 19:2.093, 20:2.086,
    30:2.042, 40:2.021, 60:2.000, 120:1.980
};

export function tCritical(n) {
    if (n <= 1) return 12.706;
    const df   = n - 1;
    const keys = Object.keys(T_CRIT).map(Number).sort((a, b) => a - b);
    return T_CRIT[keys.reduce((p, c) =>
        Math.abs(c - df) < Math.abs(p - df) ? c : p
    )];
}

export function ciStats(values) {
    const n = values.length;
    if (n < 2) return { mean: values[0] || 0, upper: 1, lower: 0 };
    const mean   = values.reduce((a, b) => a + b) / n;
    const std    = Math.sqrt(
        values.map(x => (x - mean) ** 2).reduce((a, b) => a + b) / (n - 1)
    );
    const margin = tCritical(n) * (std / Math.sqrt(n));
    return {
        mean,
        upper: Math.min(1, mean + margin),
        lower: Math.max(0, mean - margin),
    };
}

export function autocorrelation(values, lag = 1) {
    const n = values.length;
    if (n < lag + 2) return 0;
    const mean = values.reduce((a, b) => a + b) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n - lag; i++)
        num += (values[i] - mean) * (values[i + lag] - mean);
    for (let i = 0; i < n; i++)
        den += (values[i] - mean) ** 2;
    return den === 0 ? 0 : num / den;
}
