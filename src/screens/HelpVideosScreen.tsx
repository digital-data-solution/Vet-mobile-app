/**
 * HelpVideosScreen — public "How to Use Xpress Vet" tutorial list. No auth
 * required, same as BlogScreen. Videos are grouped into sections by
 * `category` (admin-set free text) and each card opens HelpVideoPlayer,
 * which embeds the actual YouTube player via WebView.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Image, RefreshControl,
  SectionList, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { listHelpVideos, groupByCategory, youtubeThumbnailUrl, HelpVideo } from '../api/helpVideos';

const ACCENT = '#2563EB';

interface Props { navigation: any }

export default function HelpVideosScreen({ navigation }: Props) {
  const [sections, setSections]     = useState<{ title: string; data: HelpVideo[] }[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const videos = await listHelpVideos();
    setSections(groupByCategory(videos));
  }, []);

  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Help & Tutorials</Text>
            <Text style={styles.headerSub}>Short videos walking through how to use Xpress Vet.</Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: 60 }} color={ACCENT} size="large" />
          ) : (
            <View style={styles.empty}>
              <Ionicons name="videocam-outline" size={40} color="#CBD5E1" />
              <Text style={styles.emptyText}>No tutorials yet — check back soon.</Text>
            </View>
          )
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('HelpVideoPlayer', { id: item._id, title: item.title })}
          >
            <View style={styles.thumbWrap}>
              <Image source={{ uri: youtubeThumbnailUrl(item.youtubeVideoId) }} style={styles.thumb} resizeMode="cover" />
              <View style={styles.playBadge}>
                <Ionicons name="play" size={18} color="#fff" />
              </View>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              {!!item.description && <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>}
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
  sectionHeader: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginTop: 18, marginBottom: 10 },
  empty: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyText: { color: '#94A3B8', fontSize: 14 },
  card: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, marginBottom: 12, overflow: 'hidden',
    shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  thumbWrap: { width: 120, height: 90, backgroundColor: '#EFF6FF' },
  thumb: { width: '100%', height: '100%' },
  playBadge: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.25)',
  },
  cardBody: { flex: 1, padding: 12, justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', lineHeight: 19 },
  cardDesc: { fontSize: 12, color: '#64748B', marginTop: 4, lineHeight: 17 },
});
