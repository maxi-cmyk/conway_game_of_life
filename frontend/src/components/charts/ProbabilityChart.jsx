import { Line } from 'react-chartjs-2';
import { ciStats } from '../../lib/stats';
import { alphaColor, readToken } from '../../lib/theme';

const options = {
    responsive: true,
    maintainAspectRatio: true,
    scales: {
        x: { display: false },
        y: {
            min: 0,
            max: 1,
            grid: { color: '#1a1a1a' },
            ticks: { maxTicksLimit: 5, color: '#444' },
            border: { color: '#222' },
        }
    },
    plugins: {
        legend: {
            display: true,
            labels: {
                filter: item => item.text !== '',
                color: '#888',
                boxWidth: 10,
                padding: 12,
                font: { size: 11 }
            }
        }
    },
    elements: {
        point: { radius: 0 },
        line:  { tension: 0.3, borderWidth: 1.5 }
    }
};

export function ProbabilityChart({ pBirth, pDeath }) {
    const len   = Math.max(pBirth.length, pDeath.length);
    const bCI   = ciStats(pBirth);
    const dCI   = ciStats(pDeath);
    const xAxis = Array.from({ length: len }, (_, i) => i);
    const birthColor = readToken('--color-birth') || '#4CAF50';
    const deathColor = readToken('--color-death') || '#F44336';
    const birthFill = alphaColor(birthColor, 0.12) || 'rgba(76,175,80,0.12)';
    const deathFill = alphaColor(deathColor, 0.12) || 'rgba(244,67,54,0.12)';

    const chartData = {
        labels: xAxis,
        datasets: [
            {
                label: 'P(birth)',
                data: [...pBirth],
                borderColor: birthColor,
                fill: false,
            },
            {
                label: '',
                data: Array(len).fill(bCI.upper),
                borderColor: 'transparent',
                backgroundColor: birthFill,
                fill: '+1',
                pointRadius: 0,
            },
            {
                label: '',
                data: Array(len).fill(bCI.lower),
                borderColor: 'transparent',
                fill: false,
                pointRadius: 0,
            },
            {
                label: 'P(death)',
                data: [...pDeath],
                borderColor: deathColor,
                fill: false,
            },
            {
                label: '',
                data: Array(len).fill(dCI.upper),
                borderColor: 'transparent',
                backgroundColor: deathFill,
                fill: '+1',
                pointRadius: 0,
            },
            {
                label: '',
                data: Array(len).fill(dCI.lower),
                borderColor: 'transparent',
                fill: false,
                pointRadius: 0,
            },
        ]
    };

    return <Line data={chartData} options={options} />;
}
