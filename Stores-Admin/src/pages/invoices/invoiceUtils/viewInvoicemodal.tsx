import { Dialog, Transition } from '@headlessui/react';
import dayjs from 'dayjs';
import { Fragment, useEffect, useState } from 'react';
import useAuthUser from 'react-auth-kit/hooks/useAuthUser';
import CurrencyInput from 'react-currency-input-field';
import { useDropzone } from 'react-dropzone';
import { useDispatch, useSelector } from 'react-redux';
import Select from 'react-select';
import useSwr, { mutate } from 'swr';
import IconLoader from '../../../components/Icon/IconLoader';
import IconX from '../../../components/Icon/IconX';
import axiosInstance from '../../../services/axiosInstance';
import fetcher from '../../../services/fetcher';
import { IRootState } from '../../../store';
import { GetAlumniData } from '../../../store/alumnigroupSlice';
import { GetPaymentsData } from '../../../store/paymentsSlice';
import { GetUsersData } from '../../../store/usersSlice';
import AddPaymentMethod from './addPaymentMethod';
import showMessage from './showMessage';

interface MakePaymentsProps {
    showModal: boolean;
    setShowModal: (value: boolean) => void;
    edit?: boolean;
    view?: boolean;
    setView?: (value: boolean) => void;
    invoiceId?: string;
    setInvoiceId?: (value: string) => void;
    setEdit?: (value: boolean) => void;
}

const ViewInvoice = ({ showModal, setShowModal, edit, setEdit, view, setView, invoiceId, setInvoiceId }: MakePaymentsProps) => {
    const dispatch = useDispatch();
    const { getRootProps, getInputProps } = useDropzone();
    const auth = useAuthUser() as { id: string };
    console.log(view, edit);

    useEffect(() => {
        dispatch(GetAlumniData() as any);
        dispatch(GetUsersData() as any);
    }, [dispatch]);

    const [amount, setAmount] = useState<number>(0);
    const groups = useSelector((state: IRootState) => state.alumnidata.alumniGroups);
    const users = useSelector((state: IRootState) => state.usersdata.usersData);
    const [files, setFiles] = useState([]);
    const [groupId, setGroupId] = useState<string>('');

    const [paymentMethod, setPaymentMethod] = useState<string>('');
    const [receiptUrl, setReceiptUrl] = useState<string>('');
    const [isSaveLoading, setIsSaveLoading] = useState(false);
    const [addNewMethodModal, setAddNewMethodModal] = useState(false);
    const [paymentAttachments, setPaymentAttachments] = useState<any[]>([]);

    const [params, setParams] = useState<any>({});

    const { data, error } = useSwr(edit || view ? `/invoices/${invoiceId}` : null, fetcher);
    const { data: groupUsers, error: groupUsersError, isLoading: groupUsersLoading } = useSwr(`/alumni_groups/${params.group_id}/members`, fetcher);
    console.log('groupes ', groupUsers);
    useEffect(() => {
        if (data) {
            console.log('data', data);
            setParams({
                ...data,
                due_date: dayjs(data.due_date).format('YYYY-MM-DD'),
                issue_date: dayjs(data.issue_date).format('YYYY-MM-DD'),
                paid_date: dayjs(data.paid_date).format('YYYY-MM-DD'),
            });
            console.log('params', { ...data });
        }
        return () => {
            setParams({});
        };
    }, [showModal, data, edit, view]);
    const savePayment = async () => {
        setIsSaveLoading(true);

        const payload = {
            ...params,
            created_by: auth?.id,
        };
        console.log(' the payload', payload);

        try {
            const response = !edit ? await axiosInstance.post('/invoices', payload) : await axiosInstance.put(`/invoices/${invoiceId}`, payload);
            if (response.status === 201 || response.status === 200) {
                showMessage(`Invoice has been ${edit ? 'updated' : 'created'} successfully.`, 'success');
                dispatch(GetPaymentsData() as any);
                mutate(`/invoices/${invoiceId}`);
                setShowModal(false);
            }
        } catch (error: any) {
            showMessage('An error occurred while creating Invoice.', 'error');
            console.error('Error:', error);
        } finally {
            setIsSaveLoading(false);
        }
    };

    type InputChangeEvent = React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
    const handleChange = (e: InputChangeEvent | React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setParams({ ...params, [id]: value });
    };

    const reset = () => {
        setShowModal(false), setEdit && setEdit(false), setView && setView(false), setInvoiceId && setInvoiceId(''), setParams && setParams({});
    };

    return (
        <Transition appear show={showModal} as={Fragment}>
            <Dialog
                as="div"
                open={showModal}
                onClose={() => {
                    reset();
                }}
                className="relative z-[51]"
            >
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
                                    onClick={() => {
                                        reset();
                                    }}
                                    className="absolute top-4 ltr:right-4 rtl:left-4 text-gray-400 hover:text-gray-800 dark:hover:text-gray-600 outline-none"
                                >
                                    <IconX />
                                </button>
                                <div className="text-lg font-medium bg-[#fbfbfb] dark:bg-[#121c2c] ltr:pl-5 rtl:pr-5 py-3 ltr:pr-[50px] rtl:pl-[50px]">
                                    {edit ? 'Edit Invoice' : view ? 'View Invoice' : 'Add New Invoice'}
                                </div>
                                <div className="p-5">
                                    <form className="space-y-6">
                                        {(edit || view) && (
                                            <div>
                                                <label htmlFor="invoice_number" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    Invoice Number
                                                </label>
                                                <div className="mt-1">
                                                    <input
                                                        id="invoice_number"
                                                        type="text"
                                                        defaultValue={params?.invoice_number}
                                                        onChange={(e) => handleChange(e)}
                                                        className="form-input"
                                                        readOnly={view}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        <div>
                                            <label htmlFor="invoice_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Invoice Type
                                            </label>
                                            <div className="mt-1">
                                                <Select
                                                    id="invoice_type"
                                                    classNamePrefix="select"
                                                    isSearchable={false}
                                                    isClearable={false}
                                                    onChange={(newValue) => handleChange({ target: { id: 'invoice_type', value: newValue?.value || '' } } as InputChangeEvent)}
                                                    defaultValue={data?.invoice_type ? { value: data?.invoice_type, label: data?.invoice_type } : ' '}
                                                    options={[
                                                        { value: 'GROUP_CONTRACT', label: 'Group Contract' },
                                                        { value: 'INDIVIDUAL_CONTRACT', label: 'Individual Contract' },
                                                    ]}
                                                    isDisabled={view}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label htmlFor="groupId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Group
                                            </label>
                                            <div className="mt-1">
                                                <Select
                                                    id="group_id"
                                                    classNamePrefix="select"
                                                    isSearchable={true}
                                                    isClearable={false}
                                                    onChange={(option: any) => handleChange({ target: { id: 'group_id', value: option.value } } as InputChangeEvent)}
                                                    defaultValue={data?.group_id ? { value: data?.group?.id, label: data?.group?.name } : ' '}
                                                    options={Object.values(groups)?.map((group) => ({
                                                        value: group.id,
                                                        label: group.name,
                                                    }))}
                                                    isDisabled={view}
                                                />
                                            </div>
                                        </div>

                                        {params.invoice_type === 'INDIVIDUAL_CONTRACT' && params?.group_id && (
                                            <div>
                                                <label htmlFor="billedUserId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    User
                                                </label>
                                                <div className="mt-1">
                                                    <Select
                                                        id="billed_user_id"
                                                        classNamePrefix="select"
                                                        isSearchable={true}
                                                        isClearable={false}
                                                        onChange={(option: any) => handleChange({ target: { id: 'billed_user_id', value: option.value } } as InputChangeEvent)}
                                                        defaultValue={data?.billed_user_id ? { value: data?.billed_user?.id, label: data?.billed_user?.full_name } : ' '}
                                                        options={groupUsers?.map((user) => ({
                                                            value: user?.user_info?.id,
                                                            label: user?.user_info?.full_name,
                                                        }))}
                                                        isDisabled={view}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <label htmlFor="total_amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Total Amount
                                            </label>
                                            <div className="mt-1">
                                                <CurrencyInput
                                                    id="total_amount"
                                                    name="total_amount"
                                                    prefix="GH₵ "
                                                    value={params?.total_amount || 0}
                                                    defaultValue={params?.total_amount}
                                                    decimalsLimit={2}
                                                    onValueChange={(value) => handleChange({ target: { id: 'total_amount', value: value || '' } } as InputChangeEvent)}
                                                    className="form-input"
                                                    readOnly={view}
                                                />
                                            </div>
                                        </div>

                                        {(edit || view) && (
                                            <div>
                                                <label htmlFor="total_paid" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    Total Paid
                                                </label>
                                                <div className="mt-1">
                                                    <CurrencyInput
                                                        id="total_paid"
                                                        name="total_paid"
                                                        prefix="GH₵ "
                                                        value={params?.total_paid || 0}
                                                        decimalsLimit={2}
                                                        onValueChange={(value) => handleChange({ target: { id: 'total_paid', value: value || '' } } as InputChangeEvent)}
                                                        className="form-input"
                                                        readOnly={view}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {(edit || view) && (
                                            <div>
                                                <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    Status
                                                </label>
                                                <div className="mt-1">
                                                    <Select
                                                        id="status"
                                                        classNamePrefix="select"
                                                        isSearchable={false}
                                                        isClearable={false}
                                                        onChange={(newValue) => handleChange({ target: { id: 'status', value: newValue?.value || '' } } as InputChangeEvent)}
                                                        defaultValue={data?.status ? { value: data?.status, label: data?.status } : ' '}
                                                        options={[
                                                            { value: 'DRAFT', label: 'Draft' },
                                                            { value: 'ISSUED', label: 'Issued' },
                                                            { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
                                                            { value: 'PAID', label: 'Paid' },
                                                            { value: 'OVERDUE', label: 'Overdue' },
                                                            { value: 'CANCELLED', label: 'Cancelled' },
                                                        ]}
                                                        isDisabled={view}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <label htmlFor="issue_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Issue Date
                                            </label>
                                            <div className="mt-1">
                                                <input
                                                    id="issue_date"
                                                    type="date"
                                                    defaultValue={(params?.issue_date && dayjs(params?.issue_date).format('YYYY-MM-DD')) || ''}
                                                    onChange={(e) => handleChange(e)}
                                                    className="form-input"
                                                    readOnly={view}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Due Date
                                            </label>
                                            <div className="mt-1">
                                                <input
                                                    id="due_date"
                                                    type="date"
                                                    defaultValue={(params?.due_date && dayjs(params?.due_date).format('YYYY-MM-DD')) || ''}
                                                    onChange={(e) => handleChange(e)}
                                                    className="form-input"
                                                    readOnly={view}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label htmlFor="paid_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Paid Date
                                            </label>
                                            <div className="mt-1">
                                                <input
                                                    id="paid_date"
                                                    type="date"
                                                    defaultValue={(params?.paid_date && dayjs(params?.paid_date).format('YYYY-MM-DD')) || ' '}
                                                    onChange={(e) => handleChange(e)}
                                                    className="form-input"
                                                    readOnly={view}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Description
                                            </label>
                                            <div className="mt-1">
                                                <textarea id="description" value={params?.description || ''} onChange={(e) => handleChange(e)} className="form-input" readOnly={view} />
                                            </div>
                                        </div>
                                        
                                        {/* <div>
                                            <label htmlFor="contractId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Contract
                                            </label>
                                            <div className="mt-1">
                                                <Select
                                                    id="contract_id"
                                                    classNamePrefix="select"
                                                    isSearchable={true}
                                                    isClearable={false}
                                                    onChange={(option: any) => handleChange({ target: { id: 'contract_id', value: option.value } } as InputChangeEvent)}
                                                    defaultValue={data?.contract_id ? { value: data?.contract?.id, label: data?.contract?.name } : ' '}
                                                    options={Object.values(contracts)?.map((contract) => ({
                                                        value: contract.id,
                                                        label: contract.name,
                                                    }))}
                                                    isDisabled={view}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label htmlFor="contractId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Insurance Package
                                            </label>
                                            <div className="mt-1">
                                                <Select
                                                    id="contract_id"
                                                    classNamePrefix="select"
                                                    isSearchable={true}
                                                    isClearable={false}
                                                    onChange={(option: any) => handleChange({ target: { id: 'contract_id', value: option.value } } as InputChangeEvent)}
                                                    defaultValue={data?.contract_id ? { value: data?.contract?.id, label: data?.contract?.name } : ' '}
                                                    options={Object.values(contracts)?.map((contract) => ({
                                                        value: contract.id,
                                                        label: contract.name,
                                                    }))}
                                                    isDisabled={view}
                                                />
                                            </div>
                                        </div> */}
                                    </form>
                                    <div className="mt-8 flex items-center justify-end gap-3">
                                        <button
                                            type="button"
                                            className="btn btn-outline-danger"
                                            onClick={() => {
                                                reset();
                                            }}
                                        >
                                            Cancel
                                        </button>
                                        {view && (
                                            <button
                                                type="button"
                                                className="btn btn-outline-success"
                                                onClick={() => {
                                                    setEdit && setEdit(true);
                                                    setView && setView(false);
                                                }}
                                            >
                                                Edit
                                            </button>
                                        )}
                                        <button type="button" onClick={() => savePayment()} className="btn btn-success" disabled={isSaveLoading}>
                                            {!isSaveLoading ? edit ? 'Update' : 'Save' : <IconLoader className="animate-spin inline-block" />}
                                        </button>
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                    {addNewMethodModal && <AddPaymentMethod showModal={addNewMethodModal} setShowModal={setAddNewMethodModal} />}
                </div>
            </Dialog>
        </Transition>
    );
};

export default ViewInvoice;
