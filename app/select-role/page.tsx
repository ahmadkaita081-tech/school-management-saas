'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { ShieldCheck, UserCheck, GraduationCap, Users } from 'lucide-react';

function RoleSelectorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const schoolId = searchParams.get('schoolId');
  const schoolName = searchParams.get('schoolName')
    ? decodeURIComponent(searchParams.get('schoolName')!)
    : 'Selected School';

  const roles = [
    {
      id: 'admin',
      title: 'School Admin / Owner',
      description: 'Manage school settings, staff, finances, and system configuration.',
      icon: ShieldCheck,
      color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
    },
    {
      id: 'teacher',
      title: 'Teacher / Staff',
      description: 'Mark attendance, enter continuous assessments, and manage classroom activities.',
      icon: UserCheck,
      color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    },
    {
      id: 'student',
      title: 'Student',
      description: 'View subject timetables, track attendance, and check term results.',
      icon: GraduationCap,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    },
    {
      id: 'parent',
      title: 'Parent / Guardian',
      description: 'Monitor ward progress, track fee payments, and view published report cards.',
      icon: Users,
      color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
    },
  ];

  const handleRoleSelect = (roleId: string) => {
    if (!schoolId) {
      router.push('/select-school');
      return;
    }
    const encodedName = encodeURIComponent(schoolName);
    // Route to Step 3 (Login Page) with school and role parameters
    router.push(`/login?schoolId=${schoolId}&schoolName=${encodedName}&role=${roleId}`);
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-10">
        <div className="text-center mb-8">
          <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
            Step 2 of 3
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-3">
            {schoolName}
          </h1>
          <p className="text-slate-500 text-sm mt-2">
            Select your portal role to continue to the login screen.
          </p>
        </div>

        {/* Role Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <button
                key={role.id}
                onClick={() => handleRoleSelect(role.id)}
                className={`flex flex-col text-left p-5 rounded-2xl border transition-all ${role.color} cursor-pointer group`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="p-2.5 rounded-xl bg-white/80 shadow-sm">
                    <Icon className="w-6 h-6" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider opacity-75">
                    Select &rarr;
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-1">
                  {role.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {role.description}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/select-school')}
            className="text-xs text-slate-400 hover:text-slate-600 underline transition-colors"
          >
            &larr; Select a different school
          </button>
        </div>
      </div>
    </main>
  );
}

export default function SelectRolePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 text-sm">Loading...</div>}>
      <RoleSelectorContent />
    </Suspense>
  );
}