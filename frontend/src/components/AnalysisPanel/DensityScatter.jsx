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
                min: 0,
                max: 1,
                title: { display: true, text: 'Probability', color: textSecondary },
                grid: { color: border },
            },
        },
        plugins: {
            legend: {
                display: true,
                labels: { usePointStyle: true, padding: 12 },
            },
        },
    };
}

export function DensityScatter({ sessions }) {
    const data = {
        datasets: [
            {
                label: 'P(Birth)',
                data: sessions.map(session => ({
                    x: session.density ?? 0,
                    y: (session.avgPBirth ?? 0) / 100,
                })),
                backgroundColor: readToken('--color-birth'),
                pointRadius: 4,
            },
            {
                label: 'P(Death)',
                data: sessions.map(session => ({
                    x: session.density ?? 0,
                    y: (session.avgPDeath ?? 0) / 100,
                })),
                backgroundColor: readToken('--color-death'),
                pointRadius: 4,
            },
        ],
    };

    return (
        <section className={styles.card}>
            <div className={styles.title}>Density Function</div>
            <div className={styles.canvas}>
                <Scatter data={data} options={getOptions()} />
            </div>
        </section>
    );
}
