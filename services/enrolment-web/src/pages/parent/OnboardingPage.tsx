import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Baby,
  GraduationCap,
  ArrowRight,
  Check,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useProfile } from '@/hooks/useProfile';

interface OnboardingStep {
  key: string;
  icon: typeof Sparkles;
  title: string;
  desc: string;
  action?: string;
  actionLabel?: string;
}

const STEPS: OnboardingStep[] = [
  {
    key: 'welcome',
    icon: Sparkles,
    title: 'Welcome to VedaAcademy!',
    desc: "Let's set up your profile so you can start enrolling your children in schools.",
  },
  {
    key: 'profile',
    icon: User,
    title: 'Your Profile',
    desc: 'Tell us about yourself — name, contact, and address.',
    action: '/profile',
    actionLabel: 'Set Up Profile',
  },
  {
    key: 'children',
    icon: Baby,
    title: 'Your Children',
    desc: "Add your children's details for enrollment applications.",
    action: '/profile/children',
    actionLabel: 'Add Children',
  },
  {
    key: 'enrol',
    icon: GraduationCap,
    title: 'Start Enrolling!',
    desc: 'Browse schools and submit your first application.',
    action: '/enrolment',
    actionLabel: 'Browse Schools',
  },
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const { isComplete } = useProfile();
  const [step, setStep] = useState(0);

  function next() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    }
  }

  function goToStep(s: OnboardingStep) {
    if (s.action) {
      navigate(s.action);
    }
  }

  const current = STEPS[step];

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* Step indicators */}
        <div className="mb-8 flex justify-center gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step
                  ? 'w-8 bg-gradient-to-r from-brand-500 to-purple-500'
                  : i < step
                    ? 'w-2 bg-brand-300'
                    : 'w-2 bg-slate-200'
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="glass-card text-center"
          >
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-100 to-purple-100">
              <current.icon className="h-10 w-10 text-brand-600" />
            </div>

            <h2 className="text-2xl font-bold text-slate-900">
              {current.title}
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-slate-500">
              {current.desc}
            </p>

            <div className="mt-8 flex flex-col items-center gap-3">
              {step === 0 && (
                <Button onClick={next} className="shadow-glow">
                  Let's Begin
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              )}

              {'action' in current && current.action && (
                <>
                  <Button
                    onClick={() => goToStep(current)}
                    className="shadow-glow"
                  >
                    {current.key === 'profile' && isComplete && (
                      <Check className="mr-1 h-4 w-4" />
                    )}
                    {current.actionLabel}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>

                  {step < STEPS.length - 1 && (
                    <button
                      type="button"
                      onClick={next}
                      className="text-sm text-slate-400 transition hover:text-slate-600"
                    >
                      Skip for now
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
