export const modalStyles = {
    overlay: 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm overflow-y-auto px-4 py-6 sm:py-10',
    container: 'relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-auto my-auto min-h-[200px] max-h-[90vh] flex flex-col',
    header: 'bg-[#dc711a] p-4 sm:p-6 text-white rounded-t-2xl sticky top-0 z-10',
    title: 'text-lg sm:text-2xl font-bold',
    subtitle: 'text-white/80 text-sm sm:text-base mt-1',
    content: 'p-4 sm:p-6 overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100',
    footer: 'border-t p-4 sm:p-6 flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 sticky bottom-0 bg-white rounded-b-2xl',
    button: {
        primary: 'w-full sm:w-auto px-4 sm:px-6 py-2.5 bg-[#dc711a] text-white rounded-full hover:bg-[#b95d13] transition-colors disabled:opacity-50 text-sm sm:text-base font-medium',
        secondary: 'w-full sm:w-auto px-4 sm:px-6 py-2.5 text-gray-600 hover:text-gray-800 transition-colors text-sm sm:text-base font-medium',
    },
    input: 'w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#dc711a] focus:border-[#dc711a] text-sm sm:text-base',
    label: 'block text-sm font-medium text-gray-700 mb-1',
    grid: 'grid grid-cols-1 sm:grid-cols-2 gap-4',
    form: 'space-y-4 sm:space-y-6',
};
