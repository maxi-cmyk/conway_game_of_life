import { Scatter } from 'react-chartjs-2';
import styles from '../charts/Charts.module.css';
import { readToken } from '../../lib/theme';

function getOptions() {
    const textSecondary = readToken('--text-secondary');
    const border = readToken('--border');

    return {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                min: 15,
                max: 55,
                title: { display: true, text: 'Density %', color: textSecondary },
                grid: { color: border },
            },
            y: {
                min: -1,
                max: 1,
                title: { display: true, text: 'Autocorrelation', color: textSecondary },
                grid: { color: border },
            },
        },
    };
}

export function AutocorrScatter({ sessions }) {
    const data = {
        datasets: [{
            label: 'Lag-1 autocorrelation',
            data: sessions.map(session => ({
                x: session.density ?? 0,
                y: (session.autocorr ?? 0) / 100,
            })),
            backgroundColor: readToken('--color-autocorr'),
            pointRadius: 4,
        }],
    };

    return (
        <section className={styles.card}>
            <div className={styles.title}>Autocorrelation vs Density</div>
            <div className={styles.canvas}>
                <Scatter data={data} options={getOptions()} />
            </div>
        </section>
    );
}
