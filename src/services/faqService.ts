/**
 * FAQ Service
 * Handles FAQ articles, search functionality, and category management
 */

export interface FAQArticle {
  id: string;
  title: string;
  content: string;
  category: FAQCategory;
  keywords: string[];
  views: number;
  helpful: number;
  notHelpful: number;
  createdAt: Date;
  updatedAt: Date;
}

export type FAQCategory =
  | "general"
  | "orders"
  | "payments"
  | "shipping"
  | "returns"
  | "account"
  | "technical";

export interface FAQSearchResult extends FAQArticle {
  relevanceScore: number;
}

class FAQService {
  private articles: FAQArticle[] = [];
  private initialized = false;

  /**
   * Initialize FAQ articles
   */
  initialize(): void {
    if (this.initialized) return;

    this.articles = [
      {
        id: "how-to-order",
        title: "How to place an order?",
        content:
          "To place an order: 1) Browse products, 2) Add items to cart, 3) Proceed to checkout, 4) Complete payment. You'll receive a confirmation email once your order is placed.",
        category: "orders",
        keywords: [
          "order",
          "place",
          "purchase",
          "buy",
          "checkout",
          "cart",
          "payment",
        ],
        views: 1250,
        helpful: 98,
        notHelpful: 5,
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2024-01-15"),
      },
      {
        id: "payment-methods",
        title: "What payment methods do you accept?",
        content:
          "We accept all major credit cards (Visa, MasterCard, American Express), PayPal, Apple Pay, and Google Pay. All payments are processed securely.",
        category: "payments",
        keywords: [
          "payment",
          "credit card",
          "paypal",
          "apple pay",
          "google pay",
          "visa",
          "mastercard",
        ],
        views: 890,
        helpful: 85,
        notHelpful: 3,
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2024-01-10"),
      },
      {
        id: "shipping-time",
        title: "How long does shipping take?",
        content:
          "Standard shipping takes 3-5 business days. Express shipping takes 1-2 business days. You'll receive tracking information via email once your order ships.",
        category: "shipping",
        keywords: [
          "shipping",
          "delivery",
          "tracking",
          "standard",
          "express",
          "time",
          "how long",
        ],
        views: 2100,
        helpful: 145,
        notHelpful: 8,
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2024-01-12"),
      },
      {
        id: "return-policy",
        title: "What is your return policy?",
        content:
          "We offer a 30-day return policy. Items must be in original condition. Contact our support team to initiate a return. Refunds are processed within 5-7 business days.",
        category: "returns",
        keywords: [
          "return",
          "refund",
          "policy",
          "30 days",
          "original condition",
          "money back",
        ],
        views: 780,
        helpful: 72,
        notHelpful: 4,
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2024-01-08"),
      },
      {
        id: "account-issues",
        title: "I'm having trouble with my account",
        content:
          "For account issues: 1) Try resetting your password, 2) Clear your app cache, 3) Update the app to the latest version. If problems persist, contact our support team.",
        category: "account",
        keywords: [
          "account",
          "login",
          "password",
          "reset",
          "cache",
          "update",
          "trouble",
          "problems",
        ],
        views: 650,
        helpful: 55,
        notHelpful: 12,
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2024-01-05"),
      },
      {
        id: "technical-support",
        title: "App is not working properly",
        content:
          "Try these steps: 1) Close and reopen the app, 2) Check your internet connection, 3) Update to the latest app version, 4) Restart your device. Contact support if issues continue.",
        category: "technical",
        keywords: [
          "app",
          "not working",
          "crash",
          "bug",
          "technical",
          "restart",
          "update",
          "internet",
        ],
        views: 1200,
        helpful: 89,
        notHelpful: 15,
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2024-01-20"),
      },
      {
        id: "guest-checkout",
        title: "Can I checkout as a guest?",
        content:
          "Yes! You can checkout as a guest without creating an account. However, creating an account allows you to track orders, save favorites, and have a faster checkout experience.",
        category: "orders",
        keywords: [
          "guest",
          "checkout",
          "account",
          "register",
          "create account",
          "faster",
        ],
        views: 420,
        helpful: 38,
        notHelpful: 2,
        createdAt: new Date("2023-02-15"),
        updatedAt: new Date("2024-01-18"),
      },
      {
        id: "order-tracking",
        title: "How can I track my order?",
        content:
          'Once your order ships, you\'ll receive an email with tracking information. You can also check your order status in the app under "Profile" > "Order History".',
        category: "orders",
        keywords: [
          "track",
          "tracking",
          "order status",
          "shipped",
          "email",
          "order history",
        ],
        views: 1800,
        helpful: 156,
        notHelpful: 6,
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2024-01-16"),
      },
      {
        id: "cancel-order",
        title: "How do I cancel my order?",
        content:
          'You can cancel your order within 1 hour of placing it. Go to "Profile" > "Order History" and select "Cancel Order". After 1 hour, please contact support for assistance.',
        category: "orders",
        keywords: [
          "cancel",
          "cancellation",
          "order",
          "within 1 hour",
          "support",
        ],
        views: 950,
        helpful: 78,
        notHelpful: 9,
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2024-01-14"),
      },
      {
        id: "promo-codes",
        title: "How do I use promo codes?",
        content:
          'Enter your promo code at checkout in the "Promo Code" field before completing payment. The discount will be applied automatically if the code is valid.',
        category: "payments",
        keywords: [
          "promo code",
          "discount",
          "coupon",
          "checkout",
          "code",
          "offer",
        ],
        views: 1350,
        helpful: 112,
        notHelpful: 7,
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2024-01-11"),
      },
    ];

    this.initialized = true;
  }

  /**
   * Get all FAQ articles
   */
  getAllArticles(): FAQArticle[] {
    this.initialize();
    return [...this.articles];
  }

  /**
   * Get articles by category
   */
  getArticlesByCategory(category: FAQCategory): FAQArticle[] {
    this.initialize();
    return this.articles.filter((article) => article.category === category);
  }

  /**
   * Search FAQ articles
   */
  searchArticles(query: string, limit: number = 10): FAQSearchResult[] {
    this.initialize();
    if (!query.trim()) {
      return [];
    }

    const searchTerms = query
      .toLowerCase()
      .split(" ")
      .filter((term) => term.length > 2);

    const results: FAQSearchResult[] = this.articles
      .map((article) => {
        let relevanceScore = 0;

        // Search in title (higher weight)
        const titleMatches = searchTerms.filter((term) =>
          article.title.toLowerCase().includes(term)
        );
        relevanceScore += titleMatches.length * 3;

        // Search in content (medium weight)
        const contentMatches = searchTerms.filter((term) =>
          article.content.toLowerCase().includes(term)
        );
        relevanceScore += contentMatches.length * 2;

        // Search in keywords (highest weight)
        const keywordMatches = searchTerms.filter((term) =>
          article.keywords.some((keyword) =>
            keyword.toLowerCase().includes(term)
          )
        );
        relevanceScore += keywordMatches.length * 4;

        // Bonus for popular articles
        relevanceScore += (article.helpful / 100) * 0.5;

        return {
          ...article,
          relevanceScore,
        };
      })
      .filter((result) => result.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);

    return results;
  }

  /**
   * Get article by ID
   */
  getArticleById(id: string): FAQArticle | null {
    this.initialize();
    return this.articles.find((article) => article.id === id) || null;
  }

  /**
   * Get popular articles (most helpful)
   */
  getPopularArticles(limit: number = 5): FAQArticle[] {
    this.initialize();
    return [...this.articles]
      .sort((a, b) => b.helpful - a.helpful)
      .slice(0, limit);
  }

  /**
   * Get recent articles
   */
  getRecentArticles(limit: number = 5): FAQArticle[] {
    this.initialize();
    return [...this.articles]
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, limit);
  }

  /**
   * Get suggested articles based on keywords
   */
  getSuggestedArticles(keywords: string[], limit: number = 3): FAQArticle[] {
    this.initialize();

    const suggestions = this.articles
      .map((article) => {
        const matchCount = keywords.filter((keyword) =>
          article.keywords.some((articleKeyword) =>
            articleKeyword.toLowerCase().includes(keyword.toLowerCase())
          )
        ).length;

        return { article, matchCount };
      })
      .filter((item) => item.matchCount > 0)
      .sort((a, b) => b.matchCount - a.matchCount)
      .slice(0, limit)
      .map((item) => item.article);

    return suggestions;
  }

  /**
   * Mark article as helpful
   */
  markAsHelpful(articleId: string): void {
    const article = this.articles.find((a) => a.id === articleId);
    if (article) {
      article.helpful++;
    }
  }

  /**
   * Mark article as not helpful
   */
  markAsNotHelpful(articleId: string): void {
    const article = this.articles.find((a) => a.id === articleId);
    if (article) {
      article.notHelpful++;
    }
  }

  /**
   * Increment article views
   */
  incrementViews(articleId: string): void {
    const article = this.articles.find((a) => a.id === articleId);
    if (article) {
      article.views++;
    }
  }

  /**
   * Get FAQ categories
   */
  getCategories(): Array<{ category: FAQCategory; count: number }> {
    this.initialize();

    const categories = [
      "general",
      "orders",
      "payments",
      "shipping",
      "returns",
      "account",
      "technical",
    ] as FAQCategory[];

    return categories.map((category) => ({
      category,
      count: this.articles.filter((article) => article.category === category)
        .length,
    }));
  }

  /**
   * Get chat bot suggestions based on common queries
   */
  getBotSuggestions(query?: string): FAQArticle[] {
    this.initialize();

    if (query) {
      return this.searchArticles(query, 3);
    }

    // Return most popular articles as default suggestions
    return this.getPopularArticles(3);
  }
}

// Export singleton instance
export const faqService = new FAQService();
export default faqService;
