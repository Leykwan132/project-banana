import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Megaphone, CheckSquare, Settings, CreditCard, LogOut, Zap, Loader2, Landmark, Building2 } from 'lucide-react';
import { authClient } from '../lib/auth-client';
import { useQuery } from 'convex/react';
import { api } from '../../../../../packages/backend/convex/_generated/api';
import iconDark from '../assets/icon-dark.svg';

const navigation = [
    { name: 'Overview', href: '/overview', icon: LayoutDashboard },
    { name: 'Campaigns', href: '/campaigns', icon: Megaphone },
    { name: 'Approvals', href: '/approvals', icon: CheckSquare },
];

const account = [
    { name: 'Credits', href: '/credits', icon: CreditCard },
    { name: 'Withdrawals', href: '/withdrawals', icon: Landmark },
    { name: 'Bank Accounts', href: '/bank-accounts', icon: Building2 },
    { name: 'Subscription', href: '/subscription', icon: Zap },
    { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
    const navigate = useNavigate();
    const business = useQuery(api.businesses.getMyBusiness);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const credits = business?.credit_balance ?? 0;
    const isCreditsLoading = business === undefined;

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await authClient.signOut({
                fetchOptions: {
                    onSuccess: () => {
                        navigate("/", { replace: true });
                    },
                },
            });
        } finally {
            setIsLoggingOut(false);
        }
    };

    return (
        <div className="flex h-screen w-64 flex-col border-r border-[#F4F6F8] bg-white">
            <div className="flex h-16 items-center px-6">
                <div className="flex items-center gap-2 font-semibold">
                    <img src={iconDark} alt="Banana" className="w-6 h-6 object-contain" />
                    <span className="text-gray-900 tracking-tight">Lumina</span>
                </div>
            </div>

            <div className="flex-1 flex flex-col gap-6 px-4 py-6 overflow-y-auto">
                <div>
                    <div className="px-2 mb-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                        General
                    </div>
                    <nav className="space-y-1">
                        {navigation.map((item) => (
                            <NavLink
                                key={item.name}
                                to={item.href}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${isActive
                                        ? 'bg-gray-100 text-gray-900'
                                        : 'text-gray-500 hover:text-gray-900'
                                    }`
                                }
                            >
                                <item.icon className="h-4 w-4" />
                                {item.name}
                                {item.name === 'Approvals' && business?.pending_approvals ? (
                                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                        {business.pending_approvals}
                                    </span>
                                ) : null}
                            </NavLink>
                        ))}
                    </nav>
                </div>

                <div>
                    <div className="px-2 mb-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Account
                    </div>
                    <nav className="space-y-1">
                        {account.map((item) => (
                            <NavLink
                                key={item.name}
                                to={item.href}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${isActive
                                        ? 'bg-gray-100 text-gray-900'
                                        : 'text-gray-500 hover:text-gray-900'
                                    }`
                                }
                            >
                                <item.icon className="h-4 w-4" />
                                {item.name}
                            </NavLink>
                        ))}
                    </nav>
                </div>
            </div>

            <div className="border-t border-[#F4F6F8] p-4">
                <button
                    type="button"
                    onClick={() => navigate('/credits')}
                    className="mb-3 flex w-full rounded-2xl border border-[#F4F6F8] bg-[#F9FAFB] px-4 py-3 text-left transition-colors hover:border-gray-200 hover:bg-white"
                >
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                            Credit Balance
                        </p>
                        <p className="mt-1 text-lg font-semibold text-gray-900">
                            {isCreditsLoading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                `RM ${credits.toLocaleString()}`
                            )}
                        </p>
                    </div>
                </button>
                <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoggingOut ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <LogOut className="h-4 w-4" />
                    )}
                    <span>{isLoggingOut ? 'Logging out...' : 'Log out'}</span>
                </button>
            </div>
        </div>
    );
}
