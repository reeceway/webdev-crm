const express = require('express');
const router = express.Router();
const https = require('https');
const http = require('http');
const { URL } = require('url');

// Website SEO Audit endpoint
router.post('/audit', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const auditResults = await performAudit(url);
    res.json(auditResults);
  } catch (error) {
    console.error('Audit error:', error);
    res.status(500).json({ error: 'Failed to audit website', details: error.message });
  }
});

async function performAudit(websiteUrl) {
  const results = {
    url: websiteUrl,
    timestamp: new Date().toISOString(),
    score: 0,
    maxScore: 100,
    checks: [],
    recommendations: [],
    technicalDetails: {},
  };

  try {
    // Normalize URL
    let url = websiteUrl;
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    
    const parsedUrl = new URL(url);
    results.domain = parsedUrl.hostname;

    // Perform checks
    const [
      httpsCheck,
      responseCheck,
      htmlAnalysis,
    ] = await Promise.all([
      checkHTTPS(url),
      checkResponse(url),
      fetchAndAnalyzeHTML(url),
    ]);

    // HTTPS Check (15 points)
    results.checks.push({
      name: 'HTTPS Security',
      category: 'Security',
      passed: httpsCheck.secure,
      score: httpsCheck.secure ? 15 : 0,
      maxScore: 15,
      impact: 'Critical',
      details: httpsCheck.secure 
        ? 'Site uses HTTPS encryption' 
        : 'Site does not use HTTPS - critical for rankings and user trust',
      recommendation: httpsCheck.secure ? null : 'Install SSL certificate immediately. Google requires HTTPS for ranking.',
    });

    // Response Time Check (10 points)
    const responseTimeGood = responseCheck.responseTime < 1000;
    const responseTimeOk = responseCheck.responseTime < 2000;
    results.checks.push({
      name: 'Server Response Time (TTFB)',
      category: 'Performance',
      passed: responseTimeGood,
      score: responseTimeGood ? 10 : responseTimeOk ? 5 : 0,
      maxScore: 10,
      impact: 'High',
      details: `Server responded in ${responseCheck.responseTime}ms`,
      recommendation: responseTimeGood ? null : 'Optimize server response time. Consider upgrading hosting or using a CDN.',
    });
    results.technicalDetails.responseTime = responseCheck.responseTime;
    results.technicalDetails.statusCode = responseCheck.statusCode;

    // HTML Analysis checks
    if (htmlAnalysis.success) {
      const html = htmlAnalysis.html;
      
      // Title Tag (10 points)
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      const hasTitle = titleMatch && titleMatch[1].trim().length > 0;
      const titleLength = titleMatch ? titleMatch[1].trim().length : 0;
      const titleOptimal = titleLength >= 30 && titleLength <= 60;
      results.checks.push({
        name: 'Title Tag',
        category: 'On-Page SEO',
        passed: hasTitle && titleOptimal,
        score: hasTitle ? (titleOptimal ? 10 : 5) : 0,
        maxScore: 10,
        impact: 'High',
        details: hasTitle 
          ? `Title: "${titleMatch[1].trim()}" (${titleLength} chars)` 
          : 'No title tag found',
        recommendation: !hasTitle 
          ? 'Add a descriptive title tag (30-60 characters)' 
          : !titleOptimal 
            ? `Title is ${titleLength < 30 ? 'too short' : 'too long'}. Optimal length is 30-60 characters.`
            : null,
      });
      results.technicalDetails.title = titleMatch ? titleMatch[1].trim() : null;

      // Meta Description (10 points)
      const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
                           html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
      const hasMetaDesc = metaDescMatch && metaDescMatch[1].trim().length > 0;
      const metaDescLength = metaDescMatch ? metaDescMatch[1].trim().length : 0;
      const metaDescOptimal = metaDescLength >= 120 && metaDescLength <= 160;
      results.checks.push({
        name: 'Meta Description',
        category: 'On-Page SEO',
        passed: hasMetaDesc && metaDescOptimal,
        score: hasMetaDesc ? (metaDescOptimal ? 10 : 5) : 0,
        maxScore: 10,
        impact: 'Medium',
        details: hasMetaDesc 
          ? `Description: "${metaDescMatch[1].trim().substring(0, 80)}..." (${metaDescLength} chars)` 
          : 'No meta description found',
        recommendation: !hasMetaDesc 
          ? 'Add a meta description (120-160 characters) for better SERP display' 
          : !metaDescOptimal 
            ? `Description is ${metaDescLength < 120 ? 'too short' : 'too long'}. Optimal length is 120-160 characters.`
            : null,
      });
      results.technicalDetails.metaDescription = metaDescMatch ? metaDescMatch[1].trim() : null;

      // Viewport Meta (10 points - Mobile Friendly)
      const hasViewport = /<meta[^>]*name=["']viewport["']/i.test(html);
      results.checks.push({
        name: 'Mobile Viewport',
        category: 'Mobile',
        passed: hasViewport,
        score: hasViewport ? 10 : 0,
        maxScore: 10,
        impact: 'Critical',
        details: hasViewport ? 'Viewport meta tag present' : 'No viewport meta tag found',
        recommendation: hasViewport ? null : 'Add viewport meta tag for mobile-first indexing: <meta name="viewport" content="width=device-width, initial-scale=1">',
      });

      // H1 Tag (8 points)
      const h1Matches = html.match(/<h1[^>]*>([^<]*)<\/h1>/gi) || [];
      const hasH1 = h1Matches.length > 0;
      const singleH1 = h1Matches.length === 1;
      results.checks.push({
        name: 'H1 Heading',
        category: 'On-Page SEO',
        passed: hasH1 && singleH1,
        score: hasH1 ? (singleH1 ? 8 : 4) : 0,
        maxScore: 8,
        impact: 'Medium',
        details: hasH1 
          ? `Found ${h1Matches.length} H1 tag(s)` 
          : 'No H1 tag found',
        recommendation: !hasH1 
          ? 'Add a single H1 tag with your primary keyword' 
          : !singleH1 
            ? 'Use only one H1 tag per page for better SEO structure'
            : null,
      });
      results.technicalDetails.h1Count = h1Matches.length;

      // Image Alt Tags (7 points)
      const images = html.match(/<img[^>]*>/gi) || [];
      const imagesWithAlt = images.filter(img => /alt=["'][^"']+["']/i.test(img));
      const altRatio = images.length > 0 ? imagesWithAlt.length / images.length : 1;
      results.checks.push({
        name: 'Image Alt Tags',
        category: 'Accessibility & SEO',
        passed: altRatio >= 0.9,
        score: Math.round(altRatio * 7),
        maxScore: 7,
        impact: 'Medium',
        details: `${imagesWithAlt.length}/${images.length} images have alt tags (${Math.round(altRatio * 100)}%)`,
        recommendation: altRatio < 0.9 
          ? `Add descriptive alt text to ${images.length - imagesWithAlt.length} images for accessibility and image SEO`
          : null,
      });
      results.technicalDetails.images = { total: images.length, withAlt: imagesWithAlt.length };

      // Schema Markup (7 points)
      const hasSchema = /application\/ld\+json/i.test(html) || /itemscope/i.test(html);
      results.checks.push({
        name: 'Schema Markup',
        category: 'Structured Data',
        passed: hasSchema,
        score: hasSchema ? 7 : 0,
        maxScore: 7,
        impact: 'Medium',
        details: hasSchema ? 'Schema markup detected' : 'No schema markup found',
        recommendation: hasSchema ? null : 'Add LocalBusiness schema markup for rich snippets in search results',
      });

      // Canonical Tag (5 points)
      const hasCanonical = /<link[^>]*rel=["']canonical["']/i.test(html);
      results.checks.push({
        name: 'Canonical Tag',
        category: 'Technical SEO',
        passed: hasCanonical,
        score: hasCanonical ? 5 : 0,
        maxScore: 5,
        impact: 'Low',
        details: hasCanonical ? 'Canonical tag present' : 'No canonical tag found',
        recommendation: hasCanonical ? null : 'Add canonical tag to prevent duplicate content issues',
      });

      // Open Graph Tags (5 points)
      const hasOG = /<meta[^>]*property=["']og:/i.test(html);
      results.checks.push({
        name: 'Open Graph Tags',
        category: 'Social',
        passed: hasOG,
        score: hasOG ? 5 : 0,
        maxScore: 5,
        impact: 'Low',
        details: hasOG ? 'Open Graph tags present' : 'No Open Graph tags found',
        recommendation: hasOG ? null : 'Add Open Graph meta tags for better social media sharing',
      });

      // Internal/External Links (5 points)
      const links = html.match(/<a[^>]*href=["']([^"']*)["']/gi) || [];
      const internalLinks = links.filter(l => !l.includes('http') || l.includes(parsedUrl.hostname));
      results.checks.push({
        name: 'Link Structure',
        category: 'On-Page SEO',
        passed: links.length > 5,
        score: links.length > 5 ? 5 : Math.min(links.length, 5),
        maxScore: 5,
        impact: 'Low',
        details: `Found ${links.length} links (${internalLinks.length} internal)`,
        recommendation: links.length < 5 ? 'Add more internal links to improve site navigation and link equity' : null,
      });
      results.technicalDetails.links = { total: links.length, internal: internalLinks.length };

      // Check for common issues
      const hasFlash = /\.swf|flash/i.test(html);
      const hasFrames = /<frame|<iframe/i.test(html);
      const hasMixedContent = httpsCheck.secure && /http:\/\/[^"']*\.(jpg|png|gif|css|js)/i.test(html);

      if (hasFlash) {
        results.recommendations.push({
          priority: 'High',
          issue: 'Flash Content Detected',
          recommendation: 'Remove Flash content - not supported by modern browsers and not indexed by search engines',
        });
      }

      if (hasMixedContent) {
        results.recommendations.push({
          priority: 'Medium', 
          issue: 'Mixed Content',
          recommendation: 'Update all resources to use HTTPS to avoid mixed content warnings',
        });
      }
    } else {
      results.checks.push({
        name: 'Page Accessible',
        category: 'Availability',
        passed: false,
        score: 0,
        maxScore: 50,
        impact: 'Critical',
        details: `Could not fetch page: ${htmlAnalysis.error}`,
        recommendation: 'Ensure website is accessible and responding properly',
      });
    }

    // Calculate total score
    results.score = results.checks.reduce((sum, check) => sum + check.score, 0);
    results.passedChecks = results.checks.filter(c => c.passed).length;
    results.totalChecks = results.checks.length;
    results.percentage = Math.round((results.score / results.maxScore) * 100);

    // Generate summary
    if (results.percentage >= 90) {
      results.summary = 'Excellent - Site is well-optimized for search engines';
      results.grade = 'A';
    } else if (results.percentage >= 70) {
      results.summary = 'Good - Minor improvements recommended';
      results.grade = 'B';
    } else if (results.percentage >= 50) {
      results.summary = 'Fair - Several issues need attention';
      results.grade = 'C';
    } else {
      results.summary = 'Poor - Significant SEO improvements needed';
      results.grade = 'D';
    }

    // Sort recommendations by priority
    const priorityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    results.recommendations = results.checks
      .filter(c => c.recommendation)
      .map(c => ({
        priority: c.impact,
        category: c.category,
        issue: c.name,
        recommendation: c.recommendation,
      }))
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return results;
  } catch (error) {
    results.error = error.message;
    return results;
  }
}

function checkHTTPS(url) {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(url);
      resolve({ secure: parsedUrl.protocol === 'https:' });
    } catch (e) {
      resolve({ secure: false });
    }
  });
}

function checkResponse(url) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.get(url, { 
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WebDevCRM-SEOBot/1.0)',
      },
    }, (res) => {
      resolve({
        statusCode: res.statusCode,
        responseTime: Date.now() - startTime,
      });
      res.destroy();
    });

    req.on('error', () => {
      resolve({ statusCode: 0, responseTime: Date.now() - startTime });
    });

    req.on('timeout', () => {
      resolve({ statusCode: 0, responseTime: 10000 });
      req.destroy();
    });
  });
}

function fetchAndAnalyzeHTML(url) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WebDevCRM-SEOBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    }, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) {
          const parsedUrl = new URL(url);
          redirectUrl = `${parsedUrl.protocol}//${parsedUrl.host}${redirectUrl}`;
        }
        res.destroy();
        fetchAndAnalyzeHTML(redirectUrl).then(resolve);
        return;
      }

      let html = '';
      res.on('data', (chunk) => {
        html += chunk;
        if (html.length > 500000) { // Limit to 500KB
          res.destroy();
        }
      });
      res.on('end', () => {
        resolve({ success: true, html });
      });
    });

    req.on('error', (e) => {
      resolve({ success: false, error: e.message });
    });

    req.on('timeout', () => {
      resolve({ success: false, error: 'Request timeout' });
      req.destroy();
    });
  });
}

module.exports = router;
