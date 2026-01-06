import { useEnvironment } from '../../../contexts/EnvironmentContext';

export const Watermark = () => {
    const { currentEnv } = useEnvironment();

    // Do not show on PROD
    if (currentEnv.name === 'PROD') return null;

    const text = currentEnv.name;
    const color = currentEnv.themeColor === 'red' ? '#DC2626' : currentEnv.themeColor === 'orange' ? '#EA580C' : '#16A34A'; // Adjust colors if needed

    // Create an SVG string for the background
    const svgString = encodeURIComponent(`
    <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
        <style>
            .text { 
                fill: ${color}; 
                font-family: sans-serif; 
                font-size: 40px; 
                font-weight: 500; 
                opacity: 0.08; 
                transform: rotate(-45deg); 
                transform-origin: center; 
            }
        </style>
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" class="text">${text}</text>
    </svg>
    `);

    const dataUri = `url("data:image/svg+xml;utf8,${svgString}")`;

    return (
        <div
            className="fixed inset-0 pointer-events-none z-50"
            style={{
                backgroundImage: dataUri,
                backgroundRepeat: 'repeat',
                backgroundPosition: 'center'
            }}
        />
    );
};
