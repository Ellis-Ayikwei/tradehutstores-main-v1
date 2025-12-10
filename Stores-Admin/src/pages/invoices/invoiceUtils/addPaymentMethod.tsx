import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState } from 'react';
import { useDispatch } from 'react-redux';
import IconLoader from '../../../components/Icon/IconLoader';
import IconX from '../../../components/Icon/IconX';
import axiosInstance from '../../../services/axiosInstance';
import { mutate } from 'swr';

interface AddPaymentProps {
    showModal: boolean;
    setShowModal: (value: boolean) => void;
}

const AddPaymentMethod = ({ showModal, setShowModal }: AddPaymentProps) => {
    const dispatch = useDispatch();

    const [amount, setAmount] = useState<number>(0);
    const [isSaveLoading, setIsSaveLoading] = useState(false);
    const [newPaymentMethod, setNewPaymentMethod] = useState<string>('');

    const savePaymentMethod = async () => {
        setIsSaveLoading(true);
        try {
            const response = await axiosInstance.post('/payment_methods', { name: newPaymentMethod });
            if (response.status === 201) {
                mutate("/payment_methods");
                setShowModal(false);
            }
        } catch (error: any) {
            console.error('Error:', error);
        } finally {
            setIsSaveLoading(false);
        }
    };


    return (
        <Transition appear show={showModal} as={Fragment}>
            <Dialog as="div" open={showModal} onClose={() => setShowModal(false)} className="relative z-[51]">
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0 bg-[black]/60" />
                </Transition.Child>
                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center px-4 py-8">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="panel border-0 p-0 rounded-lg overflow-y-scroll w-full max-w-lg text-black dark:text-white-dark">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="absolute top-4 ltr:right-4 rtl:left-4 text-gray-400 hover:text-gray-800 dark:hover:text-gray-600 outline-none"
                                >
                                    <IconX />
                                </button>
                                <div className="text-lg font-medium bg-[#fbfbfb] dark:bg-[#121c2c] ltr:pl-5 rtl:pr-5 py-3 ltr:pr-[50px] rtl:pl-[50px]">Add New Payment</div>
                                <div className="p-5">
                                    <form className="space-y-6">
                                        <div>
                                            <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Payment Method
                                            </label>
                                            <div className="mt-1">
                                                <input id="paymentMethod" type="text" className="form-input" onChange={(e) => setNewPaymentMethod(e.target.value)}/>
                                            </div>
                                        </div>
                                    </form>
                                    <div className="mt-8 flex items-center justify-end gap-3">
                                        <button type="button" className="btn btn-outline-danger" onClick={() => setShowModal(false)}>
                                            Cancel
                                        </button>
                                        <button onClick={savePaymentMethod} type="button" className="btn btn-success" disabled={isSaveLoading}>
                                            {!isSaveLoading ? 'Add' : <IconLoader className="animate-spin inline-block" />}
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

export default AddPaymentMethod;
