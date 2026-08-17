/**
 * CreateJobPostingScreen — create or edit a Job Board posting.
 * 'position' postings require the poster to be a verified clinic/shop/kennel
 * (enforced server-side); 'seeking_work' is open to any authenticated user.
 * Contact is off-platform (phone/WhatsApp) — no CV upload, no application flow.
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import {
  createJobPosting, updateJobPosting, getJobBoardMeta,
  JobPosting, JobKind, EmploymentType, JobBoardMeta,
} from '../api/jobBoard';
import { getUserLocation } from '../utils/location';
import { showAlert } from '../utils/alert';

const ACCENT = '#2563EB';

const ROLE_LABELS: Record<string, string> = {
  vet: 'Vet', vet_tech: 'Vet Tech', groomer: 'Groomer', trainer: 'Trainer',
  pet_sitter: 'Pet Sitter', receptionist: 'Receptionist', kennel_assistant: 'Kennel Assistant',
  driver: 'Driver', sales_rep: 'Sales Rep', manager: 'Manager', other: 'Other',
};
const EMPLOYMENT_LABELS: Record<string, string> = {
  full_time: 'Full-time', part_time: 'Part-time', locum: 'Locum', contract: 'Contract',
};

interface Props { navigation: any; route: any }

export default function CreateJobPostingScreen({ navigation, route }: Props) {
  const edit: JobPosting | undefined = route.params?.edit;
  const isEdit = !!edit;

  const [meta, setMeta] = useState<JobBoardMeta | null>(null);
  const [kind, setKind] = useState<JobKind>(edit?.kind || (route.params?.kind === 'seeking_work' ? 'seeking_work' : 'position'));
  const [title, setTitle] = useState(edit?.title || '');
  const [description, setDescription] = useState(edit?.description || '');
  const [roleCategory, setRoleCategory] = useState(edit?.roleCategory || '');
  const [employmentType, setEmploymentType] = useState<EmploymentType | ''>((edit?.employmentType as any) || '');
  const [experienceText, setExperienceText] = useState(edit?.experienceText || '');
  const [salaryText, setSalaryText] = useState(edit?.salaryText || '');
  const [contactPhone, setContactPhone] = useState(edit?.contactPhone || '');
  const [contactWhatsapp, setContactWhatsapp] = useState(edit?.contactWhatsapp || '');
  const [city, setCity] = useState(edit?.city || '');
  const [address, setAddress] = useState(edit?.address || '');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { getJobBoardMeta().then(setMeta); }, []);
  useEffect(() => {
    if (isEdit) return;
    getUserLocation().then((l: any) => { if (l?.latitude) setCoords({ lat: l.latitude, lng: l.longitude }); }).catch(() => {});
  }, [isEdit]);

  const submit = async () => {
    if (title.trim().length < 3) { showAlert('Title', 'Enter a clear title.'); return; }
    if (description.trim().length < 10) { showAlert('Description', 'Add a description (at least 10 characters).'); return; }

    const body: Record<string, any> = {
      kind, title: title.trim(), description: description.trim(),
      roleCategory: roleCategory || undefined,
      employmentType: employmentType || undefined,
      experienceText, salaryText, contactPhone, contactWhatsapp, city, address,
    };
    if (coords) { body.lat = coords.lat; body.lng = coords.lng; }

    setSaving(true);
    const r = isEdit ? await updateJobPosting(edit!._id, body) : await createJobPosting(body);
    setSaving(false);
    if (r.ok) {
      showAlert(isEdit ? 'Updated' : 'Posted!', r.body?.message || 'Your job posting is live.');
      navigation.goBack();
    } else {
      showAlert('Could not save', r.body?.message || 'Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        {!isEdit && (
          <>
            <View style={styles.kindRow}>
              {(['position', 'seeking_work'] as JobKind[]).map((k) => (
                <TouchableOpacity key={k} style={[styles.kindBtn, kind === k && styles.kindBtnActive]} onPress={() => setKind(k)}>
                  <Text style={[styles.kindTxt, kind === k && styles.kindTxtActive]}>{k === 'position' ? '🏥 Open Position' : '🙋 Seeking Work'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {kind === 'position' && (
              <Text style={styles.hint}>Only verified clinics, shops, or kennels can post open positions. If you're not verified yet, this will be rejected — get verified from your Profile first.</Text>
            )}
          </>
        )}

        <Field label="Title" value={title} onChangeText={setTitle} placeholder={kind === 'position' ? 'e.g. Locum Veterinarian Needed' : 'e.g. Experienced Vet Tech Seeking Full-Time Role'} />

        <Text style={styles.label}>Role</Text>
        <View style={styles.chipsWrap}>
          {(meta?.roleCategories || []).map((c) => (
            <TouchableOpacity key={c} style={[styles.chip, roleCategory === c && styles.chipActive]} onPress={() => setRoleCategory(c)}>
              <Text style={[styles.chipTxt, roleCategory === c && styles.chipTxtActive]}>{ROLE_LABELS[c] || c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Employment type</Text>
        <View style={styles.chipsWrap}>
          {(meta?.employmentTypes || []).map((t) => (
            <TouchableOpacity key={t} style={[styles.chip, employmentType === t && styles.chipActive]} onPress={() => setEmploymentType(t)}>
              <Text style={[styles.chipTxt, employmentType === t && styles.chipTxtActive]}>{EMPLOYMENT_LABELS[t] || t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Field label="Experience (optional)" value={experienceText} onChangeText={setExperienceText} placeholder="e.g. 3+ years, Entry level" />
        <Field label="Pay (optional)" value={salaryText} onChangeText={setSalaryText} placeholder="e.g. ₦150,000 - ₦250,000/month, Negotiable" />
        <Field label="Description" value={description} onChangeText={setDescription} placeholder={kind === 'position' ? 'Responsibilities, requirements, working hours…' : 'Your experience, availability, what you\'re looking for…'} multiline />

        <Field label="City / Area" value={city} onChangeText={setCity} placeholder="e.g. Ikeja, Lagos" />
        <Field label="Contact phone" value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" placeholder="Applicants/employers will call this number" />
        <Field label="WhatsApp (optional)" value={contactWhatsapp} onChangeText={setContactWhatsapp} keyboardType="phone-pad" placeholder="If different from phone" />

        <TouchableOpacity style={[styles.submit, saving && { opacity: 0.6 }]} disabled={saving} onPress={submit}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitTxt}>{isEdit ? 'Save changes' : 'Post to Job Board'}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, multiline, ...props }: any) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { height: 90, textAlignVertical: 'top' }]}
        placeholderTextColor="#9CA3AF"
        multiline={multiline}
        {...props}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  hint: { fontSize: 12, color: '#92400E', backgroundColor: '#FFFBEB', padding: 10, borderRadius: 8, marginBottom: 12, lineHeight: 17 },

  kindRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  kindBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  kindBtnActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  kindTxt: { fontWeight: '800', color: '#6B7280', fontSize: 13 },
  kindTxtActive: { color: '#fff' },

  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginTop: 14, marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#111827',
  },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  chipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  chipTxt: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  chipTxtActive: { color: '#fff' },

  submit: { backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 28 },
  submitTxt: { color: '#fff', fontWeight: '900', fontSize: 16 },
});
