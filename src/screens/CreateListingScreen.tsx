/**
 * CreateListingScreen — create or edit a marketplace listing (pet or product).
 * Photos upload to the generic asset endpoint (no plan cap, not tied to the
 * user's profile gallery). Publishing requires accepting the Seller Agreement.
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import {
  createListing, updateListing, uploadListingImage, getMarketMeta,
  Listing, ListingImage, ListingKind, MarketMeta,
} from '../api/market';
import { getUserLocation } from '../utils/location';
import { showAlert } from '../utils/alert';

const ACCENT = '#0F9D58';
const MAX_IMAGES = 6;

interface Props { navigation: any; route: any }

export default function CreateListingScreen({ navigation, route }: Props) {
  const edit: Listing | undefined = route.params?.edit;
  const isEdit = !!edit;

  const [meta, setMeta]       = useState<MarketMeta | null>(null);
  const [kind, setKind]       = useState<ListingKind>(edit?.kind || (route.params?.kind === 'product' ? 'product' : 'pet'));
  const [title, setTitle]     = useState(edit?.title || '');
  const [price, setPrice]     = useState(edit?.price ? String(edit.price) : '');
  const [negotiable, setNegotiable] = useState(!!edit?.negotiable);
  const [category, setCategory] = useState(edit?.category || '');
  const [description, setDescription] = useState(edit?.description || '');
  const [images, setImages]   = useState<ListingImage[]>(edit?.images || []);
  const [uploading, setUploading] = useState(false);

  // pet fields
  const [species, setSpecies] = useState(edit?.species || '');
  const [breed, setBreed]     = useState(edit?.breed || '');
  const [ageText, setAgeText] = useState(edit?.ageText || '');
  const [sex, setSex]         = useState<'male' | 'female' | 'unknown' | ''>((edit?.sex as any) || '');
  const [healthInfo, setHealthInfo] = useState(edit?.healthInfo || '');

  // product fields
  const [condition, setCondition] = useState<'new' | 'used' | ''>((edit?.condition as any) || '');
  const [quantity, setQuantity]   = useState(edit?.quantity ? String(edit.quantity) : '1');

  // contact + location
  const [contactPhone, setContactPhone]       = useState(edit?.contactPhone || '');
  const [contactWhatsapp, setContactWhatsapp] = useState(edit?.contactWhatsapp || '');
  const [city, setCity]       = useState(edit?.city || '');
  const [address, setAddress] = useState(edit?.address || '');
  const [coords, setCoords]   = useState<{ lat: number; lng: number } | null>(null);

  const [agree, setAgree]     = useState(isEdit);
  const [saving, setSaving]   = useState(false);

  useEffect(() => { getMarketMeta().then(setMeta); }, []);
  useEffect(() => {
    if (isEdit) return;
    getUserLocation().then((l: any) => { if (l?.latitude) setCoords({ lat: l.latitude, lng: l.longitude }); }).catch(() => {});
  }, [isEdit]);

  const categories = kind === 'pet' ? (meta?.petCategories || []) : (meta?.productCategories || []);

  const pickImages = async () => {
    if (images.length >= MAX_IMAGES) { showAlert('Limit reached', `Up to ${MAX_IMAGES} photos.`); return; }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') { showAlert('Permission needed', 'Allow photo access to add pictures.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.7,
      selectionLimit: MAX_IMAGES - images.length,
    });
    if (result.canceled) return;
    setUploading(true);
    const uploaded: ListingImage[] = [];
    for (const asset of result.assets) {
      const img = await uploadListingImage(asset.uri);
      if (img) uploaded.push(img);
    }
    setUploading(false);
    if (uploaded.length) setImages((prev) => [...prev, ...uploaded].slice(0, MAX_IMAGES));
    else showAlert('Upload failed', 'Could not upload the photo(s). Check your connection.');
  };

  const removeImage = (i: number) => setImages((prev) => prev.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!agree) { showAlert('Seller Agreement', 'Please accept the Seller Agreement to publish.'); return; }
    if (title.trim().length < 3) { showAlert('Title', 'Enter a clear title.'); return; }
    if (description.trim().length < 10) { showAlert('Description', 'Add a description (at least 10 characters).'); return; }
    const p = parseInt(price, 10);
    if (Number.isNaN(p) || p < 0) { showAlert('Price', 'Enter a valid price.'); return; }

    const body: Record<string, any> = {
      kind, title: title.trim(), description: description.trim(), price: p, negotiable,
      category: category || 'other', images,
      contactPhone, contactWhatsapp, city, address, riskAccepted: true,
    };
    if (kind === 'pet') { Object.assign(body, { species, breed, ageText, sex: sex || undefined, healthInfo }); }
    else { Object.assign(body, { condition: condition || undefined, quantity: parseInt(quantity, 10) || 1 }); }
    if (coords) { body.lat = coords.lat; body.lng = coords.lng; }

    setSaving(true);
    const r = isEdit ? await updateListing(edit!._id, body) : await createListing(body);
    setSaving(false);
    if (r.ok) {
      showAlert(isEdit ? 'Updated' : 'Published!', r.body?.message || 'Your listing is live.');
      navigation.goBack();
    } else {
      showAlert('Could not save', r.body?.message || 'Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        {!isEdit && (
          <View style={styles.kindRow}>
            {(['pet', 'product'] as ListingKind[]).map((k) => (
              <TouchableOpacity key={k} style={[styles.kindBtn, kind === k && styles.kindBtnActive]}
                onPress={() => { setKind(k); setCategory(''); }}>
                <Text style={[styles.kindTxt, kind === k && styles.kindTxtActive]}>{k === 'pet' ? '🐾 A Pet' : '🛒 A Product'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Photos */}
        <Text style={styles.label}>Photos</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {images.map((img, i) => (
            <View key={i} style={styles.thumbBox}>
              <Image source={{ uri: img.url }} style={styles.thumb} />
              <TouchableOpacity style={styles.thumbX} onPress={() => removeImage(i)}>
                <Ionicons name="close" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
          {images.length < MAX_IMAGES && (
            <TouchableOpacity style={styles.addBox} onPress={pickImages} disabled={uploading}>
              {uploading ? <ActivityIndicator color={ACCENT} /> : <><Ionicons name="camera" size={22} color={ACCENT} /><Text style={styles.addTxt}>Add</Text></>}
            </TouchableOpacity>
          )}
        </ScrollView>

        <Field label="Title" value={title} onChangeText={setTitle} placeholder={kind === 'pet' ? 'e.g. German Shepherd puppy' : 'e.g. 20kg dog food'} />

        <Text style={styles.label}>Price (₦)</Text>
        <View style={styles.rowBetween}>
          <TextInput style={[styles.input, { flex: 1 }]} value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="0" placeholderTextColor="#9CA3AF" />
          <View style={styles.negoRow}>
            <Text style={styles.negoTxt}>Negotiable</Text>
            <Switch value={negotiable} onValueChange={setNegotiable} trackColor={{ true: ACCENT }} />
          </View>
        </View>

        {/* Category chips */}
        <Text style={styles.label}>Category</Text>
        <View style={styles.chipsWrap}>
          {categories.map((c) => (
            <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
              <Text style={[styles.chipTxt, category === c && styles.chipTxtActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {kind === 'pet' ? (
          <>
            <Field label="Species" value={species} onChangeText={setSpecies} placeholder="e.g. Dog" />
            <Field label="Breed" value={breed} onChangeText={setBreed} placeholder="e.g. German Shepherd" />
            <Field label="Age" value={ageText} onChangeText={setAgeText} placeholder="e.g. 3 months" />
            <Text style={styles.label}>Sex</Text>
            <View style={styles.chipsWrap}>
              {(['male', 'female', 'unknown'] as const).map((s) => (
                <TouchableOpacity key={s} style={[styles.chip, sex === s && styles.chipActive]} onPress={() => setSex(s)}>
                  <Text style={[styles.chipTxt, sex === s && styles.chipTxtActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Field label="Health & vaccination (recommended)" value={healthInfo} onChangeText={setHealthInfo} placeholder="Vaccinated, dewormed, health status…" multiline />
          </>
        ) : (
          <>
            <Text style={styles.label}>Condition</Text>
            <View style={styles.chipsWrap}>
              {(['new', 'used'] as const).map((c) => (
                <TouchableOpacity key={c} style={[styles.chip, condition === c && styles.chipActive]} onPress={() => setCondition(c)}>
                  <Text style={[styles.chipTxt, condition === c && styles.chipTxtActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Field label="Quantity available" value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
          </>
        )}

        <Field label="Description" value={description} onChangeText={setDescription} placeholder="Describe what you're selling…" multiline />

        <Field label="City / Area" value={city} onChangeText={setCity} placeholder="e.g. Ikeja, Lagos" />
        <Field label="Contact phone" value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" placeholder="Buyers will call this number" />
        <Field label="WhatsApp (optional)" value={contactWhatsapp} onChangeText={setContactWhatsapp} keyboardType="phone-pad" placeholder="If different from phone" />

        {/* Seller agreement */}
        <TouchableOpacity style={styles.agreeRow} onPress={() => setAgree((a) => !a)}>
          <Ionicons name={agree ? 'checkbox' : 'square-outline'} size={22} color={agree ? ACCENT : '#9CA3AF'} />
          <Text style={styles.agreeTxt}>
            I confirm this listing is genuine and legal. I understand Xpress Vet only connects buyers and sellers and is not responsible for the transaction. No prohibited or endangered animals/items.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.submit, (saving || uploading) && { opacity: 0.6 }]} disabled={saving || uploading} onPress={submit}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitTxt}>{isEdit ? 'Save changes' : 'Publish listing'}</Text>}
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
  kindRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  kindBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  kindBtnActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  kindTxt: { fontWeight: '800', color: '#6B7280' },
  kindTxtActive: { color: '#fff' },

  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: '#111827' },

  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  negoRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  negoTxt: { fontSize: 12, color: '#6B7280', fontWeight: '600' },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  chipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  chipTxt: { fontSize: 13, color: '#6B7280', fontWeight: '600', textTransform: 'capitalize' },
  chipTxtActive: { color: '#fff' },

  thumbBox: { position: 'relative', marginRight: 8 },
  thumb: { width: 84, height: 84, borderRadius: 10, backgroundColor: '#E5E7EB' },
  thumbX: { position: 'absolute', top: -6, right: -6, backgroundColor: '#DC2626', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  addBox: { width: 84, height: 84, borderRadius: 10, borderWidth: 1.5, borderColor: ACCENT, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  addTxt: { fontSize: 11, color: ACCENT, fontWeight: '700', marginTop: 2 },

  agreeRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 20, backgroundColor: '#fff', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  agreeTxt: { flex: 1, fontSize: 12, color: '#4B5563', lineHeight: 18 },

  submit: { backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
  submitTxt: { color: '#fff', fontWeight: '900', fontSize: 16 },
});
