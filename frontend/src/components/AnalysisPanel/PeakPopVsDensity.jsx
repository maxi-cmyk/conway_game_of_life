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
                max: 256,
                title: { display: true, text: 'Peak Population', color: textSecondary },
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

export function PeakPopVsDensity({ sessions }) {
    if (!sessions || sessions.length === 0) {
        return (
            <ExpandableChartCard
                title="Peak Population vs Density"
                emptyTitle="No finished sessions yet"
                emptyBody="Finish a session batch to compare seed density against the peak population each run reaches."
            />
        );
    }

    const data = {
        datasets: [{
            label: 'Sessions',
            data: sessions.map(session => ({
                x: session.density ?? 0,
                y: session.peakPop ?? 0,
            })),
            backgroundColor: readToken('--color-pop'),
            pointRadius: 4,
        }],
    };

    return <ExpandableChartCard title="Peak Population vs Density" renderChart={() => <Scatter data={data} options={getOptions()} />} />;
}
