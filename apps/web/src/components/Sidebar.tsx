import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Avatar, Dropdown, Label } from '@heroui/react';
import {
    ArrowLeftRight,
    Building2,
    CheckSquare,
    ChevronRight,
    CreditCard,
    Crown,
    ExternalLink,
    Landmark,
    LayoutDashboard,
    Loader2,
    LogOut,
    Megaphone,
    PanelLeftClose,
    PanelLeftOpen,
    Settings,
} from 'lucide-react';
import { authClient } from '../lib/auth-client';
import { useWorkspaces } from '../hooks/useWorkspaces';
import { switchWorkspacePath } from '../lib/workspace';
import { useQuery } from 'convex/react';
import { api } from '../../../../packages/backend/convex/_generated/api';
import iconDark from '../assets/icon-dark.svg';
import { PLAN_TYPE_LABELS } from '../lib/constants';
import { businessAccountActions, businessFundsNavigation, businessSubscriptionActions } from '../lib/business-sidebar-navigation';

const navigation = [
    { name: 'Overview', href: '/overview', icon: LayoutDashboard },
    { name: 'Campaigns', href: '/campaigns', icon: Megaphone },
    { name: 'Approvals', href: '/approvals', icon: CheckSquare },
];

const fundsIcons = {
    Credits: CreditCard,
    Withdrawals: Landmark,
    'Bank Accounts': Building2,
};

const accountIcons = { Settings };

const getPlanDisplay = (planType?: string) => {
    switch (planType?.toLowerCase()) {
        case 'starter': return { name: PLAN_TYPE_LABELS.starter, limit: 1 };
        case 'growth': return { name: PLAN_TYPE_LABELS.growth, limit: 5 };
        case 'unlimited': return { name: PLAN_TYPE_LABELS.unlimited, limit: 'Unlimited' };
        case 'payasyougo':
        default: return { name: PLAN_TYPE_LABELS.payasyougo, limit: 1 };
    }
};

type SidebarProps = {
    collapsed: boolean;
    onToggleCollapsed: () => void;
};

export function Sidebar({ collapsed, onToggleCollapsed }: SidebarProps) {
    const navigate = useNavigate();
    const { session, membership } = useWorkspaces();
    const business = useQuery(api.businesses.getMyBusiness);
    const activeCampaignCount = useQuery(api.campaigns.getActiveCampaignCount, business?._id ? { businessId: business._id } : 'skip');
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [signOutError, setSignOutError] = useState('');
    const credits = business?.credit_balance ?? 0;
    const isCreditsLoading = business === undefined;
    const plan = getPlanDisplay(business?.subscription_plan_type);
    const campaignLimit = plan.limit;
    const campaignProgress = typeof campaignLimit === 'number'
        ? Math.min(100, ((activeCampaignCount ?? 0) / campaignLimit) * 100)
        : 100;
    const displayName = session?.user.name?.trim() || 'Business account';
    const avatarInitials = displayName.split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase();

    const handleLogout = async () => {
        setIsLoggingOut(true);
        setSignOutError('');
        try {
            const result = await authClient.signOut();
            if (result.error) throw new Error(result.error.message ?? 'Unable to sign out.');
            navigate('/business', { replace: true });
        } catch {
            setSignOutError('Unable to sign out. Please try again.');
            setIsLoggingOut(false);
        }
    };

    const renderLink = ({ name, href, icon: Icon }: { name: string; href: string; icon: typeof LayoutDashboard }) => (
        <NavLink
            key={name}
            to={href}
            title={collapsed ? name : undefined}
            aria-label={collapsed ? name : undefined}
            className={({ isActive }) => `flex items-center rounded-xl py-2.5 text-sm font-medium transition-colors ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'} ${isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
        >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="min-w-0 flex-1 truncate">{name}</span>}
            {!collapsed && name === 'Approvals' && business?.pending_approvals ? (
                <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">{business.pending_approvals}</span>
            ) : null}
        </NavLink>
    );

    return (
        <div className={`flex h-screen flex-col border-r border-[#F4F6F8] bg-white ${collapsed ? 'w-20' : 'w-64'}`}>
            <div className={`flex h-20 shrink-0 items-center border-b border-[#F4F6F8] ${collapsed ? 'justify-center px-1' : 'gap-3 px-4'}`}>
                <div className={`relative flex items-center ${collapsed ? 'group/collapsed-logo' : 'min-w-0 flex-1'}`}>
                    <NavLink to="/overview" aria-label="Lumina Business home" className="flex min-w-0 items-center gap-3">
                        <img src={iconDark} alt="" className={`h-8 w-8 shrink-0 object-contain transition-opacity ${collapsed ? 'group-hover/collapsed-logo:opacity-0 group-focus-within/collapsed-logo:opacity-0' : ''}`} />
                        {!collapsed && <div className="min-w-0"><span className="text-xl font-semibold tracking-tight text-gray-900">Lumina</span><p className="text-xs text-gray-400">Business</p></div>}
                    </NavLink>
                    <button
                        type="button"
                        onClick={onToggleCollapsed}
                        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        aria-expanded={!collapsed}
                        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        className={`rounded-lg text-gray-500 transition-opacity hover:bg-gray-100 ${collapsed ? 'absolute inset-0 z-10 grid place-items-center p-1 opacity-0 pointer-events-none group-hover/collapsed-logo:opacity-100 group-hover/collapsed-logo:pointer-events-auto group-focus-within/collapsed-logo:opacity-100 group-focus-within/collapsed-logo:pointer-events-auto [@media(hover:none)]:left-10 [@media(hover:none)]:right-auto [@media(hover:none)]:top-1/2 [@media(hover:none)]:bottom-auto [@media(hover:none)]:h-10 [@media(hover:none)]:w-10 [@media(hover:none)]:-translate-y-1/2 [@media(hover:none)]:opacity-100 [@media(hover:none)]:pointer-events-auto' : 'ml-auto p-2'}`}
                    >
                        {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                    </button>
                </div>
            </div>

            <div className={`flex flex-1 flex-col gap-6 overflow-y-auto py-6 ${collapsed ? 'px-3' : 'px-4'}`}>
                <section>
                    {!collapsed && <h2 className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-gray-400">General</h2>}
                    <nav aria-label="Business general navigation" className="space-y-1">
                        {navigation.map((item) => renderLink(item))}
                    </nav>
                </section>

                <section>
                    {!collapsed && <h2 className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-gray-400">Funds</h2>}
                    <nav aria-label="Business funds navigation" className="space-y-1">
                        {businessFundsNavigation.map((item) => renderLink({ ...item, icon: fundsIcons[item.name] }))}
                    </nav>
                </section>
            </div>

            <div className={`space-y-2 border-t border-[#F4F6F8] py-4 ${collapsed ? 'px-3' : 'px-4'}`}>
                <Dropdown>
                    <Dropdown.Trigger>
                        <button aria-label={`${displayName} account menu`} className={`flex w-full items-center rounded-xl py-2 text-left transition-colors hover:bg-gray-50 ${collapsed ? 'justify-center' : 'gap-3 px-2'}`}>
                            <Avatar className="h-9 w-9 shrink-0 rounded-full bg-amber-100 text-amber-800">
                                <Avatar.Image src={session?.user.image ?? undefined} alt={displayName} />
                                <Avatar.Fallback>{avatarInitials}</Avatar.Fallback>
                            </Avatar>
                            {!collapsed && <span className="min-w-0 flex-1 text-left">
                                <span className="block truncate text-sm font-medium text-gray-900">{displayName}</span>
                                {business !== undefined && <span className="block truncate text-xs text-gray-400">{plan.name}</span>}
                            </span>}
                        </button>
                    </Dropdown.Trigger>
                    <Dropdown.Popover placement={collapsed ? 'right top' : 'top start'}>
                        <div className="w-72 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
                            <div className="border-t border-gray-100 p-2">
                                <Dropdown.Menu aria-label="Business account actions" disabledKeys={isLoggingOut ? ['sign-out'] : []}>
                                    <Dropdown.SubmenuTrigger>
                                        <Dropdown.Item id="subscription" textValue="Subscription">
                                            <Crown size={18} />
                                            <Label>Subscription</Label>
                                            <Dropdown.SubmenuIndicator><ChevronRight size={16} /></Dropdown.SubmenuIndicator>
                                        </Dropdown.Item>
                                        <Dropdown.Popover placement="right top">
                                            <Dropdown.Menu aria-label="Subscription details">
                                                <Dropdown.Item id="current-plan" isDisabled className="!cursor-default !opacity-100" textValue={business === undefined ? 'Loading plan' : plan.name}>
                                                    <div className="w-56 py-1 text-sm font-normal text-gray-600">
                                                        {business === undefined ? 'Loading…' : plan.name}
                                                    </div>
                                                </Dropdown.Item>
                                                <Dropdown.Item id="active-campaigns" isDisabled className="!cursor-default !opacity-100" textValue={`Active campaigns: ${activeCampaignCount ?? 0} of ${campaignLimit}`}>
                                                    <div className="w-56 space-y-2 py-1">
                                                        <div className="flex items-center justify-between gap-2 text-xs">
                                                            <span className="text-gray-500">Active campaigns</span>
                                                            <span className="font-semibold text-gray-900">{activeCampaignCount ?? 0} / {campaignLimit}</span>
                                                        </div>
                                                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                                                            <div className={`h-full rounded-full ${typeof campaignLimit === 'number' && (activeCampaignCount ?? 0) >= campaignLimit ? 'bg-red-500' : 'bg-gray-900'}`} style={{ width: `${campaignProgress}%` }} />
                                                        </div>
                                                    </div>
                                                </Dropdown.Item>
                                                <Dropdown.Item id="credit-balance" isDisabled className="!cursor-default !opacity-100" textValue={`Credit balance: ${isCreditsLoading ? 'Loading' : `RM ${credits.toLocaleString()}`}`}>
                                                    <div className="flex w-56 items-center justify-between gap-3 py-1">
                                                        <span className="text-xs text-gray-500">Credit balance</span>
                                                        <span className="text-sm font-semibold text-gray-900">{isCreditsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : `RM ${credits.toLocaleString()}`}</span>
                                                    </div>
                                                </Dropdown.Item>
                                                {businessSubscriptionActions.map(({ name, href }) => (
                                                    <Dropdown.Item key={name} id="upgrade-plan" textValue={name} onAction={() => navigate(href)}>
                                                        <Label className="flex-1">{name}</Label>
                                                        <ExternalLink size={15} className="ml-auto text-gray-500" />
                                                    </Dropdown.Item>
                                                ))}
                                            </Dropdown.Menu>
                                        </Dropdown.Popover>
                                    </Dropdown.SubmenuTrigger>
                                    {membership?.creatorId ? <Dropdown.Item id="creator" textValue="Switch to Creator" href={switchWorkspacePath('creator')}><ArrowLeftRight size={18} /><Label>Switch to Creator</Label></Dropdown.Item> : null}
                                    {businessAccountActions.map(({ name, href }) => {
                                        const Icon = accountIcons[name];
                                        return <Dropdown.Item key={name} id={name.toLowerCase()} textValue={name} onAction={() => navigate(href)}><Icon size={18} /><Label>{name}</Label></Dropdown.Item>;
                                    })}
                                    <Dropdown.Item id="sign-out" textValue={isLoggingOut ? 'Signing out' : 'Sign out'} onAction={handleLogout} isDisabled={isLoggingOut} className="text-red-600"><LogOut size={18} className="text-red-600" /><Label className="text-red-600">{isLoggingOut ? 'Signing out…' : 'Sign out'}</Label></Dropdown.Item>
                                </Dropdown.Menu>
                            </div>
                        </div>
                    </Dropdown.Popover>
                </Dropdown>
                {signOutError && <p role="alert" className="text-xs text-red-600">{signOutError}</p>}
            </div>
        </div>
    );
}
