import { Scatter } from 'react-chartjs-2';
import config from '../../config';
import { ExpandableChartCard } from '../charts/ExpandableChartCard';
import { readToken } from '../../lib/theme';

function getOptions() {
    const textSecondary = readToken('--text-secondary');
    const border = readToken('--border');

    return {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: {
                top: 14,
                right: 8,
                bottom: 0,
                left: 4,
            },
        },
        scales: {
            x: {
                min: config.densityMin,
                max: config.densityMax,
                title: { display: true, text: 'Density %', color: textSecondary },
                grid: { color: border },
                ticks: { color: textSecondary, padding: 8 },
            },
            y: {
                min: 0,
                max: 1,
                title: { display: true, text: 'Probability', color: textSecondary },
                grid: { color: border },
                ticks: { color: textSecondary, padding: 8 },
            },
        },
        plugins: {
            legend: {
                display: true,
                position: 'bottom',
                labels: {
                    usePointStyle: true,
                    padding: 16,
                    color: textSecondary,
                    font: { size: 11 },
                },
            },
        },
    };
}

export function DensityScatter({ sessions }) {
    if (!sessions || sessions.length === 0) {
        return (
            <ExpandableChartCard
                title="Density Function"
                emptyTitle="No finished sessions yet"
                emptyBody="Finish a session batch to compare density against average birth and death pressure."
            />
        );
    }

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

    return <ExpandableChartCard title="Density Function" renderChart={() => <Scatter data={data} options={getOptions()} />} />;
}
