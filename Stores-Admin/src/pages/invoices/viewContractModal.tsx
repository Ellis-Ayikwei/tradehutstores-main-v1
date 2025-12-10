import { Dialog, Transition } from '@headlessui/react';
import Tippy from '@tippyjs/react';
import { Fragment } from 'react';
import IconClock from '../../components/Icon/IconClock';
import IconEye from '../../components/Icon/IconEye';
import IconInfoCircle from '../../components/Icon/IconInfoCircle';
import IconX from '../../components/Icon/IconX';
import IconMenuPages from '../../components/Icon/Menu/IconMenuPages';

interface ViewContractModalProps {
    viewContractModal: boolean;
    setViewContarctModal: (value: boolean) => void;
}

const ViewContractModal = ({ viewContractModal, setViewContarctModal }: ViewContractModalProps) => {
    const contractStatus = 'active';

    return (
        <Transition appear show={viewContractModal} as={Fragment}>
            <Dialog as="div" open={viewContractModal} onClose={() => setViewContarctModal(false)}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0" />
                </Transition.Child>
                <div className="fixed inset-0 z-[999] overflow-y-auto bg-[black]/60">
                    <div className="flex min-h-screen items-center justify-center px-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel as="div" className="panel my-8 w-full max-w-lg overflow-hidden rounded-lg border-0 p-0 text-black dark:text-white-dark">
                                <div className="flex items-center justify-between bg-[#fbfbfb] px-5 py-3 dark:bg-[#121c2c]">
                                    <h1 className="text-2xl font-bold mb-4">Contract Details</h1>
                                    <button type="button" className="text-white-dark hover:text-dark" onClick={() => setViewContarctModal(false)}>
                                        <IconX />
                                    </button>
                                </div>
                                <div className="p-5">
                                    <div className="mx-auto px-4 py-6">
                                        {/* Contract Details Section */}
                                        <div className="bg-white p-6 rounded-lg">
                                            <h2 className="text-lg font-semibold text-gray-800 mb-3">Contract Information</h2>

                                            <div className="space-y-4">
                                                {/* Display Insurance Package */}
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Group Name:</span>
                                                    <span className="font-semibold">Group %6</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Members:</span>
                                                    <span className="font-semibold">200 members</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Insurance Package:</span>
                                                    <span className="font-semibold">insurancePackage</span>
                                                </div>

                                                {/* Display Contract Dates */}
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Date Created:</span>
                                                    <span className="font-semibold"></span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Date Signed:</span>
                                                    <span className="font-semibold"></span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Expiry Date:</span>
                                                    <span className="font-semibold"></span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">UnderWriter:</span>
                                                    <span className="font-semibold"></span>
                                                </div>

                                                {/* Display Contract Status with Tooltip */}
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600">Status:</span>
                                                    {contractStatus === 'active' ? (
                                                        <Tippy content={`Expires on`}>
                                                            <p className="flex items-center rounded-full bg-green-500 px-2 py-1 text-xs text-white font-semibold">
                                                                <IconClock className="w-3 h-3 ltr:mr-1 rtl:ml-1" />
                                                                Active
                                                            </p>
                                                        </Tippy>
                                                    ) : contractStatus === 'expired' ? (
                                                        <Tippy content={`Expired on `}>
                                                            <p className="flex items-center rounded-full bg-red-500 px-2 py-1 text-xs text-white-light font-semibold">
                                                                <IconInfoCircle className="w-3 h-3 ltr:mr-1 rtl:ml-1" />
                                                                Expired
                                                            </p>
                                                        </Tippy>
                                                    ) : (
                                                        <Tippy content={`Terminated on `}>
                                                            <p className="flex items-center rounded-full bg-red-500 px-2 py-1 text-xs text-white-light font-semibold">
                                                                <IconInfoCircle className="w-3 h-3 ltr:mr-1 rtl:ml-1" />
                                                                Terminated
                                                            </p>
                                                        </Tippy>
                                                    )}
                                                </div>

                                                {/* President of the Group */}

                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">President:</span>
                                                    <span className="font-semibold">presidentName</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Contract Document:</span>
                                                    <span className="flex gap-2 text-sm">
                                                        <Tippy content="view contract document">
                                                            <span className="font-semibold cursor-pointer rounded-full px-2 py-2 bg-green-300 justify-center items-center">
                                                                <IconEye />
                                                            </span>
                                                        </Tippy>
                                                        <Tippy content="Download contract document as PDF">
                                                            <span className="font-medium flex gap-2 justify-center items-center border-2 border-green-300 rounded-full px-2 py-1">
                                                                <IconMenuPages />
                                                                Pdf
                                                            </span>
                                                        </Tippy>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-8 flex items-center justify-end">
                                        <button type="button" className="btn btn-outline-danger" onClick={() => setViewContarctModal(false)}>
                                            Close
                                        </button>
                                        <button type="button" className="btn btn-primary ltr:ml-4 rtl:mr-4" onClick={() => setViewContarctModal(false)}>
                                            Edit
                                        </button>
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default ViewContractModal;
