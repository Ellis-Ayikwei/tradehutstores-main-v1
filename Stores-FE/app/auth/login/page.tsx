'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useSignIn from 'react-auth-kit/hooks/useSignIn'
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Chrome, 
  Apple, 
  Facebook, 
  ShieldCheck, 
  ChevronRight,
  Info
} from 'lucide-react'
import axios from 'axios'
import Logo from '../../../components/common/logo'


// --- Sub-Components ----------------------------------------------------------

const SocialBtn = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick?: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center justify-center gap-3 w-full py-4 bg-surface-container-low hover:bg-surface-container-highest border-2 border-outline-variant/20 rounded-2xl text-on-surface text-[10px] font-black uppercase tracking-widest transition-all duration-200 active:scale-[0.98]"
  >
    {icon}
    <span>{label}</span>
  </button>
)

const InputField = ({ label, type, value, onChange, placeholder, icon: Icon, isPassword, error }: any) => {
  const [show, setShow] = useState(false)
  const inputType = isPassword ? (show ? "text" : "password") : type

  return (
    <div className="space-y-2">
      <div className="flex justify-between px-1">
        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant">{label}</label>
        {error && <span className="text-[10px] font-bold text-error uppercase italic animate-pulse">{error}</span>}
      </div>
      <div className="relative group">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary-container transition-colors">
          {Icon && <Icon size={18} strokeWidth={2.5} />}
        </div>
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-surface-container-low border-2 border-outline-variant/30 rounded-2xl py-4 pl-12 pr-12 text-sm font-bold focus:outline-none focus:border-primary-container/50 focus:ring-4 focus:ring-primary-container/5 transition-all text-on-surface placeholder:text-outline/40"
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(!show)} className="absolute right-5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors">
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  )
}

// --- Main Page ---------------------------------------------------------------

export default function LoginPage() {
  const signIn = useSignIn()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [serverError, setServerError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError('')
    
    // Simple Validation
    const errs: any = {}
    if (!email.includes('@')) errs.email = "Invalid Email"
    if (password.length < 1) errs.password = "Required"
    if (Object.keys(errs).length > 0) return setErrors(errs)

    setLoading(true)
    try {
      const response = await axios.post('/api/auth/login', { email, password })
      if (response.data.token) {
        signIn({
          token: response.data.token,
          expiresIn: 3600,
          tokenType: 'Bearer',
          authState: { user: response.data.user },
        })
        router.push('/dashboard')
      }
    } catch {
      setServerError('Access Denied: Invalid Credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex selection:bg-primary-container/30 font-body antialiased">
      
      {/* LEFT: BRAND PANEL (Matches Registration) */}
      <aside className="hidden lg:flex w-[420px] xl:w-[540px] flex-col justify-between p-16 bg-surface-lowest relative overflow-hidden border-r border-outline-variant/20">
        <div className="relative z-10">
        <div className="shrink-0 !w-[140px]">
                        <Logo />
        </div>
          <div className="space-y-8">
            <h2 className="text-5xl xl:text-6xl font-black text-on-surface leading-[1.1] tracking-tighter italic uppercase">
              Resume <br />
              Your <br />
              <span className="text-primary-container">Operations.</span>
            </h2>
            <p className="text-on-surface-variant text-base font-medium leading-relaxed max-w-sm border-l-4 border-primary-container/30 pl-6">
              Access your global supply chain, manage active bids, and monitor real-time market fluctuations.
            </p>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-4 text-on-surface-variant">
            <div className="text-primary-container bg-primary-container/10 p-2.5 rounded-xl"><ShieldCheck size={20} strokeWidth={2.5} /></div>
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">Encrypted Session</span>
          </div>
        </div>

        <div className="absolute top-0 right-0 w-full h-full opacity-30 pointer-events-none">
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-primary-container/10 blur-[140px] rounded-full" />
        </div>
      </aside>

      {/* RIGHT: LOGIN FORM */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 sm:p-16 bg-surface">
        <div className="w-full max-w-[440px] animate-in fade-in slide-in-from-bottom-6 duration-700">
          
          <header className="mb-12">
            <h3 className="text-4xl font-black italic text-on-surface uppercase mb-3 tracking-tighter">Sign In</h3>
            <p className="text-on-surface-variant text-sm font-medium">Authenticate to enter the trade network.</p>
          </header>

          <div className="grid grid-cols-3 gap-3 mb-8">
            <SocialBtn icon={<Chrome size={16} />} label="Google" />
            <SocialBtn icon={<Apple size={16} />} label="Apple" />
            <SocialBtn icon={<Facebook size={16} />} label="Meta" />
          </div>

          <div className="relative flex items-center mb-8">
            <div className="flex-grow border-t-2 border-outline-variant/20" />
            <span className="flex-shrink mx-4 text-on-surface-variant/40 text-[9px] font-black uppercase tracking-[0.3em]">Institutional Access</span>
            <div className="flex-grow border-t-2 border-outline-variant/20" />
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <InputField 
              icon={Mail} label="Corporate Email" 
              value={email} onChange={setEmail} 
              error={errors.email} placeholder="nathan@tradehut.gh" 
            />
            
            <div className="space-y-2">
              <InputField 
                icon={Lock} label="Access Key" 
                value={password} onChange={setPassword} 
                error={errors.password} isPassword placeholder="••••••••" 
              />
              <div className="flex justify-end px-1">
                <Link href="/auth/forgot-password" size={14} className="text-[10px] font-black uppercase tracking-widest text-primary-container hover:underline">
                  Reset Key?
                </Link>
              </div>
            </div>

            {serverError && (
              <div className="flex items-center gap-3 p-4 bg-error-container/10 border border-error/20 rounded-2xl text-error text-xs font-bold italic animate-in zoom-in-95">
                <Info size={16} />
                {serverError}
              </div>
            )}

            <div className="pt-6 space-y-6">
              <button 
                type="submit" 
                disabled={loading}
                className="group w-full py-5 primary-gradient text-on-primary font-black uppercase tracking-[0.25em] text-[11px] rounded-2xl shadow-xl shadow-primary-container/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Authorize Login'}
                {!loading && <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />}
              </button>

              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                  New to TradeHut?{' '}
                  <Link href="/auth/register" className="text-primary-container hover:underline ml-1">
                    Create Account
                  </Link>
                </p>
              </div>
            </div>
          </form>

          {/* Security Footer */}
          <div className="mt-12 flex items-center justify-center gap-4 text-on-surface-variant/30">
            <div className="h-[1px] flex-1 bg-outline-variant/10" />
            <ShieldCheck size={16} />
            <span className="text-[9px] font-black uppercase tracking-[0.2em]">AES-256 Protocol</span>
            <div className="h-[1px] flex-1 bg-outline-variant/10" />
          </div>
        </div>
      </main>
    </div>
  )
}