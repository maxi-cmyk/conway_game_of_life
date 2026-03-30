export function readToken(name) {
    if (typeof document === 'undefined') {
        return '';
    }

    return getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim();
}

export function alphaColor(color, alpha) {
    if (!color) {
        return '';
    }

    if (color.startsWith('#')) {
        let hex = color.slice(1);

        if (hex.length === 3) {
            hex = hex.split('').map(char => char + char).join('');
        }

        if (hex.length === 6) {
            const value = Number.parseInt(hex, 16);
            const red = (value >> 16) & 255;
            const green = (value >> 8) & 255;
            const blue = value & 255;
            return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
        }
    }

    if (color.startsWith('rgb(')) {
        return color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
    }

    if (color.startsWith('rgba(')) {
        return color.replace(/rgba\(([^)]+),\s*[\d.]+\)/, `rgba($1, ${alpha})`);
    }

    return color;
}
