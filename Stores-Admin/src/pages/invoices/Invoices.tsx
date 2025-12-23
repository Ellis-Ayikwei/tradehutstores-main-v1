import { faEye, faPen, faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Tippy from '@tippyjs/react';
import dayjs from 'dayjs';
import sortBy from 'lodash/sortBy';
import { useContextMenu } from 'mantine-contextmenu';
import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useEffect, useState } from 'react';
import CurrencyInput from 'react-currency-input-field';
import { downloadExcel } from 'react-export-table-to-excel';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Select, { StylesConfig } from 'react-select';
import useSwr, { mutate } from 'swr';
import 'tippy.js/dist/tippy.css';
import Dropdown from '../../components/Dropdown';
import IconBell from '../../components/Icon/IconBell';
import IconCaretDown from '../../components/Icon/IconCaretDown';
import IconFile from '../../components/Icon/IconFile';
import IconRefresh from '../../components/Icon/IconRefresh';
import IconSend from '../../components/Icon/IconSend';
import IconTrash from '../../components/Icon/IconTrash';
import IconX from '../../components/Icon/IconX';
import axiosInstance from '../../services/axiosInstance';
import confirmDialog from '../../helper/confirmDialog';
import Ghc from '../../helper/CurrencyFormatter';
import fetcher from '../../services/fetcher';
import showMessage from '../../helper/showMessage';
import { IRootState } from '../../store';
import { GetAlumniData } from '../../store/alumnigroupSlice';
import { GetInvoicesData } from '../../store/invoicesSlice';
import { setPageTitle } from '../../store/themeConfigSlice';
import AddPaymentMethod from './invoiceUtils/addPaymentMethod';
import handleBulkInvoiceEmail from './invoiceUtils/bulkInvoiceEmail';
import handleMultiInvoiceCancellation from './invoiceUtils/multiInvoiceCancellation';
import handleMultiPaymentDeletion from './invoiceUtils/multiInvoiceDeletion';
import ViewInvoice from './invoiceUtils/viewInvoicemodal';

const col = ['name', 'start_date', 'end_date', 'insurance_package', 'is_locked', 'id', 'create_at', 'updated_at'];

const Invoices = () => {
    const dispatch = useDispatch();
    const [invoicesData, setInvoicesData] = useState<any>([]);
    const allInvoices = useSelector((state: IRootState) => state.invoices.allInvoices);
    const alumniGroups = useSelector((state: IRootState) => state.alumnidata.alumniGroups);
    const [deleteLoading, setDeletLoadingData] = useState<{ [key: string]: boolean }>({});

    const invoicesAreLoading = useSelector((state: IRootState) => state.invoices.loading);
    const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl' ? true : false;
    const { showContextMenu } = useContextMenu();
    const [addNewMethodModal, setAddNewMethodModal] = useState(false);
    const { data: paymentMethods, error: paymentMethodsError, isLoading: paymentMethodsLoading } = useSwr('/payment_methods', fetcher);
    const [invoiceId, setInvoiceId] = useState<string>('');
    const [edit, setEdit] = useState<boolean>(false);

    useEffect(() => {
        dispatch(GetInvoicesData() as any);
        dispatch(GetAlumniData() as any);
        console.log('all contracts', allInvoices);
    }, [dispatch]);

    useEffect(() => {
        if (allInvoices) {
            setInitialRecords(sortBy(allInvoices, 'created_at').reverse());
        }
    }, [allInvoices]);

    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const navigate = useNavigate();

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState(sortBy(allInvoices, 'created_at'));
    const [recordsData, setRecordsData] = useState<any[]>(initialRecords);
    const rowData = initialRecords;
    const [search, setSearch] = useState('');

    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'name',
        direction: 'asc',
    });

    const [view, setView] = useState(false);

    const totalInvoices = Array.isArray(allInvoices)
        ? allInvoices.reduce((acc, cur) => {
              return acc + cur.amount;
          }, 0)
        : 0;

    const totalPaidInvoices = Array.isArray(allInvoices)
        ? allInvoices.reduce((acc, cur) => {
              return cur.status === 'PAID' ? acc + cur.amount : acc;
          }, 0)
        : 0;

    const [query, setQuery] = useState('');

    useEffect(() => {
        setPage(1);
    }, [pageSize]);

    useEffect(() => {
        const from = (page - 1) * pageSize;
        const to = from + pageSize;
        setRecordsData([...initialRecords.slice(from, to)]);
    }, [page, pageSize, initialRecords]);

    useEffect(() => {
        const filterRecords = (item: any) => {
            const accessors = Object.keys(item) as (keyof typeof item)[];
            return accessors.some((accessor) => {
                const value = item[accessor];
                if (typeof value === 'string') {
                    return value.toLowerCase().includes(search.toLowerCase());
                }
                if (typeof value === 'number') {
                    return value.toString().includes(search.toLowerCase());
                }
                if (value instanceof Date) {
                    return dayjs(value).format('DD MMM YYYY').includes(search.toLowerCase());
                }
                if (accessor === 'insurance_package') {
                    return value.name.toLowerCase().includes(search.toLowerCase());
                }
                return false;
            });
        };

        setRecordsData(() => {
            return Object.values(allInvoices)?.filter(filterRecords);
        });

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    useEffect(() => {
        const data2 = sortBy(initialRecords, sortStatus.columnAccessor);
        setInitialRecords(sortStatus.direction === 'desc' ? data2.reverse() : data2);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sortStatus]);

    useEffect(() => {
        dispatch(setPageTitle('Export Table'));
    });

    // const header = ['Id', 'Firstname', 'Lastname', 'Email', 'Adress', 'Start Date', 'Phone', 'Role', 'id', 'Dob', 'azure_id'];
    const capitalize = (text: any) => {
        return text
            .replace('_', ' ')
            .replace('-', ' ')
            .toLowerCase()
            .split(' ')
            .map((s: any) => s.charAt(0).toUpperCase() + s.substring(1))
            .join(' ');
    };

    const header = Object.keys(recordsData[0] || {})
        .slice(1, -1)
        .map(capitalize);

    const bodyData = recordsData.map((item) => Object.values(item).slice(1, -1));

    function handleDownloadExcel() {
        downloadExcel({
            fileName: 'Alumni Portal User Data',
            sheet: 'User Data',
            tablePayload: { header, body: bodyData as (string | number | boolean)[][] },
        });
    }

    const [showModal, setShowModal] = useState<any>(false);

    const deleteInvoice = async (invoice_id: any) => {
        try {
            const response = await axiosInstance.delete(`/invoices/${invoice_id}`);
            if (response.status === 200) {
                showMessage(`invoice deleted`);
                dispatch(GetInvoicesData() as any);
            }
        } catch (error: any) {
            if (error.response && error.response.data) {
                const parser = new DOMParser();
                const errorData = error.response.data;
                const doc = parser.parseFromString(errorData, 'text/html');
                const errorMess = doc.querySelector('body')?.innerText || 'An error occurred';
                const errorMessage = errorMess.split('\n')[1];
                console.error('Error:', errorMessage);
                showMessage(`${errorMessage}`, 'error');
            }
        }

        showMessage('Invoice has been deleted successfully.');
    };

    const [selectedRecords, setSelectedRecords] = useState<any>([]);
    const [hideCols, setHideCols] = useState<any>(['id', 'updated_at']);

    const showHideColumns = (col: any, value: any) => {
        if (hideCols.includes(col)) {
            setHideCols((col: any) => hideCols.filter((d: any) => d !== col));
        } else {
            setHideCols([...hideCols, col]);
        }
    };

    const cols = [
        { accessor: 'id', title: 'Invoice Id', sortable: true, hidden: hideCols.includes('id') },
        { accessor: 'invoice_number', title: 'Invoice Number', sortable: true, hidden: hideCols.includes('invoice_number') },
        { accessor: 'invoice_type', title: 'Invoice Type', sortable: true, hidden: hideCols.includes('invoice_type') },
        { accessor: 'group.name', title: 'Group', sortable: true, hidden: hideCols.includes('group.name') },
        { accessor: 'group.insurance_package.name', title: 'Insurance Package', sortable: true, hidden: hideCols.includes('group.insurance_package.name') },
        { accessor: 'contract_id', title: 'Contract', sortable: true, hidden: hideCols.includes('contract_id') },
        { accessor: 'billed_user.full_name', title: 'To', sortable: true, hidden: hideCols.includes('billed_user.full_name') },
        {
            accessor: 'total_amount',
            title: 'Total Amount',
            sortable: true,
            hidden: hideCols.includes('total_amount'),
            render: ({ total_amount }) => {
                const _tAm = total_amount as { total_amount: number };
                return Ghc(_tAm);
            },
        },
        {
            accessor: 'total_paid',
            title: 'Total Paid',
            sortable: true,
            hidden: hideCols.includes('total_paid'),
            render: ({ total_paid }) => {
                const _tAp = total_paid as { total_paid: number };
                return Ghc(_tAp);
            },
        },
        { accessor: 'status', title: 'Status', sortable: true, hidden: hideCols.includes('status') },
        {
            accessor: 'issue_date',
            title: 'Issue Date',
            sortable: true,
            hidden: hideCols.includes('issue_date'),
            render: ({ issue_date }) => {
                const _date = issue_date as number | Date;
                return dayjs(issue_date).format('ddd, DD MM, YYYY');
            },
        },
        {
            accessor: 'due_date',
            title: 'Due Date',
            sortable: true,
            hidden: hideCols.includes('due_date'),
            render: ({ due_date }) => {
                const _date = due_date as number | Date;
                return dayjs(due_date).format('ddd, DD MM, YYYY');
            },
        },
        {
            accessor: 'paid_date',
            title: 'Paid Date',
            sortable: true,
            hidden: hideCols.includes('paid_date'),
            render: ({ paid_date }) => {
                if (!paid_date) return null;
                const _date = paid_date as number | Date;
                return dayjs(_date).format('ddd, DD MM, YYYY');
            },
        },
        { accessor: 'description', title: 'Description', sortable: true, hidden: hideCols.includes('description') },
        {
            accessor: '',
            title: 'Actions',
            sortable: true,
            hidden: hideCols.includes('actions'),
            render: (item: any) => {
                function handleEditPayment(item: any): void {
                    setShowModal(true);
                    setInvoiceId(item.id);
                    setEdit(true);
                }
                function handleViewPayment(item: any): void {
                    setShowModal(true);
                    setInvoiceId(item.id);
                    setView(true);
                }
                return (
                    <div className="flex items-center gap-2">
                        <Tippy content="View">
                            <button type="button" className="btn btn-outline-info rounded-full px-2 text-xs" onClick={() => handleViewPayment(item)}>
                                <FontAwesomeIcon icon={faEye} />
                            </button>
                        </Tippy>
                        <Tippy content="Edit">
                            <button type="button" className="btn btn-outline-success rounded-full px-2 text-xs" onClick={() => handleEditPayment(item)}>
                                <FontAwesomeIcon icon={faPen} />
                            </button>
                        </Tippy>
                        <Tippy content="Delete">
                            <button type="button" className="btn btn-outline-danger rounded-full px-2 text-xs" onClick={() => deleteInvoice(item.id)}>
                                <FontAwesomeIcon icon={faTrash} />
                            </button>
                        </Tippy>
                    </div>
                );
            },
        },
    ];
    const handleNavigation = (payload: any) => {
        // You can pass any data here in the state object
        navigate('/profile', { state: payload });
    };

    const OptionStyles: StylesConfig<any, true> = {
        menuList: (provided, state) => ({
            ...provided,
            height: '150px',
            zIndex: 'auto',
        }),
    };

    const handleDeletePm = async (pmId: string) => {
        const confrimed = await confirmDialog({
            title: 'Delete Invoice Method',
            finalQuestion: 'Are you sure you want to delete this Invoice method?',
        });

        if (confrimed) {
            setDeletLoadingData((prvld) => ({ ...prvld, [pmId]: true }));
            try {
                const response = await axiosInstance.delete(`/payment_methods/${pmId}`);
                if (response.status === 200) {
                    showMessage('Invoice method has been deleted successfully.', 'success');
                    setDeletLoadingData((prvld) => ({ ...prvld, [pmId]: false }));
                    mutate('/payment_methods');
                }
            } catch (error) {
                console.error(error);
            } finally {
                setDeletLoadingData((prvld) => ({ ...prvld, [pmId]: false }));
            }
        }
    };

    const handleGetInvoicesOverDue = async () => {
        setRecordsData((prevRecords) => prevRecords.filter((invoice: any) => new Date(invoice.due_date) < new Date() && invoice.status !== 'Paid' && invoice.total_amount !== invoice.total_paid));
    };

    return (
        <div>
            <div className="panel flex items-center overflow-x-auto whitespace-nowrap p-3 text-primary">
                <div className="rounded-full bg-primary p-1.5 text-white ring-2 ring-primary/30 ltr:mr-3 rtl:ml-3">
                    <IconBell />
                </div>
                <span className="ltr:mr-3 rtl:ml-3">Documentation: </span>
                <a href="https://www.npmjs.com/package/mantine-datatable" target="_blank" className="block hover:underline">
                    https://www.npmjs.com/package/mantine-datatable
                </a>
            </div>

            <div className="panel mt-6">
                <div className="flex md:items-center md:flex-row flex-col mb-5 gap-5">
                    <h5 className="font-semibold text-lg dark:text-white-light">Invoices</h5>
                </div>
                <div>
                    <div className="grid sm:grid-cols-1 xl:grid-cols-3 md:grid-cols-2 gap-6 mb-6 justify-between w-full">
                        <div className="grid md:grid-cols-2 sm:grid-cols-1 md:col-span-2 gap-3">
                            <div className="panel bg-gradient-to-r from-cyan-500 to-cyan-400">
                                <div className="mb-5">
                                    <span className="bg-[#1b2e4b] text-cyan-300 text-sm rounded-full px-4 py-1.5 before:bg-cyan-500 before:w-1.5 before:h-1.5 before:rounded-full ltr:before:mr-2 rtl:before:ml-2 before:inline-block">
                                        Total Paid
                                    </span>
                                </div>
                                <div className="flex items-center mt-5">
                                    <div className="text-xl sm:text-sm md:text-xl lg:text-2xl xl:text-3xl font-bold ltr:mr-3 rtl:ml-3 flex items-center gap-2">{Ghc(totalPaidInvoices)}</div>
                                </div>
                                <div className="flex items-center font-semibold mt-5">for 5 groups</div>
                            </div>
                            <div className="panel bg-gradient-to-r from-amber-400 to-amber-500">
                                <div className="mb-5">
                                    <span className="bg-[#1b2e4b] text-amber-300 sm:text-xs rounded-full px-4 py-1.5 before:bg-amber-600 before:w-1.5 before:h-1.5 before:rounded-full ltr:before:mr-2 rtl:before:ml-2 before:inline-block">
                                        Total Payments
                                    </span>
                                </div>
                                <div className="flex items-center mt-5">
                                    <div className="text-xl sm:text-sm md:text-xl lg:text-2xl xl:text-3xl font-bold ltr:mr-3 rtl:ml-3 flex items-center gap-2">{Ghc(totalInvoices)}</div>
                                </div>
                                <div className="flex items-center font-semibold mt-5">for 5 groups</div>
                            </div>
                        </div>

                        <div className="panel  p-0 border-0  justify-end items-end xl:col-span-1 sm:col-span-2">
                            <div className="p-5">
                                <div className="mb-5">
                                    <span className="bg-[#1b2e4b] text-white text-xs rounded-full px-4 py-1.5 before:bg-white before:w-1.5 before:h-1.5 before:rounded-full ltr:before:mr-2 rtl:before:ml-2 before:inline-block">
                                        Request Invoice
                                    </span>
                                </div>
                                <div className="mb-5 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[#515365] font-semibold">Group</p>

                                        <div className="form-control w-[200px]">
                                            <Select
                                                id="status"
                                                options={Array.isArray(alumniGroups) ? alumniGroups.map((alumni: any) => ({ value: alumni.id, label: alumni.name })) : []}
                                                // value={{ value: params?.status, label: params?.status }}
                                                // onChange={(selected: any) => setParams((prev) => ({ ...prev, status: selected.value }))}
                                                // isSearchable={true}
                                                // required
                                                hideSelectedOptions={true}
                                                styles={OptionStyles}
                                                className="form-control"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-[#515365] font-semibold">Amount</p>
                                        <p className="text-base">
                                            <span>
                                                {' '}
                                                <div className="flex">
                                                    <CurrencyInput
                                                        id="sumAssured"
                                                        name="sumAssured"
                                                        prefix="GH₵ "
                                                        defaultValue={0}
                                                        decimalsLimit={2}
                                                        onValueChange={(value) => handleInputChange('sum_assured', value)}
                                                        className="form-input"
                                                    />
                                                </div>
                                            </span>
                                        </p>
                                    </div>
                                </div>
                                <div className="text-center px-2 flex justify-around">
                                    <button type="button" className="btn btn-success">
                                        Ask for Invoice
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex md:items-center md:flex-row flex-col mb-5 gap-5">
                    <div className="flex items-center flex-nowrap">
                        <button type="button" className="btn btn-primary btn-sm m-1 bg-[#4a8dff] hover:bg-[#3883e6]" onClick={handleDownloadExcel}>
                            <IconFile className="w-5 h-5 ltr:mr-2 rtl:ml-2 text-white" />
                            EXCEL
                        </button>
                    </div>
                    <div className="dropdown">
                        <Dropdown
                            placement={`${isRtl ? 'bottom-end' : 'bottom-start'}`}
                            btnClassName="!flex items-center border font-semibold border-white-light dark:border-[#253b5c] rounded-md px-4 py-2 text-sm dark:bg-[#1b2e4b] dark:text-white-dark"
                            button={
                                <>
                                    <span className="ltr:mr-1 rtl:ml-1">Columns</span>
                                    <IconCaretDown className="w-5 h-5" />
                                </>
                            }
                        >
                            <ul className="!min-w-[140px]">
                                {cols.map((col, i) => {
                                    return (
                                        <li
                                            key={i}
                                            className="flex flex-col"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                            }}
                                        >
                                            <div className="flex items-center px-4 py-1">
                                                <label className="cursor-pointer mb-0">
                                                    <input
                                                        type="checkbox"
                                                        checked={!hideCols.includes(col.accessor)}
                                                        className="form-checkbox"
                                                        defaultValue={col.accessor}
                                                        onChange={(event: any) => {
                                                            setHideCols(event.target.value);
                                                            showHideColumns(col.accessor, event.target.checked);
                                                        }}
                                                    />
                                                    <span className="ltr:ml-2 rtl:mr-2">{col.title}</span>
                                                </label>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </Dropdown>
                    </div>

                    <div>
                        <Tippy content="refresh">
                            <button type="button" className="btn btn-dark w-8 h-8 p-0 rounded-full" onClick={() => dispatch(GetInvoicesData() as any)}>
                                <IconRefresh className="w-5 h-5" />
                            </button>
                        </Tippy>
                    </div>
                    <div>
                        <Tippy content="Invoices overdue">
                            <button type="button" className="btn btn-outline-danger rounded-full p-1 px-2" onClick={() => handleGetInvoicesOverDue()}>
                                overdue
                            </button>
                        </Tippy>
                    </div>
                    <div className={` gap-1 disabled:opacity-50 disabled:cursor-not-allowed disabled ${selectedRecords.length > 0 ? '!flex' : 'hidden'}`}>
                        <div>
                            <Tippy content="Delete">
                                <button
                                    type="button"
                                    className="btn bg-red-500 hover:bg-red-600 w-8 h-8 p-0 rounded-xl shadow-md"
                                    onClick={() => handleMultiPaymentDeletion(selectedRecords, dispatch, setSelectedRecords)}
                                >
                                    <IconTrash className="w-5 h-5 text-white" />
                                </button>
                            </Tippy>
                        </div>
                        <div>
                            <Tippy content="Send Invoices">
                                <button
                                    type="button"
                                    onClick={() => handleBulkInvoiceEmail(selectedRecords, dispatch)}
                                    className="btn bg-green-500 hover:bg-green-600 h-8 w-8 px-1 rounded-xl shadow-md"
                                >
                                    <IconSend className="w-5 h-5 text-white" />
                                </button>
                            </Tippy>
                        </div>
                        <div>
                            <Tippy content="Set status as failed">
                                <button
                                    type="button"
                                    onClick={() => handleMultiInvoiceCancellation(selectedRecords, dispatch)}
                                    className="btn bg-red-900 hover:bg-green-600 h-8 w-8 px-1 rounded-xl shadow-md"
                                >
                                    <IconX className="w-5 h-5 text-white" />
                                </button>
                            </Tippy>
                        </div>
                    </div>

                    <div className="flex ltr:ml-auto rtl:mr-auto gap-1">
                        <div className="relative">
                            <input type="text" className="form-input w-auto pl-2 pr-12" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
                            <button type="button" className="absolute inset-y-0 right-0 flex items-center px-2" onClick={() => setSearch('')}>
                                <IconX className="w-5 h-5 text-gray-500 hover:text-gray-900" />
                            </button>
                        </div>
                        <Tippy content="Add A New Invoice">
                            <button
                                type="button"
                                className="btn btn-success "
                                onClick={() => {
                                    setShowModal(true);
                                }}
                            >
                                Create New Invoice
                            </button>
                        </Tippy>
                    </div>
                </div>

                <div className="datatables">
                    <DataTable
                        className="whitespace-nowrap table-hover"
                        records={recordsData}
                        columns={cols}
                        totalRecords={initialRecords.length}
                        recordsPerPage={pageSize}
                        page={page}
                        onPageChange={(p) => setPage(p)}
                        recordsPerPageOptions={PAGE_SIZES}
                        onRecordsPerPageChange={setPageSize}
                        sortStatus={sortStatus}
                        onSortStatusChange={setSortStatus}
                        selectedRecords={selectedRecords}
                        onSelectedRecordsChange={setSelectedRecords}
                        striped={true}
                        minHeight={200}
                        paginationText={({ from, to, totalRecords }) => `Showing  ${from} to ${to} of ${totalRecords} entries`}
                    />
                </div>
            </div>

            {showModal && (
                <ViewInvoice showModal={showModal} setShowModal={setShowModal} edit={edit} setEdit={setEdit} view={view} setView={setView} invoiceId={invoiceId} setInvoiceId={setInvoiceId} />
            )}
            {addNewMethodModal && <AddPaymentMethod showModal={addNewMethodModal} setShowModal={setAddNewMethodModal} />}
        </div>
    );
};

export default Invoices;
