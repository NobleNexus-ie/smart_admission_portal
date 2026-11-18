import { Link } from 'react-router-dom';
import { ArrowRight, School, Shield, Zap, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';

const features = [
  { icon: Zap, title: 'Fast Applications', desc: 'Apply to multiple schools in minutes' },
  { icon: Shield, title: 'Secure & Private', desc: 'Your data is protected at every step' },
  { icon: BarChart3, title: 'Live Tracking', desc: 'Monitor every application in real-time' },
];

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-32 top-0 h-[520px] w-[520px] rounded-full bg-brand-200/40 blur-3xl" />
        <div className="absolute -right-20 top-40 h-[420px] w-[420px] rounded-full bg-purple-200/30 blur-3xl" />
        <motion.div
          className="absolute left-1/2 top-1/3 h-[300px] w-[300px] rounded-full bg-brand-300/20 blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
        <motion.span
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="font-display text-lg font-bold gradient-text"
        >
          VedaAcademy Enrolment
        </motion.span>
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <Link to="/login" className="text-sm font-medium text-slate-600 transition hover:text-brand-600">
            Parent login
          </Link>
        </motion.div>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-88px)] max-w-6xl flex-col justify-center px-4 pb-20 pt-8 sm:px-6 lg:flex-row lg:items-center lg:gap-16">
        <div className="max-w-xl flex-1">
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
          >
            <span className="gradient-text">Smart School</span>{' '}
            <span className="text-slate-900">Admissions</span>
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-5 text-xl font-medium text-slate-700 sm:text-2xl"
          >
            Enrol your child with confidence
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-4 max-w-md text-base leading-relaxed text-slate-500"
          >
            Discover schools, submit applications, and track every step — built for parents and school teams who value clarity.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <Link to="/register">
              <Button size="lg" className="gap-2 shadow-glow">
                Apply as Parent
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/staff/login">
              <Button size="lg" variant="outline" className="gap-2">
                <School className="h-4 w-4" />
                School Staff Login
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="mt-12 grid grid-cols-3 gap-4"
          >
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + i * 0.1 }}
                whileHover={{ y: -4, scale: 1.03 }}
                className="glass-card !p-4 text-center"
              >
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100">
                  <f.icon className="h-5 w-5 text-brand-600" />
                </div>
                <p className="text-sm font-semibold text-slate-800">{f.title}</p>
                <p className="mt-1 text-xs text-slate-500">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.3, ease: 'easeOut' }}
          className="relative mt-14 flex-1 lg:mt-0"
          aria-hidden
        >
          <div className="relative mx-auto max-w-lg overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-violet-600 to-brand-800 p-1 shadow-glow-lg">
            <div className="rounded-[1.35rem] bg-slate-950/90 p-5">
              {/* Mock dashboard header */}
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-violet-500">
                  <School className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">VedaAcademy Dashboard</p>
                  <p className="text-[10px] text-slate-400">Parent Portal</p>
                </div>
                <div className="ml-auto flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </div>
              </div>

              {/* Mock stat cards */}
              <div className="mb-4 grid grid-cols-3 gap-2.5">
                {[
                  { label: 'Applications', value: '12', color: 'from-brand-500 to-violet-500' },
                  { label: 'Approved', value: '8', color: 'from-emerald-500 to-teal-500' },
                  { label: 'In Review', value: '3', color: 'from-amber-500 to-orange-500' },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 + i * 0.15 }}
                    className="rounded-xl border border-white/10 bg-white/5 p-3"
                  >
                    <motion.p
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 1.1 + i * 0.15, type: 'spring', stiffness: 200 }}
                      className={`bg-gradient-to-r ${stat.color} bg-clip-text font-display text-2xl font-bold text-transparent`}
                    >
                      {stat.value}
                    </motion.p>
                    <p className="mt-0.5 text-[10px] text-slate-400">{stat.label}</p>
                  </motion.div>
                ))}
              </div>

              {/* Mock application rows */}
              <div className="space-y-2">
                {[
                  { name: 'Aarav Sharma', school: 'Delhi Public School', status: 'Approved', statusColor: 'bg-emerald-500/20 text-emerald-400' },
                  { name: 'Priya Patel', school: 'Greenwood Academy', status: 'In Review', statusColor: 'bg-amber-500/20 text-amber-400' },
                  { name: 'Rohan Gupta', school: 'St. Xavier\'s High', status: 'Approved', statusColor: 'bg-emerald-500/20 text-emerald-400' },
                ].map((row, i) => (
                  <motion.div
                    key={row.name}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.2 + i * 0.12 }}
                    className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/5 px-3 py-2.5"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400/30 to-violet-400/30 text-[10px] font-bold text-brand-300">
                      {row.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-white">{row.name}</p>
                      <p className="truncate text-[10px] text-slate-500">{row.school}</p>
                    </div>
                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold ${row.statusColor}`}>
                      {row.status}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Mock progress bar */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.6 }}
                className="mt-4 rounded-lg border border-white/5 bg-white/5 p-3"
              >
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-medium text-slate-300">Completion Rate</span>
                  <span className="font-bold text-emerald-400">83%</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '83%' }}
                    transition={{ delay: 1.8, duration: 1, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-brand-400 to-emerald-400"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
