import { FC } from 'react';
// Using public path for logo - ensure tradehut-logo.png exists in public/assets/images/
const tradehutLogo = '/assets/images/tradehut-logo.png'; // TradeHut logo - fallback to morevans.png if not found

interface IconLoaderProps {
    className?: string;
    fill?: boolean;
    duotone?: boolean;
    imageSize?: number;
    spinnerSize?: number;
    borderColor?: string;
    fullScreen?: boolean;
}

const IconLoader: FC<IconLoaderProps> = ({ className = '', fill = false, duotone = true, imageSize = 80, spinnerSize = 90, borderColor = '#1976d2', fullScreen = false }) => {
    return (
        <div className={fullScreen ? 'flex items-center justify-center h-screen' : 'inline-flex items-center justify-center'}>
            <div className="relative">
                {/* The spinner with fixed styling */}
                <div
                    className={`animate-spin ${className}`}
                    style={{
                        width: `${spinnerSize}px`,
                        height: `${spinnerSize}px`,
                        borderRadius: '50%',
                        borderWidth: '2px',
                        borderStyle: 'solid',
                        borderColor: 'transparent transparent ' + borderColor + ' transparent',
                    }}
                ></div>

                {/* The centered image */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" style={{ width: `${imageSize}px`, height: `${imageSize}px` }}>
                    <img src={tradehutLogo} alt="TradeHut Logo" className="w-full h-full object-contain" />
                </div>
            </div>
        </div>
    );
};

export default IconLoader;
