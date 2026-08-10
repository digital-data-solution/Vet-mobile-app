/**
 * Dropdown.tsx — a tap-to-select picker with search, to cut typing. Shows a
 * button with the current value; tapping opens a searchable modal list. If the
 * chosen value is "Other" (or allowFreeText), a text input appears so the clinic
 * can still enter something bespoke. Works with a simple string[] of options.
 */
import React, { useMemo, useState } from 'react';
import {
  FlatList, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';

interface Props {
  label?: string;
  value?: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
  accent?: string;
  allowFreeText?: boolean; // show a free-text box when "Other" is picked
}

export default function Dropdown({ label, value, options, onChange, placeholder = 'Select…', accent = '#0D9488', allowFreeText = true }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const isOther = allowFreeText && value != null && value !== '' && !options.includes(value);
  const [customMode, setCustomMode] = useState(false);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? options.filter((o) => o.toLowerCase().includes(s)) : options;
  }, [q, options]);

  const pick = (o: string) => {
    setOpen(false);
    setQ('');
    if (o === 'Other') { setCustomMode(true); onChange(''); }
    else { setCustomMode(false); onChange(o); }
  };

  return (
    <View style={{ marginBottom: 12 }}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity style={styles.btn} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={[styles.btnText, !value && styles.placeholder]} numberOfLines={1}>{value || placeholder}</Text>
        <Text style={styles.caret}>▾</Text>
      </TouchableOpacity>

      {(customMode || isOther) && (
        <TextInput
          style={styles.freeText}
          value={value}
          onChangeText={onChange}
          placeholder="Type your own…"
          placeholderTextColor="#9CA3AF"
        />
      )}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet}>
            {!!label && <Text style={styles.sheetTitle}>{label}</Text>}
            <TextInput
              style={styles.search}
              value={q}
              onChangeText={setQ}
              placeholder="Search…"
              placeholderTextColor="#9CA3AF"
              autoFocus
            />
            <FlatList
              data={filtered}
              keyExtractor={(o, i) => o + i}
              style={{ maxHeight: 380 }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.row} onPress={() => pick(item)}>
                  <Text style={[styles.rowText, item === value && { color: accent, fontWeight: '800' }]}>{item}</Text>
                  {item === value && <Text style={{ color: accent }}>✓</Text>}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.empty}>No match. Pick “Other” to type your own.</Text>}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 6 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#fff' },
  btnText: { fontSize: 15, color: '#111827', flex: 1 },
  placeholder: { color: '#9CA3AF' },
  caret: { color: '#6B7280', fontSize: 14, marginLeft: 8 },
  freeText: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: '#111827', backgroundColor: '#fff', marginTop: 8 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  sheetTitle: { fontSize: 16, fontWeight: '900', color: '#111827', marginBottom: 12 },
  search: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#111827', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  rowText: { fontSize: 15, color: '#374151' },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 16, fontSize: 13 },
});
