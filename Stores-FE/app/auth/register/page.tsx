'use client'

import { useState, useMemo, memo } from 'react'
import Link from 'next/link'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { 
  User, Store, GitBranch, Check, ChevronRight, ArrowLeft, 
  Mail, Lock, ShieldCheck, Eye, EyeOff, RefreshCw, Phone 
} from 'lucide-react'
import Logo from '../../../components/common/logo'


// --- Validation Schema -------------------------------------------------------

const validationSchema = Yup.object({
  role: Yup.string().required('Required'),
  name: Yup.string().min(2, 'Too Short').required('Full name is required'),
  email: Yup.string().email('Invalid email address').required('Email is required'),
  phone: Yup.string().min(10, 'Invalid phone').required('Phone is required'),
  password: Yup.string()
    .min(8, 'Min 8 characters')
    .matches(/[A-Z]/, 'Needs uppercase')
    .matches(/[0-9]/, 'Needs number')
    .required('Required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords must match')
    .required('Confirm your password'),
})

// --- Sub-Components ----------------------------------------------------------

const StepProgress = memo(({ current, total }: { current: number; total: number }) => (
  <div className="flex flex-col gap-3 mb-10">
    <div className="flex gap-2 h-1.5 w-full">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-full flex-grow rounded-full transition-all duration-700 ease-in-out ${
            i < current 
              ? 'bg-primary-container shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)]' 
              : 'bg-surface-container-highest'
          }`}
        />
      ))}
    </div>
    <div className="flex justify-between items-center px-0.5">
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant">Onboarding Sequence</span>
      <span className="text-[10px] font-bold text-primary-container tabular-nums italic uppercase tracking-wider">PHASE 0{current}</span>
    </div>
  </div>
))

const InputBlock = ({ label, type = "text", placeholder, isPassword, icon: Icon, formik, name }: any) => {
  const [show, setShow] = useState(false)
  const hasError = formik.touched[name] && formik.errors[name]
  const inputType = isPassword ? (show ? "text" : "password") : type

  return (
    <div className="space-y-2 relative">
      <div className="flex justify-between items-center px-1">
        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant">{label}</label>
        {hasError && <span className="text-[10px] font-bold text-error animate-pulse uppercase italic">{formik.errors[name]}</span>}
      </div>
      <div className="relative group">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary-container transition-colors">
          {Icon && <Icon size={18} strokeWidth={2.5} />}
        </div>
        <input
          {...formik.getFieldProps(name)}
          type={inputType}
          placeholder={placeholder}
          className={`w-full bg-surface-container-low border-2 rounded-2xl py-4 pl-12 pr-12 text-sm font-bold transition-all focus:outline-none focus:ring-4 ${
            hasError 
            ? 'border-error/20 focus:border-error focus:ring-error/5' 
            : 'border-outline-variant/30 focus:border-primary-container/50 focus:ring-primary-container/5 shadow-sm'
          } text-on-surface placeholder:text-outline/50`}
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

export default function RegisterPage() {
  const [step, setStep] = useState(1)
  const [resendCooldown, setResendCooldown] = useState(0)

  const formik = useFormik({
    initialValues: {
      role: 'buyer',
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
    validationSchema,
    onSubmit: (values) => {
      setStep(3)
      startTimer()
    },
  })

  const pwStrength = useMemo(() => {
    const pw = formik.values.password
    if (!pw) return 0
    let s = 0
    if (pw.length >= 8) s++
    if (/[A-Z]/.test(pw)) s++
    if (/[0-9]/.test(pw)) s++
    if (/[^A-Za-z0-9]/.test(pw)) s++
    return s
  }, [formik.values.password])

  const startTimer = () => {
    setResendCooldown(59)
    const interval = setInterval(() => {
      setResendCooldown(c => {
        if (c <= 1) { clearInterval(interval); return 0 }
        return c - 1
      })
    }, 1000)
  }

  const validateStepTwo = async () => {
    const fieldsToValidate = ['name', 'email', 'phone', 'password', 'confirmPassword']
    const errors = await formik.validateForm()
    fieldsToValidate.forEach(f => formik.setFieldTouched(f, true))
    const hasStepTwoErrors = fieldsToValidate.some(f => !!errors[f as keyof typeof errors])
    if (!hasStepTwoErrors) { formik.handleSubmit() }
  }

  return (
    <div className="min-h-screen bg-surface dark:bg-surface-lowest flex selection:bg-primary-container/30 font-body antialiased">
      
      {/* LEFT: BRAND PANEL */}
      <aside className="hidden lg:flex w-[420px] xl:w-[540px] flex-col justify-between p-16 bg-surface-lowest relative overflow-hidden border-r border-outline-variant/20">
        <div className="relative z-10">
          <Link href="/" className="inline-block mb-24 transition-opacity hover:opacity-80">
            <h1 className="text-2xl font-black italic tracking-tighter text-on-surface uppercase flex items-center gap-2">
              TradeHut<span className="w-2.5 h-2.5 bg-primary-container rounded-full mb-1" />
            </h1>
          </Link>
          <div className="space-y-8">
            <h2 className="text-5xl xl:text-6xl font-black text-on-surface leading-[1.1] tracking-tighter italic uppercase">
              Scale <br /> Beyond <br /> <span className="text-primary-container">Borders.</span>
            </h2>
            <p className="text-on-surface-variant text-base font-medium leading-relaxed max-w-sm border-l-4 border-primary-container/30 pl-6">
              Join the marketplace built for verified traders. Access reverse markets, live bidding, and secure procurement.
            </p>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-4 text-on-surface-variant">
            <div className="text-primary-container bg-primary-container/10 p-2.5 rounded-xl"><ShieldCheck size={20} strokeWidth={2.5} /></div>
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">Institutional Security</span>
          </div>
          <div className="flex items-center gap-4 text-on-surface-variant">
            <div className="text-primary-container bg-primary-container/10 p-2.5 rounded-xl"><RefreshCw size={20} strokeWidth={2.5} /></div>
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">Real-Time Liquidity</span>
          </div>
        </div>

        <div className="absolute top-0 right-0 w-full h-full opacity-40 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-primary-container/10 blur-[140px] rounded-full" />
        </div>
      </aside>

      {/* RIGHT: FORM CANVAS */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 sm:p-16 bg-surface">
        <div className="w-full max-w-[460px]">
          <StepProgress current={step} total={3} />

          {/* STEP 1: ROLE SELECTION */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out">
              <header className="mb-12">
                <h3 className="text-4xl font-black italic text-on-surface uppercase mb-3 tracking-tighter">Choose Role</h3>
                <p className="text-on-surface-variant text-sm font-medium">Select your account type to continue.</p>
              </header>

              <div className="space-y-4 mb-10">
                {[
                  { id: 'buyer', title: 'Individual Buyer', icon: User, desc: 'Procure products and manage personal trade bids.' },
                  { id: 'seller', title: 'Verified Seller', icon: Store, desc: 'List inventory and engage with bulk RFQ requests.' },
                  { id: 'both', title: 'Hybrid Entity', icon: GitBranch, desc: 'Full enterprise capability for both roles.' }
                ].map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => formik.setFieldValue('role', role.id)}
                    className={`group relative w-full text-left p-6 rounded-2xl border-2 transition-all duration-300 active:scale-[0.99] ${
                      formik.values.role === role.id
                        ? 'bg-surface-container-low border-primary-container ring-4 ring-primary-container/5 shadow-lg'
                        : 'bg-surface-container-lowest border-outline-variant/30 hover:border-primary-container/40 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-5">
                      <div className={`p-3.5 rounded-xl transition-all duration-500 ${
                        formik.values.role === role.id ? 'bg-primary-container text-on-primary shadow-lg' : 'bg-surface-container-highest text-on-surface-variant group-hover:scale-110'
                      }`}>
                        <role.icon size={24} strokeWidth={formik.values.role === role.id ? 2.5 : 2} />
                      </div>
                      <div className="flex-grow">
                        <h3 className={`font-bold text-base tracking-tight ${formik.values.role === role.id ? 'text-on-surface' : 'text-on-surface-variant'}`}>{role.title}</h3>
                        <p className="text-xs text-on-surface-variant/60 font-medium leading-relaxed">{role.desc}</p>
                      </div>
                      {formik.values.role === role.id && (
                        <div className="bg-primary-container rounded-full p-1 animate-in zoom-in-50 duration-300">
                           <Check size={12} className="text-on-primary" strokeWidth={4} />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="space-y-6">
                <button 
                  onClick={() => setStep(2)} 
                  className="group w-full py-5 primary-gradient text-on-primary font-black uppercase tracking-[0.25em] text-[11px] rounded-2xl shadow-xl shadow-primary-container/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  Initialize Profile <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <div className="text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                    Already part of the network? <Link href="/signin" className="text-primary-container hover:underline ml-1">Sign In here</Link>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: ACCOUNT DETAILS */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-700 ease-out">
              <header className="mb-12">
                <h3 className="text-4xl font-black italic text-on-surface uppercase mb-3 tracking-tighter">Credentials</h3>
                <p className="text-on-surface-variant text-sm font-medium">Secure your node in the trade network.</p>
              </header>

              <div className="space-y-6">
                <InputBlock formik={formik} name="name" icon={User} label="Full Name" placeholder="Nathan Ayikwei" />
                <InputBlock formik={formik} name="email" icon={Mail} label="Email Address" type="email" placeholder="nathan@tradehut.gh" />
                <InputBlock formik={formik} name="phone" icon={Phone} label="Phone" type="tel" placeholder="+233..." />
                <InputBlock formik={formik} name="password" icon={Lock} label="Access Key" isPassword placeholder="••••••••" />
                
                {formik.values.password && (
                  <div className="flex gap-1.5 h-1 px-1">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className={`h-full flex-1 rounded-full transition-all duration-500 ${i <= pwStrength ? 'bg-primary-container shadow-[0_0_8px_rgba(var(--primary-rgb),0.4)]' : 'bg-surface-container-highest'}`} />
                    ))}
                  </div>
                )}

                <InputBlock formik={formik} name="confirmPassword" icon={ShieldCheck} label="Confirm Access Key" isPassword placeholder="••••••••" />

                <div className="pt-8 space-y-6">
                  <button 
                    onClick={validateStepTwo}
                    className="w-full py-5 bg-on-surface text-surface-lowest font-black uppercase tracking-[0.25em] text-[11px] rounded-2xl shadow-xl transition-all active:scale-[0.98]"
                  >
                    Authorize Profile
                  </button>
                  <div className="flex flex-col gap-4 items-center">
                    <button onClick={() => setStep(1)} className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:text-primary-container transition-colors">
                      <ArrowLeft size={14} /> Revise Role
                    </button>
                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                      Have an account? <Link href="/auth/login" className="text-primary-container hover:underline ml-1">Login</Link>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: VERIFICATION */}
          {step === 3 && (
            <div className="animate-in fade-in zoom-in-95 duration-1000 text-center">
              <div className="mb-12 inline-flex items-center justify-center w-28 h-28 rounded-3xl bg-primary-container/10 border border-primary-container/20 relative">
                <Mail size={48} className="text-primary-container animate-pulse" strokeWidth={1.5} />
                <div className="absolute -top-3 -right-3 bg-primary-container text-on-primary p-1.5 rounded-full border-4 border-surface">
                  <Check size={14} strokeWidth={4} />
                </div>
              </div>
              <h3 className="text-4xl font-black italic text-on-surface uppercase mb-4 tracking-tighter leading-tight">Verification <br /> Dispatched</h3>
              <p className="text-on-surface-variant text-sm leading-relaxed mb-12 font-medium">
                We've sent a secure handshake link to <span className="text-primary-container font-bold">{formik.values.email}</span>. 
              </p>
              <div className="space-y-4 max-w-sm mx-auto">
                <button 
                  disabled={resendCooldown > 0}
                  onClick={startTimer}
                  className="w-full py-5 border-2 border-outline-variant/30 rounded-2xl text-[11px] font-black uppercase tracking-widest text-on-surface-variant hover:bg-surface-container-low hover:border-primary-container transition-all disabled:opacity-40 flex items-center justify-center gap-3"
                >
                  <RefreshCw size={14} className={resendCooldown > 0 ? 'animate-spin' : ''} />
                  {resendCooldown > 0 ? `Retry in ${resendCooldown}s` : 'Resend Link'}
                </button>
                <div className="pt-4">
                   <Link href="/dashboard" className="text-xs font-black uppercase tracking-widest text-primary-container hover:underline">Return to Hub</Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}