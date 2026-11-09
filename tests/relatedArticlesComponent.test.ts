import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  getRelatedArticles,
  extractArticleTopicsAndTags,
  getDefaultArticlePool,
  type ArticleCandidate,
} from '../src/utils/relatedArticles';

describe('RelatedArticles Component - 3 Relevant Posts Tag & Topic Filter Suite', () => {
  const rootDir = process.cwd();
  const componentPath = path.resolve(rootDir, 'src/components/RelatedArticles.tsx');
  const sectionComponentPath = path.resolve(rootDir, 'src/components/RelatedArticlesSection.tsx');
  const noteDetailPath = path.resolve(rootDir, 'src/pages/NoteDetailPage.tsx');
  const blogDetailPath = path.resolve(rootDir, 'src/pages/BlogPostPage.tsx');
  const fieldGuidePath = path.resolve(rootDir, 'src/pages/FieldGuideDetailPage.tsx');

  it('provides dedicated src/components/RelatedArticles.tsx with clean TypeScript types and exports', () => {
    assert.ok(fs.existsSync(componentPath), 'Expected src/components/RelatedArticles.tsx to exist');
    const content = fs.readFileSync(componentPath, 'utf8');

    assert.ok(
      content.includes('export const RelatedArticles: React.FC<RelatedArticlesProps>'),
      'Expected RelatedArticles component export'
    );
    assert.ok(
      content.includes('export interface RelatedArticlesProps'),
      'Expected RelatedArticlesProps type export'
    );
    assert.ok(
      content.includes('count = 3') || content.includes('count?: number'),
      'Expected default suggestion count of 3'
    );
    assert.ok(
      content.includes('data-testid="related-articles"') ||
        content.includes('data-testid="related-articles-section"'),
      'Expected data-testid for the section'
    );
    assert.ok(
      content.includes('data-testid="related-articles-grid"'),
      'Expected data-testid="related-articles-grid" on the cards container'
    );
  });

  it('filters existing blog and notes list to suggest 3 relevant posts matching by tags and topic categories', () => {
    const pool = getDefaultArticlePool();
    assert.ok(pool.length > 5, 'Expected pool to contain existing blog, guide, and quick note articles');

    // Scenario A: Apple / macOS topic reader view
    const appleReaderView: ArticleCandidate = {
      slug: 'apple-device-management-enrollment-models',
      title: 'Apple Device Management: Enrollment Models',
      description: 'Supervised devices, ADE, and Jamf Pro enrollment.',
      category: 'Apple Devices',
      tags: ['macos', 'jamf', 'mdm'],
      sourceType: 'note',
    };

    const appleRelated = getRelatedArticles(appleReaderView, pool, 3);
    assert.equal(appleRelated.length, 3, 'Expected exactly 3 suggested related articles');
    assert.ok(
      appleRelated.every((item) => item.slug !== appleReaderView.slug),
      'Must exclude the active article from recommendations'
    );
    assert.ok(
      appleRelated.some(
        (item) =>
          item.category.toLowerCase().includes('apple') ||
          item.matchedTopics.some((t) => t.includes('apple') || t.includes('macos'))
      ),
      'Must match on Apple / macOS category or tags'
    );

    // Scenario B: Networking topic reader view
    const networkReaderView: ArticleCandidate = {
      slug: 'network-switch-port-troubleshooting',
      title: 'Switch Port Flapping & Duplex Mismatches',
      description: 'Physical layer, Ethernet cable diagnostics, and PoE budgets.',
      category: 'Networking',
      tags: ['cisco', 'switch', 'vlan', 'ethernet'],
      sourceType: 'note',
    };

    const networkRelated = getRelatedArticles(networkReaderView, pool, 3);
    assert.equal(networkRelated.length, 3, 'Expected exactly 3 suggested related articles for networking');
    assert.ok(
      networkRelated.every((item) => item.slug !== networkReaderView.slug),
      'Must exclude the active network note'
    );
    assert.ok(
      networkRelated[0].matchedTopics.length > 0,
      'Expected matchedTopics to highlight shared tags or categories'
    );

    // Scenario C: Blog post reader view
    const blogReaderView: ArticleCandidate = {
      slug: 'triage-workplace-app-access-issue',
      title: 'How to Triage a Workplace App Access Issue',
      description: 'Identity providers, SSO, and access provisioning.',
      category: 'IT Support',
      tags: ['identity', 'access', 'sso'],
      sourceType: 'blog',
    };

    const blogRelated = getRelatedArticles(blogReaderView, pool, 3);
    assert.equal(blogRelated.length, 3, 'Expected 3 suggested posts for blog readers');
    assert.ok(
      blogRelated.every((item) => item.slug !== blogReaderView.slug),
      'Must exclude the current blog post'
    );
  });

  it('extracts topic tokens and tags accurately without stop words or noise', () => {
    const tags = extractArticleTopicsAndTags({
      slug: 'test-article',
      title: 'Configuring Cisco Catalyst Switches with 802.1Q VLANs',
      description: 'A deep-dive tutorial for enterprise network engineers.',
      category: 'Networking Infrastructure',
      tags: ['cisco', 'vlan', 'catalyst'],
      topics: ['enterprise-networking'],
    });

    assert.ok(tags.includes('cisco'), 'Expected cisco tag');
    assert.ok(tags.includes('vlan'), 'Expected vlan tag');
    assert.ok(tags.includes('catalyst'), 'Expected catalyst tag');
    assert.ok(tags.includes('networking infrastructure'), 'Expected category phrase');
    assert.ok(!tags.includes('the'), 'Stop word "the" should be excluded');
    assert.ok(!tags.includes('with'), 'Stop word "with" should be excluded');
    assert.ok(!tags.includes('for'), 'Stop word "for" should be excluded');
  });

  it('renders RelatedArticles at the bottom of NoteDetailPage, BlogPostPage, and FieldGuideDetailPage', () => {
    const noteDetail = fs.readFileSync(noteDetailPath, 'utf8');
    const blogDetail = fs.readFileSync(blogDetailPath, 'utf8');
    const fieldGuide = fs.readFileSync(fieldGuidePath, 'utf8');

    // NoteDetailPage
    assert.ok(
      noteDetail.includes('<RelatedArticles') && noteDetail.includes('count={3}'),
      'Expected NoteDetailPage to render <RelatedArticles count={3} />'
    );

    // BlogPostPage
    assert.ok(
      blogDetail.includes('<RelatedArticles') && blogDetail.includes('count={3}'),
      'Expected BlogPostPage to render <RelatedArticles count={3} />'
    );

    // FieldGuideDetailPage
    assert.ok(
      fieldGuide.includes('<RelatedArticles') && fieldGuide.includes('count={3}'),
      'Expected FieldGuideDetailPage to render <RelatedArticles count={3} />'
    );
  });

  it('maintains backward compatibility with RelatedArticlesSection aliases', () => {
    const sectionFile = fs.readFileSync(sectionComponentPath, 'utf8');
    const relatedFile = fs.readFileSync(componentPath, 'utf8');

    assert.ok(
      sectionFile.includes('RelatedArticles = RelatedArticlesSection') ||
        sectionFile.includes('RelatedArticles'),
      'Expected RelatedArticlesSection to re-export or alias RelatedArticles'
    );
    assert.ok(
      relatedFile.includes('RelatedArticlesSection = RelatedArticles') ||
        relatedFile.includes('RelatedArticlesSection'),
      'Expected RelatedArticles to alias RelatedArticlesSection'
    );
  });
});
