import { ArrowRight } from 'lucide-react';
import Button from '../components/ui/Button';

export default function Credits() {
    const credits = 2500;

    return (
        <div className="p-8 font-sans text-gray-900 animate-fadeIn">
            <h1 className="text-2xl font-bold mb-6">Credits</h1>

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
                                <div className="text-4xl font-bold">Rm {credits.toLocaleString()}</div>
                            </div>
                            <Button
                                variant='outline'
                                className="rounded-full px-6"
                                icon={<ArrowRight className="w-4 h-4" />}
                            >
                                Top Up
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Past Topups Section */}
                <div className="bg-white overflow-hidden">
                    <h3 className="font-bold text-lg mb-4 text-gray-900">Past Topups</h3>
                    <div className="bg-[#F4F6F8] w-[60%] rounded-lg mt-2 grid grid-cols-4 gap-4 p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider select-none">
                        <div className="col-span-1 pl-2 ">Transaction Id</div>
                        <div className="col-span-1 flex items-center justify-center">Date</div>
                        <div className="col-span-1 flex items-center justify-center">Amount</div>
                        <div className="col-span-1 flex items-center justify-center">Status</div>
                    </div>

                    <div className="divide-y divide-[#F4F6F8]">
                        {[
                            { id: 'TXN-1234567890', date: 'Oct 24, 2025', amount: 'Rm 2,500', status: 'Completed' },
                            { id: 'TXN-0987654321', date: 'Sep 12, 2025', amount: 'Rm 1,000', status: 'Completed' },
                            { id: 'TXN-1122334455', date: 'Aug 05, 2025', amount: 'Rm 500', status: 'Failed' },
                        ].map((item) => (
                            <div
                                key={item.id}
                                className="grid grid-cols-4 p-6 items-center hover:bg-gray-50 transition-colors w-[60%]"
                            >
                                <div className="col-span-1 font-medium text-gray-900 ">{item.id}</div>
                                <div className="col-span-1 text-gray-500 font-medium flex items-center justify-center">{item.date}</div>
                                <div className="col-span-1 text-gray-900 font-medium flex items-center justify-center">{item.amount}</div>
                                <div className="col-span-1 flex items-center justify-center">
                                    {item.status}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.2s ease-out forwards;
                }
            `}</style>
        </div>
    );
}
