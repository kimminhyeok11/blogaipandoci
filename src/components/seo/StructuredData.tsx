const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://lawtiphub.com";
const SITE_NAME = "法 BLOG";
const SITE_DESC = "법률, 기술, 비즈니스에 관한 깊이 있는 분석과 인사이트를 제공하는 블로그";

// Organization: 사이트 정체성, 지식 패널 노출
export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon.png`,
    description: SITE_DESC,
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
}: ArticleSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title.slice(0, 110),
    ...(description && { description }),
    author: {
      "@type": "Person",
      name: author || "익명",
      ...(authorId && { url: `${SITE_URL}/profile` }),
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
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/icon.png`,
        width: 512,
        height: 512,
      },
    },
    ...(tags.length > 0 && { keywords: tags.join(", ") }),
    inLanguage: "ko",
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
