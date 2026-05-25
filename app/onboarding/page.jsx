'use client';

/**
 * app/onboarding/page.jsx
 *
 * Premium client-side Onboarding page for CampusGrid.
 * A 4-step wizard to complete profile setup, choose academic credentials,
 * choose tech interests, and claim starting XP (+100 XP).
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, 
  User, 
  BookOpen, 
  Tag, 
  Award, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  AlertCircle,
  Clock,
  HelpCircle
} from 'lucide-react';

const DEPARTMENTS = [
  { value: 'CSE-1', label: 'CSE-1' },
  { value: 'CSE-2', label: 'CSE-2' },
  { value: 'AIML', label: 'AIML' },
  { value: 'ISE', label: 'ISE' },
  { value: 'CY', label: 'CY' },
  { value: 'EC', label: 'EC' }
];

const INTERESTS_POOL = [
  'React', 'Next.js', 'TypeScript', 'Node.js', 'Python',
  'Machine Learning', 'Deep Learning', 'Generative AI',
  'UI/UX Design', 'Figma', 'Competitive Programming',
  'Web3 & Blockchain', 'Robotics', 'IoT', 'Cybersecurity',
  'Cloud Computing', 'Data Structures & Algorithms',
  'Open Source', 'App Development', 'Product Management'
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Onboarding Form State
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [studyYear, setStudyYear] = useState(1); // 1, 2, 3, 4, or 'lateral'
  const [department, setDepartment] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [bio, setBio] = useState('');

  // Fetch active session details on mount
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/v1/auth/session');
        const result = await res.json();
        
        if (!res.ok || !result.success) {
          router.push('/sign-in');
          return;
        }

        const user = result.data;
        if (user.is_onboarded) {
          router.push('/dashboard');
          return;
        }

        // Prepopulate with base values if available
        if (user.email) {
          const emailPrefix = user.email.split('@')[0];
          setFullName(emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1));
          setUsername(emailPrefix.toLowerCase().replace(/[^a-z0-9_-]/g, '-'));
        }
        setLoading(false);
      } catch (err) {
        console.error('Session retrieval error:', err);
        router.push('/sign-in');
      }
    }
    checkSession();
  }, [router]);

  const handleInterestToggle = (interest) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter(i => i !== interest));
    } else {
      if (selectedInterests.length >= 10) return; // Zod schema max is 10
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  const handleNextStep = () => {
    setError('');
    
    // Step 1 validation
    if (step === 1) {
      if (!fullName.trim() || fullName.trim().length < 2) {
        setError('Full name must be at least 2 characters.');
        return;
      }
      if (!username.trim() || username.trim().length < 3) {
        setError('Username must be at least 3 characters.');
        return;
      }
      if (!/^[a-z0-9_-]+$/.test(username)) {
        setError('Username may only contain lowercase letters, numbers, underscores, or hyphens.');
        return;
      }
    }
    
    // Step 2 validation
    if (step === 2) {
      if (!department) {
        setError('Please select your department.');
        return;
      }

      // Roll Number / USN Validation logic:
      // Optional for 1st Year (since they get USN late) & Lateral Entry (takes longer to issue).
      // Required for 2nd Year, 3rd Year, and 4th Year regular students.
      const isUsnOptional = studyYear === 1 || studyYear === 'lateral';
      if (!isUsnOptional && !rollNumber.trim()) {
        const yearText = studyYear === 2 ? '2nd' : studyYear === 3 ? '3rd' : '4th';
        setError(`USN / Roll Number is required for ${yearText} Year students.`);
        return;
      }
    }

    setStep(step + 1);
  };

  const handlePrevStep = () => {
    setError('');
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);

    // Map studyYear: 'lateral' translates to Year 2 (Direct entry) in the database
    const apiYear = studyYear === 'lateral' ? 2 : Number(studyYear);

    // If USN is omitted, we store "Pending" for 1st Year / Lateral Entry if needed,
    // or let it be blank.
    const finalRollNumber = rollNumber.trim();

    try {
      const res = await fetch('/api/v1/auth/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          username: username.trim(),
          year: apiYear,
          department,
          roll_number: finalRollNumber || undefined,
          interests: selectedInterests,
          bio: bio.trim() || undefined,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || result.message || 'Onboarding failed.');
      }

      setStep(4);
      setSubmitting(false);
    } catch (err) {
      setError(err.message || 'Failed to submit onboarding.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-zinc-950 text-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        <p className="mt-4 text-sm text-zinc-400 font-medium">Initializing onboarding wizard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-zinc-950 text-zinc-100 relative overflow-hidden px-4 py-8">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/4 -z-10 h-[400px] w-[400px] rounded-full bg-accent/5 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-[400px] w-[400px] rounded-full bg-violet-500/5 blur-3xl" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:20px_20px]" />

      <div className="w-full max-w-xl">
        {/* Step Indicator Header */}
        {step < 4 && (
          <div className="mb-8">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-bold uppercase tracking-wider mb-3">
              <span>Profile Setup wizard</span>
              <span className="text-accent">Step {step} of 3</span>
            </div>
            
            {/* Progress Bar */}
            <div className="h-1.5 w-full bg-zinc-800/80 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-accent to-violet-500 transition-all duration-500 ease-out" 
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Wizard Card Body */}
        <div className="relative rounded-[32px] border border-zinc-800/60 bg-zinc-900/35 backdrop-blur-xl p-8 shadow-2xl transition-all duration-300">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-450 mb-6 animate-fadeIn">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Basic Profile Details */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl font-bold flex items-center gap-2">
                  <User className="h-6 w-6 text-accent" /> Profile Credentials
                </h2>
                <p className="text-sm text-zinc-400 mt-1">First, let&apos;s customize your campus profile details.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="fullname" className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Full Name</label>
                  <input
                    id="fullname"
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-accent"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label htmlFor="username" className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Unique Username</label>
                    <span className="text-[10px] text-zinc-500">Only letters, numbers, _ or -</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-sm font-semibold text-zinc-500">@</span>
                    <input
                      id="username"
                      type="text"
                      placeholder="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase())}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 pl-8 pr-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="bio" className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Profile Bio (Optional)</label>
                  <textarea
                    id="bio"
                    rows={3}
                    maxLength={300}
                    placeholder="Tell your college peers what you're passionate about..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-accent resize-none"
                  />
                  <div className="text-right text-[10px] text-zinc-500">
                    {bio.length}/300
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="flex items-center gap-1.5 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/15 hover:bg-accent/90 transition-all cursor-pointer"
                >
                  Academic Details <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Academic Setup (USN rules + Department dropdown) */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl font-bold flex items-center gap-2">
                  <BookOpen className="h-6 w-6 text-accent" /> Academic Setup
                </h2>
                <p className="text-sm text-zinc-400 mt-1">Specify your department and current study year.</p>
              </div>

              <div className="space-y-5">
                {/* Department Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-300 outline-none focus:border-accent cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%20fill%3Dnone%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%23a1a1aa%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px_20px] bg-[right_14px_center] bg-no-repeat"
                  >
                    <option value="" disabled>Select your department</option>
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept.value} value={dept.value}>{dept.label}</option>
                    ))}
                  </select>
                </div>

                {/* Study Year selection with 'Lateral Entry' option */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Study Year</label>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { value: 1, label: '1st Yr' },
                      { value: 2, label: '2nd Yr' },
                      { value: 3, label: '3rd Yr' },
                      { value: 4, label: '4th Yr' },
                      { value: 'lateral', label: 'Lateral' }
                    ].map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => {
                          setStudyYear(item.value);
                          // Clear roll number if changing to a mode where it becomes optional
                          setError('');
                        }}
                        className={`rounded-xl border py-3.5 text-xs font-bold tracking-wide transition-all cursor-pointer ${
                          studyYear === item.value 
                            ? 'border-accent bg-accent/15 text-accent shadow-md shadow-accent/5' 
                            : 'border-zinc-800 bg-zinc-950/80 text-zinc-455 hover:border-zinc-700'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* USN / Roll Number Input */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label htmlFor="roll" className="text-xs font-bold text-zinc-400 uppercase tracking-wide">
                      USN / Roll Number
                    </label>
                    
                    {/* Status indicator badges */}
                    {(studyYear === 1 || studyYear === 'lateral') ? (
                      <span className="inline-flex items-center gap-1 rounded bg-zinc-850 px-2 py-0.5 text-[10px] font-bold text-amber-500/90 border border-zinc-800">
                        <Clock className="h-3 w-3" /> Optional (Pending)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent border border-accent/20">
                        Required
                      </span>
                    )}
                  </div>

                  <input
                    id="roll"
                    type="text"
                    placeholder={
                      studyYear === 1 
                        ? 'USN (Optional for 1st Year)' 
                        : studyYear === 'lateral'
                        ? 'USN (Optional for Lateral Entry)'
                        : 'e.g. 1RV22CS104'
                    }
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-accent"
                  />

                  {/* Soft Rules Helper / Reminder Message */}
                  {studyYear === 1 && (
                    <div className="rounded-xl border border-zinc-850 bg-zinc-900/10 p-3.5 text-xs text-zinc-400 flex items-start gap-2.5 animate-fadeIn">
                      <HelpCircle className="h-4.5 w-4.5 text-zinc-500 shrink-0 mt-0.5" />
                      <span>
                        <strong>1st Year Rule:</strong> USN is optional because university registration codes are issued late. You can complete onboarding now; you will receive a promotion prompt to update your USN later.
                      </span>
                    </div>
                  )}

                  {studyYear === 'lateral' && (
                    <div className="rounded-xl border border-zinc-850 bg-zinc-900/10 p-3.5 text-xs text-zinc-400 flex items-start gap-2.5 animate-fadeIn">
                      <HelpCircle className="h-4.5 w-4.5 text-zinc-500 shrink-0 mt-0.5" />
                      <span>
                        <strong>Lateral Entry Rule:</strong> Since lateral admission processing takes longer, you can omit your USN. Leave it blank and your profile will mark USN as "Admissions Pending".
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950/50 px-5 py-3 text-sm font-semibold text-zinc-450 hover:bg-zinc-950 transition-all cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="flex items-center gap-1.5 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/15 hover:bg-accent/90 transition-all cursor-pointer"
                >
                  Select Interests <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Interests & Skills Selection */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-end">
                  <h2 className="font-display text-2xl font-bold flex items-center gap-2">
                    <Tag className="h-6 w-6 text-accent" /> Select Interests
                  </h2>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{selectedInterests.length}/10 chosen</span>
                </div>
                <p className="text-sm text-zinc-400 mt-1">Select topics you are interested in. We&apos;ll tailor your hub content feed to these interests.</p>
              </div>

              <div className="flex flex-wrap gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                {INTERESTS_POOL.map((interest) => {
                  const active = selectedInterests.includes(interest);
                  return (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => handleInterestToggle(interest)}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                        active 
                          ? 'border-accent bg-accent/15 text-accent shadow-md shadow-accent/5' 
                          : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      {active && <Check className="h-3.5 w-3.5" />}
                      {interest}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  disabled={submitting}
                  className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950/50 px-5 py-3 text-sm font-semibold text-zinc-450 hover:bg-zinc-950 transition-all cursor-pointer disabled:opacity-50"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-accent to-violet-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-accent/15 hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      Complete Setup & Claim <Sparkles className="h-4.5 w-4.5 text-yellow-300 animate-pulse" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Success & Rewards Screen */}
          {step === 4 && (
            <div className="text-center space-y-6 py-4 animate-scaleUp">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Award className="h-10 w-10 animate-bounce" />
              </div>

              <div className="space-y-2">
                <h2 className="font-display text-3xl font-extrabold bg-gradient-to-r from-accent to-violet-500 bg-clip-text text-transparent">
                  Welcome to CampusGrid!
                </h2>
                <p className="text-zinc-450 text-sm max-w-sm mx-auto">
                  Your profile has been created successfully. You have earned a starting bonus of:
                </p>
              </div>

              {/* Bonus XP Box */}
              <div className="inline-flex flex-col items-center justify-center px-8 py-4 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 max-w-xs mx-auto">
                <span className="text-4xl font-extrabold text-emerald-400 tracking-tight">+100 XP</span>
                <span className="text-[10px] text-emerald-500 uppercase tracking-widest font-bold mt-1">Welcome Badge Active</span>
              </div>

              <p className="text-xs text-zinc-500">
                Peer interactions, learning paths, and event check-ins will earn you more XP.
              </p>

              <div>
                <button
                  type="button"
                  onClick={() => {
                    router.push('/dashboard');
                    router.refresh();
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand py-3.5 text-sm font-semibold text-white shadow-md shadow-brand/10 transition-all duration-300 hover:bg-brand/90 dark:bg-accent dark:shadow-accent/15 dark:hover:bg-accent/90 cursor-pointer hover:scale-[1.01]"
                >
                  Enter Campus Dashboard <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
