/**
 * HelpVideoPlayerScreen — embeds a single YouTube video via WebView (already
 * a dependency, see PaystackWebView.tsx for the existing usage pattern) so
 * playback stays inside the app instead of kicking the viewer out to the
 * YouTube app/browser.
 *
 * Always fetches the full video by id (rather than trusting title/videoId
 * passed from the list) — same "fetch full detail by the one thing in the
 * URL" reasoning as BlogPostScreen fetching by slug, so a bare
 * /HelpVideos/<id> deep link (e.g. shared in a WhatsApp message) works too,
 * not just in-app navigation from HelpVideosScreen.
 */
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { getHelpVideo, youtubeEmbedUrl, recordHelpVideoView, HelpVideo } from '../api/helpVideos';

const ACCENT = '#2563EB';

// Web-only style (border: 'none' isn't a valid RN ViewStyle property, so this
// stays outside StyleSheet.create's type checking — same reasoning as the
// `as any` cast on the iframe's style prop below).
const iframeStyle = { width: '100%', height: '100%', border: 'none', backgroundColor: '#000' };

interface RouteParams { id: string; title?: string }

export default function HelpVideoPlayerScreen({ route, navigation }: any) {
  const { id, title: initialTitle } = route.params as RouteParams;
  const [video, setVideo]     = useState<HelpVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const recorded = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getHelpVideo(id).then((v) => {
      if (cancelled) return;
      if (v) {
        setVideo(v);
        if (!recorded.current) { recorded.current = true; recordHelpVideoView(id); }
      } else {
        setNotFound(true);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [id]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{video?.title || initialTitle || 'Video'}</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={ACCENT} size="large" /></View>
      ) : notFound || !video ? (
        <View style={styles.center}>
          <Ionicons name="videocam-off-outline" size={40} color="#CBD5E1" />
          <Text style={styles.notFoundText}>This video isn't available anymore.</Text>
        </View>
      ) : (
        <>
          <View style={styles.playerWrap}>
            {Platform.OS === 'web' ? (
              // react-native-webview doesn't support web (throws "does not
              // support this platform") — same fork PaystackWebView.tsx uses
              // for its web checkout: a plain <iframe> instead.
              // @ts-ignore — <iframe> is a valid web DOM element, RN's types just don't know it
              <iframe
                src={youtubeEmbedUrl(video.youtubeVideoId)}
                title={video.title}
                style={iframeStyle as any}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <WebView
                source={{ uri: youtubeEmbedUrl(video.youtubeVideoId) }}
                style={styles.webview}
                allowsFullscreenVideo
                mediaPlaybackRequiresUserAction={Platform.OS === 'ios'}
                javaScriptEnabled
                domStorageEnabled
              />
            )}
          </View>
          {!!video.description && (
            <Text style={styles.description}>{video.description}</Text>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    paddingHorizontal: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  backBtn: { padding: 6 },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#0F172A', marginLeft: 4, marginRight: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  notFoundText: { color: '#94A3B8', fontSize: 14, textAlign: 'center' },
  // 16:9 aspect ratio for the embedded player.
  playerWrap: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
  webview: { flex: 1, backgroundColor: '#000' },
  description: { fontSize: 14, color: '#374151', lineHeight: 20, padding: 16 },
});
