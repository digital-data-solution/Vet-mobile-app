/**
 * LanguagePicker.tsx — a prominent, self-contained language switcher. Shows the
 * current language and opens a sheet to change it app-wide (persisted, and
 * Arabic flips to RTL). Drop <LanguagePicker /> anywhere (e.g. Profile).
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LANGUAGES, setLanguage, currentLanguage } from '../i18n';

export default function LanguagePicker() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const active = currentLanguage();
  const activeLabel = LANGUAGES.find((l) => l.code === active)?.label || 'English';

  const choose = async (code: string) => { await setLanguage(code); setOpen(false); };

  return (
    <>
      <Pressable style={styles.row} onPress={() => setOpen(true)}>
        <Text style={styles.emoji}>🌐</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{t('common.language')}</Text>
          <Text style={styles.value}>{activeLabel}</Text>
        </View>
        <Text style={styles.chev}>›</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{t('common.language')}</Text>
            {LANGUAGES.map((l) => (
              <TouchableOpacity key={l.code} style={styles.opt} onPress={() => choose(l.code)}>
                <Text style={[styles.optText, l.code === active && styles.optOn]}>{l.label}</Text>
                {l.code === active && <Text style={styles.check}>✓</Text>}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.cancel} onPress={() => setOpen(false)}>
              <Text style={styles.cancelText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4 },
  emoji: { fontSize: 20, marginRight: 12 },
  label: { fontSize: 15, fontWeight: '600', color: '#111827' },
  value: { fontSize: 13, color: '#6B7280', marginTop: 1 },
  chev: { fontSize: 22, color: '#9CA3AF', fontWeight: '800' },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 34 },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: '#111827', marginBottom: 12 },
  opt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  optText: { fontSize: 16, color: '#374151', fontWeight: '600' },
  optOn: { color: '#4338CA', fontWeight: '800' },
  check: { color: '#4338CA', fontWeight: '900', fontSize: 16 },
  cancel: { padding: 14, alignItems: 'center', marginTop: 6 },
  cancelText: { color: '#6B7280', fontWeight: '700' },
});
