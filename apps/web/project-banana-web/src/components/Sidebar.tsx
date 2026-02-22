import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Megaphone, CheckSquare, Settings, CreditCard, LogOut, Zap } from 'lucide-react';
import { useAuth } from '@workos-inc/authkit-react';
import { useQuery } from 'convex/react';
import { api } from '../../../../../packages/backend/convex/_generated/api';

const navigation = [
    { name: 'Overview', href: '/overview', icon: LayoutDashboard },
    { name: 'Campaigns', href: '/campaigns', icon: Megaphone },
    { name: 'Approvals', href: '/approvals', icon: CheckSquare },
];

const account = [
    { name: 'Credits', href: '/credits', icon: CreditCard },
    { name: 'Subscription', href: '/subscription', icon: Zap },
    { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
    const { signOut } = useAuth();
    const navigate = useNavigate();
    const business = useQuery(api.businesses.getMyBusiness);
    const handleLogout = async () => {
        try {
            await signOut();
        } finally {
            navigate('/', { replace: true });
        }
    };

    return (
        <div className="flex h-screen w-64 flex-col border-r border-[#F4F6F8] bg-white">
            <div className="flex h-16 items-center px-6">
                <div className="flex items-center gap-1 font-semibold">
                    <img src="/banana-icon.png" alt="Banana" className="w-10 h-10 object-contain" />
                    <span className="text-gray-900 tracking-tight">Youniq</span>
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
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                >
                    <LogOut className="h-4 w-4" />
                    <span>Log out</span>
                </button>
            </div>
        </div>
    );
}
