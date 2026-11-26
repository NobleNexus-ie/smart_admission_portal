import { useEffect, useState } from 'react';
import { Loader2, Save, School } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { AnimatedPage, FadeIn } from '@/components/ui/AnimatedPage';
import { getErrorMessage } from '@/lib/utils';
import { staffApi, type StaffSchool } from '@/api/staff';
import { SCHOOL_BOARDS } from '@/lib/types';

export function StaffSchoolSettingsPage() {
  const [school, setSchool] = useState<StaffSchool | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState('');
  const [board, setBoard] = useState('');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [gradesOffered, setGradesOffered] = useState('');
  const [facilities, setFacilities] = useState('');

  useEffect(() => {
    loadSchool();
  }, []);

  async function loadSchool() {
    setLoading(true);
    try {
      const data = await staffApi.getSchool();
      setSchool(data);
      setName(data.name);
      setBoard(data.board);
      setAddress(data.address);
      setArea(data.area);
      setCity(data.city);
      setState(data.state);
      setContactEmail(data.contact_email);
      setPhone(data.phone || '');
      setDescription(data.description || '');
      setWebsiteUrl(data.website_url || '');
      setGradesOffered((data.grades_offered || []).join(', '));
      setFacilities((data.facilities || []).join(', '));
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const payload: Partial<StaffSchool> = {
        name,
        board,
        address,
        area,
        city,
        state,
        contact_email: contactEmail,
        phone: phone || null,
        description: description || null,
        website_url: websiteUrl || null,
        grades_offered: gradesOffered ? gradesOffered.split(',').map((g) => g.trim()).filter(Boolean) : null,
        facilities: facilities ? facilities.split(',').map((f) => f.trim()).filter(Boolean) : null,
      };
      const updated = await staffApi.updateSchool(payload);
      setSchool(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <AnimatedPage className="page-container max-w-3xl">
      <FadeIn>
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-bg shadow-glow">
              <School className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="section-title">School Settings</h1>
              <p className="mt-0.5 text-sm text-slate-500">
                Manage your school's profile and contact information
              </p>
            </div>
          </div>
        </div>
      </FadeIn>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          School settings saved successfully!
        </div>
      )}

      <FadeIn delay={0.1}>
        <form onSubmit={handleSave} className="space-y-6">
          <section className="rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-soft">
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Basic Information
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  label="School name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <Select
                label="Board"
                required
                options={SCHOOL_BOARDS.map((b) => ({ value: b, label: b }))}
                value={board}
                onChange={(e) => setBoard(e.target.value)}
              />
              <Input
                label="Contact email"
                type="email"
                required
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
              <Input
                label="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Input
                label="Website"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
              />
            </div>
          </section>

          <section className="rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-soft">
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Location
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  label="Address"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <Input
                label="Area"
                required
                value={area}
                onChange={(e) => setArea(e.target.value)}
              />
              <Input
                label="City"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <Input
                label="State"
                required
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </div>
          </section>

          <section className="rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-soft">
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Details
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="field-label">Description</label>
                <textarea
                  className="min-h-[100px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <Input
                label="Grades offered (comma separated)"
                value={gradesOffered}
                onChange={(e) => setGradesOffered(e.target.value)}
                placeholder="Nursery, LKG, UKG, Grade 1, Grade 2..."
              />
              <Input
                label="Facilities (comma separated)"
                value={facilities}
                onChange={(e) => setFacilities(e.target.value)}
                placeholder="Library, Sports, Computer Lab..."
              />
            </div>
          </section>

          <div className="flex items-center gap-3">
            <Button type="submit" loading={saving}>
              <Save className="h-4 w-4" />
              Save changes
            </Button>
            {school && (
              <span className="text-xs text-slate-400">
                Status: <span className="font-medium text-slate-600">{school.status}</span>
              </span>
            )}
          </div>
        </form>
      </FadeIn>
    </AnimatedPage>
  );
}
