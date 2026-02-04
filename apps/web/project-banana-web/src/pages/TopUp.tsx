import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ArrowRight, Loader2 } from 'lucide-react';
import { useAction } from 'convex/react';
import { api } from '../../../../../packages/backend/convex/_generated/api';
import Button from '../components/ui/Button';
import { addToast } from "@heroui/toast";

export default function TopUp() {
    const navigate = useNavigate();
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createBillplzCheckout = useAction(api.topup.createBillplzBill);

    const handleBack = () => {
        navigate('/credits');
    };

    const handleProceed = async () => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount < 100) {
            setError('Minimum top up amount is RM 100');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Create Billplz Checkout
            const { billUrl } = await createBillplzCheckout({ amount: numAmount });

            if (billUrl) {
                window.location.href = billUrl;
            } else {
                throw new Error("No checkout URL returned");
            }
        } catch (err) {
            console.error('Failed to create checkout session:', err);
            setError(err instanceof Error ? err.message : 'Failed to initiate payment');
            setIsLoading(false);
            addToast({
                title: 'Error',
                description: 'Failed to initiate top up',
                color: 'danger',
            });
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
                        <p className="text-gray-500">Enter the amount you'd like to top up (Min. RM 100).</p>
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
                                placeholder="100.00"
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
                            className="w-full h-14 rounded-xl"
                            onClick={handleProceed}
                            disabled={isLoading || !amount}
                            icon={isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                        >
                            {isLoading ? 'Processing...' : 'Proceed to Payment'}
                        </Button>

                        <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 space-y-1 border border-gray-100">
                            <ul className="list-disc list-inside space-y-0.5 ml-1">
                                <li>Credits are <span className="font-medium text-gray-700">non-refundable</span></li>
                                <li>Youniq will absorb <span className="font-medium text-gray-700">all payment processing fees</span>.</li>
                                <li>Youniq will handle <span className="font-medium text-gray-700">all payout</span> to the users.</li>
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
                            Secure payments powered by Billplz
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
