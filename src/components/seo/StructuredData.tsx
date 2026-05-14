const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://lawtiphub.com";
const SITE_NAME = "法 BLOG";
const SITE_DESC = "법률, 기술, 비즈니스에 관한 깊이 있는 분석과 인사이트를 제공하는 블로그";

// Organization: 사이트 정체성, 지식 패널 노출 (GEO/AEO 강화)
export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    alternateName: ["법 BLOG", "Lawtip Hub", "법블로그"],
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/icon.png`,
      width: 512,
      height: 512,
    },
    image: `${SITE_URL}/opengraph-image.jpg`,
    description: SITE_DESC,
    inLanguage: "ko-KR",
    knowsAbout: [
      "법률",
      "생활법률",
      "판례 분석",
      "정책",
      "사회 이슈",
      "논란 분석",
      "한국 법률",
      "소비자 권리",
      "노동법",
    ],
    areaServed: {
      "@type": "Country",
      name: "대한민국",
    },
    publishingPrinciples: `${SITE_URL}/about`,
    sameAs: [],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// WebSite + SearchAction: Google 검색창에 사이트 내 검색 기능 노출
export function WebSiteSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Article: 뉴스/블로그 리치 결과
interface ArticleSchemaProps {
  title: string;
  description?: string;
  author?: string;
  authorId?: string;
  datePublished?: string;
  dateModified?: string;
  url: string;
  image?: string;
  tags?: string[];
  wordCount?: number;
  articleBody?: string;
}

export function ArticleSchema({
  title,
  description,
  author,
  authorId,
  datePublished,
  dateModified,
  url,
  image,
  tags = [],
  wordCount,
  articleBody,
}: ArticleSchemaProps) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title.slice(0, 110),
    ...(description && { description }),
    ...(wordCount && { wordCount }),
    ...(articleBody && { articleBody: articleBody.slice(0, 500) }),
    author: {
      "@type": "Person",
      name: author || "익명",
      url: `${SITE_URL}/author`,
    },
    ...(datePublished && { datePublished }),
    dateModified: dateModified || datePublished,
    url,
    ...(image && {
      image: [
        {
          "@type": "ImageObject",
          url: image,
          width: 1200,
          height: 630,
        },
      ],
    }),
    publisher: {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/icon.png`,
        width: 512,
        height: 512,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    isAccessibleForFree: true,
    isFamilyFriendly: true,
    ...(tags.length > 0 && { keywords: tags.join(", "), articleSection: tags[0] }),
    inLanguage: "ko-KR",
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["h1", ".subheadline", ".article-body-content p:first-of-type"],
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// BreadcrumbList: 검색 결과에 경로 표시 (게시글에서 사용)
interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbSchemaProps {
  items: BreadcrumbItem[];
}

export function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Person: 작성자 페이지 E-E-A-T 강화
interface PersonSchemaProps {
  name: string;
  description?: string;
  url?: string;
  sameAs?: string[];
}

export function PersonSchema({ name, description, url, sameAs = [] }: PersonSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    url: url || `${SITE_URL}/author`,
    ...(description && { description }),
    ...(sameAs.length > 0 && { sameAs }),
    worksFor: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// FAQPage: 법률 Q&A 콘텐츠 리치 결과
interface FAQItem {
  question: string;
  answer: string;
}

export function FAQSchema({ items }: { items: FAQItem[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// CollectionPage: 태그/카테고리 페이지 주제 권위 강화
interface CollectionPageSchemaProps {
  name: string;
  description?: string;
  url: string;
  items: Array<{ name: string; url: string }>;
}

export function CollectionPageSchema({ name, description, url, items }: CollectionPageSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    url,
    ...(description && { description }),
    hasPart: items.map((item) => ({
      "@type": "BlogPosting",
      headline: item.name,
      url: item.url,
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ItemList: 글 목록 페이지 AEO 최적화 (Google/Bing이 목록 인식)
interface ItemListSchemaProps {
  items: Array<{ name: string; url: string; description?: string; image?: string; datePublished?: string }>;
  name?: string;
  description?: string;
}

export function ItemListSchema({ items, name = "법률 분석 글 목록", description }: ItemListSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    ...(description && { description }),
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: item.url,
      name: item.name,
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Homepage Breadcrumb: 메인페이지용 간단한 브레드크럼
export function HomepageBreadcrumbSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "홈",
        item: SITE_URL,
      },
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Question Schema: 질문 카드용 구조화된 데이터
interface QuestionSchemaProps {
  question: string;
  answer: string;
  author?: string;
  upvoteCount?: number;
}

export function QuestionSchema({ question, answer, author, upvoteCount = 0 }: QuestionSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Question",
    name: question,
    text: question,
    answerCount: 1,
    upvoteCount,
    acceptedAnswer: {
      "@type": "Answer",
      text: answer,
      author: author ? {
        "@type": "Person",
        name: author,
      } : undefined,
      dateCreated: new Date().toISOString(),
      upvoteCount,
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
