import { useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, RotateCw, Trash2 } from 'lucide-react';
import { useQuery, useAction, useMutation } from 'convex/react';
import { api } from '../../../../../packages/backend/convex/_generated/api';
import Button from '../components/ui/Button';
import { useState } from 'react';
import { addToast } from "@heroui/toast";

// Razorpay types
declare global {
    interface Window {
        Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
    }
}

interface RazorpayOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    order_id: string;
    handler: (response: RazorpayResponse) => void;
    prefill?: { name?: string; email?: string };
    theme?: { color?: string };
    modal?: { ondismiss?: () => void };
}

interface RazorpayResponse {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
}

interface RazorpayInstance {
    open: () => void;
    close: () => void;
}

export default function Credits() {
    const navigate = useNavigate();
    const business = useQuery(api.businesses.getMyBusiness);
    const topUpHistory = useQuery(api.topup.getTopUpHistory, {
        paginationOpts: { numItems: 10, cursor: null },
    });
    const getResumeOrderDetails = useAction(api.topup.getResumeOrderDetails);
    const deleteTopupOrder = useMutation(api.topup.deleteTopupOrder);

    const [resumingOrderId, setResumingOrderId] = useState<string | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; orderId: string | null; isLoading: boolean }>({
        isOpen: false,
        orderId: null,
        isLoading: false,
    });

    const credits = business?.credit_balance ?? 0;
    const isLoading = business === undefined || topUpHistory === undefined;

    // Show processing banner logic removed as banner is removed

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'paid':
                return 'text-green-600';
            case 'failed':
            case 'signature_failed':
                return 'text-red-600';
            case 'pending_webhook':
                return 'text-blue-600';
            default:
                return 'text-yellow-600';
        }
    };

    const formatStatus = (status: string) => {
        switch (status) {
            case 'paid':
                return 'Completed';
            case 'created':
                return 'Pending';
            case 'pending_webhook':
                return 'Processing';
            case 'signature_failed':
                return 'Failed';
            default:
                return status.charAt(0).toUpperCase() + status.slice(1);
        }
    };

    // Load Razorpay script
    const loadRazorpayScript = (): Promise<boolean> => {
        return new Promise((resolve) => {
            if (window.Razorpay) {
                resolve(true);
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    // Resume payment for pending order
    const handleResumePayment = async (orderId: string, _amount: number) => {
        setResumingOrderId(orderId);
        try {
            const isLoaded = await loadRazorpayScript();
            if (!isLoaded) throw new Error('Failed to load payment gateway');

            // Get existing order details to resume payment
            const orderData = await getResumeOrderDetails({ orderId });

            const options: RazorpayOptions = {
                key: orderData.keyId,
                amount: orderData.amount,
                currency: orderData.currency,
                name: 'Project Banana',
                description: `Resume top up`,
                order_id: orderData.orderId,
                handler: () => {
                    setResumingOrderId(null);
                },
                theme: { color: '#1C1C1C' },
                modal: { ondismiss: () => setResumingOrderId(null) },
            };

            const razorpay = new window.Razorpay(options);
            razorpay.open();
        } catch (err) {
            console.error('Failed to resume payment:', err);
            setResumingOrderId(null);
        }
    };

    // Handle delete action
    const handleDeleteClick = (orderId: string) => {
        setDeleteConfirmation({ isOpen: true, orderId, isLoading: false });
    };

    const handleConfirmDelete = async () => {
        if (!deleteConfirmation.orderId) return;

        setDeleteConfirmation(prev => ({ ...prev, isLoading: true }));
        try {
            await deleteTopupOrder({ orderId: deleteConfirmation.orderId as any });
            setDeleteConfirmation({ isOpen: false, orderId: null, isLoading: false });
            addToast({
                title: "Top-up attempt deleted successfully",
                color: "success",
            });
        } catch (err) {
            console.error("Failed to delete order:", err);
            setDeleteConfirmation(prev => ({ ...prev, isLoading: false }));
            addToast({
                title: "Failed to delete top-up attempt",
                color: "danger",
            });
        }
    };

    return (
        <div className="p-8 font-sans text-gray-900 animate-fadeIn">
            <h1 className="text-2xl font-bold mb-6">Credits</h1>

            {/* Processing Banner */}


            <div className="flex flex-col gap-8">
                {/* Top Section: Balance & Actions */}
                <div className="w-full max-w-lg">
                    <div className="bg-[#1C1C1C] text-white p-8 rounded-xl flex flex-col justify-between min-h-[300px] shadow-xl shadow-black/10 relative">
                        {/* Icon */}
                        <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center">
                            <img src="/banana-icon.png" alt="Banana" className="w-12 h-12 object-contain" />
                        </div>

                        {/* Bottom Section */}
                        <div className="flex items-end justify-between mt-8">
                            <div>
                                <div className="text-gray-400 font-medium mb-2">Available Credits</div>
                                <div className="text-4xl font-bold">
                                    {isLoading ? (
                                        <Loader2 className="w-8 h-8 animate-spin" />
                                    ) : (
                                        `Rm ${credits.toLocaleString()}`
                                    )}
                                </div>
                            </div>
                            <Button
                                variant='outline'
                                className="rounded-full px-6"
                                icon={<ArrowRight className="w-4 h-4" />}
                                onClick={() => navigate('/credits/topup')}
                            >
                                Top Up
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Past Topups Section */}
                <div className="bg-white overflow-hidden">
                    <h3 className="font-bold text-lg mb-4 text-gray-900">Past Topups</h3>
                    <div className="bg-[#F4F6F8] w-[70%] rounded-lg mt-2 grid grid-cols-5 gap-4 p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider select-none">
                        <div className="col-span-1 pl-2">Order Id</div>
                        <div className="col-span-1 flex items-center justify-center">Date</div>
                        <div className="col-span-1 flex items-center justify-center">Amount</div>
                        <div className="col-span-1 flex items-center justify-center">Status</div>
                        <div className="col-span-1 flex items-center justify-center">Action</div>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-12 w-[70%]">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        </div>
                    ) : topUpHistory?.page.length === 0 ? (
                        <div className="py-12 text-center text-gray-500 w-[70%]">
                            No top-up history yet
                        </div>
                    ) : (
                        <div className="divide-y divide-[#F4F6F8]">
                            {topUpHistory?.page.map((item: typeof topUpHistory.page[number]) => (
                                <div
                                    key={item._id}
                                    className="grid grid-cols-5 p-6 items-center hover:bg-gray-50 transition-colors w-[70%]"
                                >
                                    <div className="col-span-1 font-medium text-gray-900 truncate" title={item.order_id}>
                                        {item.order_id.substring(0, 16)}...
                                    </div>
                                    <div className="col-span-1 text-gray-500 font-medium flex items-center justify-center">
                                        {formatDate(item.created_at)}
                                    </div>
                                    <div className="col-span-1 text-gray-900 font-medium flex items-center justify-center">
                                        Rm {item.amount.toLocaleString()}
                                    </div>
                                    <div className={`col-span-1 flex items-center justify-center font-medium ${getStatusStyle(item.status)}`}>
                                        {formatStatus(item.status)}
                                    </div>
                                    <div className="col-span-1 flex items-center justify-center">
                                        {item.status === 'created' && (
                                            <Button
                                                variant="ghost"
                                                className="text-sm px-3 py-1"
                                                onClick={() => handleResumePayment(item.order_id, item.amount)}
                                                disabled={resumingOrderId === item.order_id}
                                                icon={resumingOrderId === item.order_id ?
                                                    <Loader2 className="w-4 h-4 animate-spin" /> :
                                                    <RotateCw className="w-4 h-4" />
                                                }
                                            >
                                                Resume
                                            </Button>
                                        )}
                                        {['created', 'failed', 'signature_failed'].includes(item.status) && (
                                            <Button
                                                variant="ghost"
                                                className="text-sm px-2 py-1 text-red-500 hover:text-red-600 hover:bg-red-50 ml-2"
                                                onClick={() => handleDeleteClick(item._id)}
                                                icon={<Trash2 className="w-4 h-4" />}
                                            />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {/* Confirmation Modal */}
            {deleteConfirmation.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl relative overflow-hidden p-6 animate-scaleIn">
                        <div className="text-center mb-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-1">Delete Attempt?</h2>
                            <p className="text-sm text-gray-500">
                                This action cannot be undone.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                variant="ghost"
                                className="w-full justify-center"
                                onClick={() => setDeleteConfirmation({ isOpen: false, orderId: null, isLoading: false })}
                                disabled={deleteConfirmation.isLoading}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                className="w-full justify-center bg-red-600 hover:bg-red-700 border-transparent shadow-lg shadow-red-500/20"
                                onClick={handleConfirmDelete}
                                isLoading={deleteConfirmation.isLoading}
                            >
                                Delete
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.2s ease-out forwards;
                }
                .animate-scaleIn {
                    animation: scaleIn 0.2s ease-out forwards;
                }
            `}</style>
        </div>
    );
}
