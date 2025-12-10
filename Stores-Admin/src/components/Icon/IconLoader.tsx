import { FC } from 'react';
import aluminiLogo from './morevans.png'; // Adjust path to your image

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
                    <img src={aluminiLogo} alt="Alumni Logo" className="w-full h-full object-contain" />
                </div>
            </div>
        </div>
    );
};

export default IconLoader;
