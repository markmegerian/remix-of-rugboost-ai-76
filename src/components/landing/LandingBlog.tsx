import { Link } from 'react-router-dom';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import { useScrollAnimation, useStaggeredAnimation } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

// Blog posts will be stored in localStorage for standalone deployment
// This allows adding posts via the admin dashboard without a backend
export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  publishedAt: string;
  readTime: number;
  category: string;
  featured: boolean;
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  coverImage?: string;
}

// Default blog posts for initial content
const defaultPosts: BlogPost[] = [
  {
    id: '1',
    slug: 'ai-rug-inspection-guide',
    title: 'The Complete Guide to AI-Powered Rug Inspection',
    excerpt: 'Learn how artificial intelligence is revolutionizing the rug cleaning industry with faster, more accurate inspections.',
    content: '',
    author: 'RugBoost Team',
    publishedAt: '2024-01-15',
    readTime: 8,
    category: 'Technology',
    featured: true,
  },
  {
    id: '2',
    slug: 'pricing-strategies-rug-cleaning',
    title: '5 Pricing Strategies That Increased Revenue by 40%',
    excerpt: 'Discover the pricing techniques that top rug cleaning businesses use to maximize their profit margins.',
    content: '',
    author: 'RugBoost Team',
    publishedAt: '2024-01-10',
    readTime: 6,
    category: 'Business',
    featured: false,
  },
  {
    id: '3',
    slug: 'client-communication-best-practices',
    title: 'How Digital Portals Transform Client Relationships',
    excerpt: 'See how offering clients online access to their jobs leads to higher satisfaction and repeat business.',
    content: '',
    author: 'RugBoost Team',
    publishedAt: '2024-01-05',
    readTime: 5,
    category: 'Customer Success',
    featured: false,
  },
];

// Get posts from localStorage or use defaults
export function getBlogPosts(): BlogPost[] {
  if (typeof window === 'undefined') return defaultPosts;
  const stored = localStorage.getItem('rugboost_blog_posts');
  return stored ? JSON.parse(stored) : defaultPosts;
}

// Save posts to localStorage
export function saveBlogPosts(posts: BlogPost[]) {
  localStorage.setItem('rugboost_blog_posts', JSON.stringify(posts));
}

export default function LandingBlog() {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: postsRef, isVisible: postsVisible, getDelay } = useStaggeredAnimation(3, 150);
  
  const posts = getBlogPosts().slice(0, 3);

  return (
    <section id="blog" className="py-16 md:py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div 
          ref={headerRef}
          className={cn(
            "text-center mb-12 transition-all duration-700 ease-out",
            headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Insights for Rug Professionals
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Tips, strategies, and industry insights to help grow your rug cleaning business.
          </p>
        </div>

        <div ref={postsRef} className="grid md:grid-cols-3 gap-8">
          {posts.map((post, index) => (
            <article
              key={post.id}
              className={cn(
                "group bg-card rounded-2xl border border-border shadow-card overflow-hidden transition-all duration-700 ease-out hover:shadow-medium",
                postsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )}
              style={postsVisible ? getDelay(index) : {}}
            >
              {/* Cover image */}
              {post.coverImage ? (
                <div className="aspect-[16/9] overflow-hidden">
                  <img 
                    src={post.coverImage} 
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ) : (
                <div className="aspect-[16/9] bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                  <span className="text-4xl opacity-30">📰</span>
                </div>
              )}

              <div className="p-6">
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(post.publishedAt).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {post.readTime} min read
                  </span>
                </div>

                <h3 className="font-display text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {post.title}
                </h3>

                <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                  {post.excerpt}
                </p>

                <Link 
                  to={`/blog/${post.slug}`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  Read more
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div className={cn(
          "mt-12 text-center transition-all duration-700 delay-500",
          postsVisible ? "opacity-100" : "opacity-0"
        )}>
          <Link 
            to="/blog"
            className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
          >
            View all articles
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
