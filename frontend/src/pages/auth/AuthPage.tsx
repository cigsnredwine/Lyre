import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authClient } from '@/lib/auth-client';
import { axiosInstance } from '@/lib/axios';
import './auth.css';

function localRedirect(target: string | null) {
    if (!target?.startsWith('/') || target.startsWith('//') || target.includes('\\')) return '/studio';
    const url = new URL(target, window.location.origin);
    if (url.origin !== window.location.origin || url.pathname.startsWith('//')) return '/studio';
    return url.pathname + url.search + url.hash;
}

function socialErrorMessage(error: string | null, state: string | null) {
    if (error === 'access_denied') return 'Social sign-in was cancelled.';
    if (error === 'account_not_linked') return 'This email already has a Lyre account. Sign in using your original method.';
    if (error === 'email_not_found') return 'The provider did not share an email address. Try another sign-in method.';
    if (error || state === 'state_not_found') return 'Social sign-in couldn’t be completed. Try again.';
    return '';
}

export default function AuthPage({ mode }: { mode: 'sign-in' | 'sign-up' }) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [providers, setProviders] = useState<string[]>([]);
    const [pending, setPending] = useState<'email' | 'google' | null>(null);
    const [authError, setAuthError] = useState('');
    const isSignUp = mode === 'sign-up';
    const localLogin = import.meta.env.DEV && import.meta.env.VITE_LOCAL_TEST_AUTH === 'true';
    const redirect = localRedirect(searchParams.get('redirect'));
    const nextQuery = new URLSearchParams({ redirect }).toString();
    const callbackError = socialErrorMessage(searchParams.get('error'), searchParams.get('state'));
    const googleEnabled = providers.includes('google');


    useEffect(() => {
        const controller = new AbortController();
        axiosInstance.get<{ providers: string[] }>('/app-auth/providers', { signal: controller.signal })
            .then(({ data }) => {
                if (!controller.signal.aborted && Array.isArray(data.providers)) setProviders(data.providers);
            })
            .catch(() => {});
        return () => controller.abort();
    }, []);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const email = String(form.get('email') ?? '').trim();
        const password = String(form.get('password') ?? '');
        setAuthError('');
        setPending('email');
        try {
            const result = isSignUp
                ? await authClient.signUp.email({ name: String(form.get('name') ?? '').trim(), email, password })
                : await authClient.signIn.email({ email: localLogin && email === 'admin' ? 'admin@lyre.test' : email, password });
            if (result.error) {
                setAuthError(isSignUp ? result.error.message || 'Unable to create account.' : 'Couldn’t sign in. Check your email and password.');
                return;
            }
            toast.success(isSignUp ? 'Account created' : 'Signed in');
            navigate(redirect, { replace: true });
        } catch {
            setAuthError('Couldn’t reach Lyre. Try again.');
        } finally {
            setPending(null);
        }
    }

    async function continueWithGoogle() {
        setAuthError('');
        setPending('google');
        try {
            const result = await authClient.signIn.social({
                provider: 'google',
                callbackURL: new URL(redirect, window.location.origin).href,
                errorCallbackURL: new URL(`${isSignUp ? '/signup' : '/login'}?${nextQuery}`, window.location.origin).href,
            });
            if (result.error) setAuthError('Couldn’t start social sign-in. Try again.');
        } catch {
            setAuthError('Couldn’t reach Lyre. Try again.');
        } finally {
            setPending(null);
        }
    }

    return (
        <main className="lyre-auth">
            <div className="lyre-auth-panel">
                <Link to="/" className="lyre-auth-wordmark" aria-label="Lyre home">lyre</Link>
                <h1 className="sr-only">{isSignUp ? 'Create your account' : 'Sign in to Lyre'}</h1>

                {(authError || callbackError) && <p role="alert" className="lyre-auth-error">{authError || callbackError}</p>}
                <form className="lyre-auth-form" onSubmit={handleSubmit} onChange={() => setAuthError('')}>
                    {isSignUp && <label>
                        <span>Name</span>
                        <input name="name" autoComplete="name" required />
                    </label>}
                    <label>
                        <span>{localLogin && !isSignUp ? 'Email or username' : 'Email address'}</span>
                        <input name="email" type={localLogin && !isSignUp ? 'text' : 'email'} autoComplete={isSignUp ? 'email' : 'username'} required />
                    </label>
                    <label>
                        <span>Password</span>
                        <input name="password" type="password" autoComplete={isSignUp ? 'new-password' : 'current-password'} minLength={isSignUp ? 8 : undefined} required />
                        {isSignUp && <small>At least 8 characters</small>}
                    </label>
                    <button type="submit" className="lyre-auth-submit" disabled={pending !== null}>
                        {pending === 'email' ? 'Working…' : isSignUp ? 'Create account' : 'Log in'}
                    </button>
                </form>

                {(googleEnabled || import.meta.env.DEV) && <div className="lyre-auth-social">
                    <div className="lyre-auth-divider">or</div>
                    <div className="lyre-auth-provider-list">
                        <button type="button" className="lyre-auth-google" disabled={pending !== null || !googleEnabled}
                            onClick={() => void continueWithGoogle()}>
                            {pending === 'google' ? 'Connecting to Google…' : 'Continue with Google'}
                        </button>
                    </div>
                    {!googleEnabled && <p className="lyre-auth-provider-help">Google sign-in needs server credentials.</p>}
                </div>}

                <p className="lyre-auth-switch">
                    {isSignUp ? 'Already have an account?' : 'Don’t have an account?'}{' '}
                    <Link to={`${isSignUp ? '/login' : '/signup'}?${nextQuery}`}>
                        {isSignUp ? 'Sign in' : 'Create one'}
                    </Link>
                </p>
            </div>
        </main>
    );
}
