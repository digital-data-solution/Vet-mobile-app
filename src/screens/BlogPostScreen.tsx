/**
 * BlogPostScreen — full article view. Renders the admin-authored Markdown
 * body via react-native-markdown-display (pure-JS, no native module — OTA
 * safe). Public, no auth required; reached via BlogScreen or a direct
 * /Blog/<slug> deep link (e.g. from the blog-post marketing email).
 */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { getBlogPost, BlogPost } from '../api/blog';

const ACCENT = '#2563EB';

interface Props { route: { params: { slug: string } }; navigation: any }

function formatDate(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function BlogPostScreen({ route }: Props) {
  const { slug } = route.params;
  const [post, setPost]       = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getBlogPost(slug).then((p) => {
      if (cancelled) return;
      if (p) setPost(p); else setNotFound(true);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={ACCENT} size="large" />
      </View>
    );
  }

  if (notFound || !post) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFoundText}>This article isn't available — it may have been unpublished.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {post.coverImageUrl ? (
        <Image source={{ uri: post.coverImageUrl }} style={styles.cover} resizeMode="cover" />
      ) : null}
      <Text style={styles.title}>{post.title}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>{post.authorName || 'Xpress Vet Team'}</Text>
        <Text style={styles.metaDot}>·</Text>
        <Text style={styles.meta}>{formatDate(post.publishedAt)}</Text>
      </View>
      <Markdown style={markdownStyles}>{post.contentMarkdown}</Markdown>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  notFoundText: { color: '#64748B', fontSize: 15, textAlign: 'center' },
  cover: { width: '100%', height: 220, borderRadius: 16, marginBottom: 20, backgroundColor: '#EFF6FF' },
  title: { fontSize: 26, fontWeight: '800', color: '#0F172A', lineHeight: 32 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 20, gap: 6 },
  meta: { fontSize: 13, color: '#94A3B8', fontWeight: '600' },
  metaDot: { fontSize: 13, color: '#CBD5E1' },
});

// react-native-markdown-display style overrides — keep typography aligned
// with the rest of the app (same accent, same body-copy color as email
// templates' <p>/<h1> rules in email.service.js's layout()).
const markdownStyles = {
  body: { fontSize: 16, lineHeight: 26, color: '#334155' },
  heading1: { fontSize: 22, fontWeight: '800' as const, color: '#0F172A', marginTop: 20, marginBottom: 10 },
  heading2: { fontSize: 19, fontWeight: '800' as const, color: '#0F172A', marginTop: 18, marginBottom: 8 },
  heading3: { fontSize: 17, fontWeight: '700' as const, color: '#0F172A', marginTop: 16, marginBottom: 6 },
  strong: { fontWeight: '700' as const, color: '#0F172A' },
  link: { color: ACCENT },
  blockquote: {
    backgroundColor: '#EFF6FF', borderLeftColor: ACCENT, borderLeftWidth: 4,
    paddingHorizontal: 14, paddingVertical: 10, marginVertical: 12, borderRadius: 6,
  },
  bullet_list: { marginVertical: 8 },
  ordered_list: { marginVertical: 8 },
  code_inline: {
    backgroundColor: '#F1F5F9', color: '#DC2626', paddingHorizontal: 4, borderRadius: 4,
    fontFamily: 'monospace' as const,
  },
  code_block: { backgroundColor: '#0F172A', color: '#F8FAFC', padding: 12, borderRadius: 8 },
  fence: { backgroundColor: '#0F172A', color: '#F8FAFC', padding: 12, borderRadius: 8 },
  image: { borderRadius: 12, marginVertical: 12 },
};
