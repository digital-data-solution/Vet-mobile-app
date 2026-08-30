/**
 * BlogScreen — public article list. No auth required, browsable and
 * link-shareable like Market/JobBoard's public content. Cards: cover image,
 * title, excerpt, author/date.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, RefreshControl,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { listBlogPosts, BlogPostSummary } from '../api/blog';

const ACCENT = '#2563EB';

interface Props { navigation: any }

function formatDate(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function BlogScreen({ navigation }: Props) {
  const [items, setItems]           = useState<BlogPostSummary[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const res = await listBlogPosts(1);
    setItems(res.data);
  }, []);

  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Xpress Vet Blog</Text>
            <Text style={styles.headerSub}>Pet care tips, product news and updates from our team.</Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: 60 }} color={ACCENT} size="large" />
          ) : (
            <View style={styles.empty}>
              <Ionicons name="newspaper-outline" size={40} color="#CBD5E1" />
              <Text style={styles.emptyText}>No articles yet — check back soon.</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('BlogPost', { slug: item.slug })}
          >
            {item.coverImageUrl ? (
              <Image source={{ uri: item.coverImageUrl }} style={styles.cardImage} resizeMode="cover" />
            ) : (
              <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                <Ionicons name="paw" size={28} color="#CBD5E1" />
              </View>
            )}
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.cardExcerpt} numberOfLines={2}>{item.excerpt}</Text>
              <View style={styles.cardMetaRow}>
                <Text style={styles.cardMeta}>{item.authorName || 'Xpress Vet Team'}</Text>
                <Text style={styles.cardMetaDot}>·</Text>
                <Text style={styles.cardMeta}>{formatDate(item.publishedAt)}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  listContent: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 18 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  headerSub: { fontSize: 14, color: '#64748B', marginTop: 4 },
  empty: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyText: { color: '#94A3B8', fontSize: 14 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, marginBottom: 16, overflow: 'hidden',
    shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardImage: { width: '100%', height: 170, backgroundColor: '#EFF6FF' },
  cardImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: 16 },
  cardTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A', lineHeight: 22 },
  cardExcerpt: { fontSize: 14, color: '#475569', marginTop: 6, lineHeight: 20 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 6 },
  cardMeta: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  cardMetaDot: { fontSize: 12, color: '#CBD5E1' },
});
