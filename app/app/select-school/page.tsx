'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Organization {
  id: string;
  name: string;
}

export default function SchoolSelectionGateway() {
  const [schools, setSchools] = useState<Organization[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchSchools() {
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name')
          .eq('active', true)
          .order('name', { ascending: true });

        if (error) throw error;
        setSchools(data || []);
      } catch (err) {
        console.error('Error fetching schools:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSchools();
  }, []);

  const filteredSchools = schools.filter((school) =>
    school.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectSchool = (schoolId: string, schoolName: string) => {
    const encodedName = encodeURIComponent(schoolName);
    router.push(`/select-role?schoolId=${schoolId}&schoolName=${encodedName}`);
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-10">
        <div className="text-center mb-8">
          <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
            Step 1 of 3
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-3">
            Select Your School Portal
          </h1>
          <p className="text-slate-500 text-sm mt-2">
            Search and select your school to proceed to the login portal.
          </p>
        </div>

        {/* Search Input Box */}
        <div className="relative mb-6">
          <input
            type="text"
            placeholder="Type your school name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
          />
          <svg
            className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* School List */}
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {loading ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              Loading registered schools...
            </div>
          ) : filteredSchools.length > 0 ? (
            filteredSchools.map((school) => (
              <button
                key={school.id}
                onClick={() => handleSelectSchool(school.id, school.name)}
                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-100 rounded-xl transition-all group text-left"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-base">
                    {school.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors text-sm sm:text-base">
                      {school.name}
                    </h3>
                  </div>
                </div>
                <svg
                  className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            ))
          ) : (
            <div className="text-center py-8 text-slate-400 text-sm">
              No matching active schools found.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}