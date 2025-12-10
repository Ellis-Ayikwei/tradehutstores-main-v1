'use client';

const Footer = () => {
    return (
        <footer className="bg-gray-800 text-gray-400 text-xs py-2 px-4 w-full">
            <div className="max-w-screen-xl mx-auto flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
                <div className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-4">
                    <span>MoreVans Admin v1.0.0</span>
                    <span className="hidden sm:inline text-gray-600">|</span>
                    <span>© {new Date().getFullYear()} MoreVans</span>
                </div>
                <div className="text-center sm:text-left">
                    <span>Made and maintained by TradeHut</span>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
