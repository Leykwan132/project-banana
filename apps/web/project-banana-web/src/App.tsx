import { useAuth } from '@workos-inc/authkit-react';
import { Navigate } from 'react-router-dom';

export default function App() {
    const { user, signIn } = useAuth();

    if (user) {
        return <Navigate to="/overview" />;
    }

    return (
        <div className="min-h-screen w-full flex">
            {/* Left Side - Login Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 bg-white">
                <div className="w-full max-w-md space-y-8">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mb-6">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
                            Welcome back
                        </h2>
                        <p className="mt-2 text-sm text-gray-600">
                            Sign in to your account to continue
                        </p>
                    </div>

                    <div className="mt-8 space-y-6">
                        <button
                            onClick={() => void signIn()}
                            className="flex w-full justify-center rounded-xl bg-black px-3 py-3.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black transition-all active:scale-[0.99] cursor-pointer"
                        >
                            Sign in with AuthKit
                        </button>
                    </div>

                    <p className="mt-10 text-center text-xs text-gray-500">
                        Powered by Project Banana
                    </p>
                </div>
            </div>

            {/* Right Side - Image */}
            <div className="hidden lg:block w-1/2 relative">
                <img
                    className="absolute inset-0 h-full w-full object-cover"
                    src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop"
                    alt="Abstract background"
                />
                {/* Optional overlay */}
                <div className="absolute inset-0 bg-black/10"></div>
            </div>
        </div>
    );
}