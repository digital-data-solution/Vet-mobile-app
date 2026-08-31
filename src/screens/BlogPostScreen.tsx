/**
 * BlogPostScreen — full article view. Renders the admin-authored Markdown
 * body via react-native-markdown-display (pure-JS, no native module — OTA
 * safe). Public, no auth required; reached via BlogScreen or a direct
 * /Blog/<slug> deep link (e.g. from the blog-post marketing email).
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Image, Platform, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { getBlogPost, listBlogPosts, blogShareUrl, readingTime, BlogPost, BlogPostSummary } from '../api/blog';
import { showAlert } from '../utils/alert';

const ACCENT = '#2563EB';

interface Props { route: { params: { slug: string } }; navigation: any }

function formatDate(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function BlogPostScreen({ route, navigation }: Props) {
  const { slug } = route.params;
  const [post, setPost]         = useState<BlogPost | null>(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [related, setRelated]   = useState<BlogPostSummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setRelated([]);
    getBlogPost(slug).then((p) => {
      if (cancelled) return;
      if (p) setPost(p); else setNotFound(true);
      setLoading(false);

      // Related posts — same first tag, excluding this one. Best-effort,
      // never blocks the article itself from showing.
      const tag = p?.tags?.[0];
      if (tag) {
        listBlogPosts(1, tag).then((res) => {
          if (cancelled) return;
          setRelated(res.data.filter((r) => r.slug !== slug).slice(0, 4));
        });
      }
    });
    return () => { cancelled = true; };
  }, [slug]);

  const share = async () => {
    if (!post) return;
    const url = blogShareUrl(post.slug);
    // Teaser (the excerpt) before the link, not just a bare title — gives
    // whoever receives it a reason to actually tap through.
    const msg = `📰 ${post.title}\n\n${post.excerpt}\n\nRead more on Xpress Vet 🐾\n${url}`;
    try {
      if (Platform.OS === 'web') {
        if ((navigator as any).share) await (navigator as any).share({ title: post.title, text: msg, url });
        else { await (navigator as any).clipboard.writeText(url); showAlert('Link Copied!', 'Share it anywhere.'); }
      } else {
        // message already has the link embedded — passing `url` too makes
        // RN's Share module attach it a second time on iOS (WhatsApp then
        // shows the URL twice in one message).
        await Share.share({ message: msg });
      }
    } catch {}
  };

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
        <Text style={styles.metaDot}>·</Text>
        <Text style={styles.meta}>{readingTime(post.contentMarkdown)} min read</Text>
        <TouchableOpacity style={styles.shareBtn} onPress={share} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="share-social-outline" size={18} color={ACCENT} />
          <Text style={styles.shareBtnText}>Share</Text>
        </TouchableOpacity>
      </View>
      <Markdown style={markdownStyles}>{post.contentMarkdown}</Markdown>

      {related.length > 0 && (
        <View style={styles.relatedSection}>
          <Text style={styles.relatedHeading}>More like this</Text>
          {related.map((r) => (
            <TouchableOpacity
              key={r._id}
              style={styles.relatedCard}
              activeOpacity={0.85}
              onPress={() => navigation.push('BlogPost', { slug: r.slug })}
            >
              {r.coverImageUrl ? (
                <Image source={{ uri: r.coverImageUrl }} style={styles.relatedImage} resizeMode="cover" />
              ) : (
                <View style={[styles.relatedImage, styles.relatedImagePlaceholder]}>
                  <Ionicons name="paw" size={20} color="#CBD5E1" />
                </View>
              )}
              <View style={styles.relatedBody}>
                <Text style={styles.relatedTitle} numberOfLines={2}>{r.title}</Text>
                <Text style={styles.relatedExcerpt} numberOfLines={2}>{r.excerpt}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
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
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 20, gap: 6, flexWrap: 'wrap' },
  meta: { fontSize: 13, color: '#94A3B8', fontWeight: '600' },
  metaDot: { fontSize: 13, color: '#CBD5E1' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' },
  shareBtnText: { fontSize: 13, color: ACCENT, fontWeight: '700' },
  relatedSection: { marginTop: 32, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 20 },
  relatedHeading: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  relatedCard: {
    flexDirection: 'row', gap: 12, marginBottom: 12, backgroundColor: '#F8FAFC',
    borderRadius: 12, overflow: 'hidden', alignItems: 'center',
  },
  relatedImage: { width: 72, height: 72, backgroundColor: '#EFF6FF' },
  relatedImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  relatedBody: { flex: 1, paddingVertical: 8, paddingRight: 12 },
  relatedTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', lineHeight: 18 },
  relatedExcerpt: { fontSize: 12, color: '#64748B', marginTop: 3, lineHeight: 16 },
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
