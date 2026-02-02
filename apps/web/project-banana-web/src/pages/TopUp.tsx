import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ArrowRight, Loader2 } from 'lucide-react';
import { useAction, useMutation } from 'convex/react';
import { api } from '../../../../../packages/backend/convex/_generated/api';
import Button from '../components/ui/Button';

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
    prefill?: {
        name?: string;
        email?: string;
    };
    theme?: {
        color?: string;
    };
    modal?: {
        ondismiss?: () => void;
    };
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

export default function TopUp() {
    const navigate = useNavigate();
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createOrder = useAction(api.topup.createOrder);
    const verifyAndStorePayment = useMutation(api.topup.verifyAndStorePayment);

    const handleBack = () => {
        navigate('/credits');
    };

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

    const handleProceed = async () => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Load Razorpay script if not already loaded
            const isLoaded = await loadRazorpayScript();
            if (!isLoaded) {
                throw new Error('Failed to load payment gateway');
            }

            // Create order via backend
            const orderData = await createOrder({ amount: numAmount });

            // Initialize Razorpay checkout
            const options: RazorpayOptions = {
                key: orderData.keyId,
                amount: orderData.amount,
                currency: orderData.currency,
                name: 'Project Banana',
                description: `Top up RM${numAmount}`,
                order_id: orderData.orderId,
                handler: async (response: RazorpayResponse) => {
                    try {
                        // Verify and store payment (credits added via webhook)
                        await verifyAndStorePayment({
                            orderId: orderData.orderId,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature,
                        });

                        // Navigate to credits page - credits will be added once webhook is received
                        navigate('/credits', { state: { paymentProcessing: true } });
                    } catch (err) {
                        console.error('Failed to verify payment:', err);
                        setError('Payment verification failed. Please contact support.');
                        setIsLoading(false);
                    }
                },
                prefill: {
                    name: orderData.businessName,
                },
                theme: {
                    color: '#1C1C1C',
                },
                modal: {
                    ondismiss: () => {
                        setIsLoading(false);
                    },
                },
            };

            const razorpay = new window.Razorpay(options);
            razorpay.open();
        } catch (err) {
            console.error('Failed to create order:', err);
            setError(err instanceof Error ? err.message : 'Failed to initiate payment');
            setIsLoading(false);
        }
    };

    return (
        <div className="animate-fadeIn relative pb-24 p-8">
            {/* Header / Navigation */}
            <div className="flex justify-between items-center mb-6">
                <Button
                    variant="ghost"
                    onClick={handleBack}
                    icon={<ChevronLeft className="w-5 h-5" />}
                    className="pl-0 hover:bg-transparent hover:text-gray-600"
                >
                    Back
                </Button>
            </div>

            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
                {/* Left Column: Input & Actions */}
                <div className="space-y-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Top Up Credits</h1>
                        <p className="text-gray-500">Enter the amount you'd like to top up.</p>
                    </div>

                    <div className="space-y-4">
                        <label className="text-lg font-bold text-gray-900 block">Amount (RM)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">RM</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => {
                                    setAmount(e.target.value);
                                    setError(null);
                                }}
                                placeholder="0.00"
                                disabled={isLoading}
                                className="w-full bg-[#F9FAFB] border-none rounded-xl pl-12 pr-4 py-4 outline-none focus:ring-2 focus:ring-gray-200 transition-all text-gray-900 font-bold text-xl placeholder:text-gray-300 disabled:opacity-50"
                            />
                        </div>
                        {error && (
                            <p className="text-red-500 text-sm">{error}</p>
                        )}
                    </div>

                    <div className="space-y-4">
                        <Button
                            variant="primary"
                            className="w-full h-14 rounded-xl text-lg font-bold"
                            onClick={handleProceed}
                            disabled={isLoading || !amount}
                            icon={isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                        >
                            {isLoading ? 'Processing...' : 'Proceed'}
                        </Button>

                        <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 space-y-1 border border-gray-100">
                            <p><span className="font-semibold text-gray-700">Payment Processing Fees:</span></p>
                            <ul className="list-disc list-inside space-y-0.5 ml-1">
                                <li>FPX / eWallet: <span className="font-medium text-gray-700">1.5%</span></li>
                                <li>Credit / Debit Card: <span className="font-medium text-gray-700">2.4%</span></li>
                                <li>Foreign Card: <span className="font-medium text-gray-700">3.3%</span></li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Right Column: Image */}
                <div className="flex justify-center items-start">
                    {/* Placeholder for Graphic/Image - keeping it minimal or using existing assets */}
                    <div className="bg-[#1C1C1C] rounded-3xl p-12 w-full aspect-square flex items-center justify-center shadow-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-black opacity-50"></div>
                        <img src="/banana-icon.png" alt="Banana" className="w-32 h-32 object-contain relative z-10" />
                        <div className="absolute bottom-12 left-12 right-12 text-white/50 text-sm text-center z-10">
                            Secure payments powered by Razorpay
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
}
