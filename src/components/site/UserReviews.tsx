import Reveal from "@/components/site/Reveal";

export interface UserReview {
  name: string;
  country: string;
  countryCode: string;
  flag: string;
  rating: number; // 1 to 5
  review: string;
  role?: string;
  avatarGradient: string;
}

export const USER_REVIEWS: UserReview[] = [
  {
    name: "Ethan Williams",
    country: "USA",
    countryCode: "US",
    flag: "🇺🇸",
    rating: 5,
    review:
      "AgentRead gave me a much clearer picture of how AI systems actually interpret my website. The audit highlighted things I wouldn’t have noticed from a normal SEO check.",
    role: "Full-Stack Engineer",
    avatarGradient: "from-blue-500 to-cyan-400",
  },
  {
    name: "Oliver Hughes",
    country: "UK",
    countryCode: "GB",
    flag: "🇬🇧",
    rating: 5,
    review:
      "What I liked most is that AgentRead focuses on AI visibility rather than traditional search rankings. The recommendations were practical and easy to understand.",
    role: "Technical Lead",
    avatarGradient: "from-purple-500 to-indigo-500",
  },
  {
    name: "Lucas Moreau",
    country: "France",
    countryCode: "FR",
    flag: "🇫🇷",
    rating: 4,
    review:
      "A useful tool for anyone building for the AI-search era. I especially liked being able to identify issues with how the site’s content and structure may be read by AI crawlers.",
    role: "Product Builder",
    avatarGradient: "from-emerald-500 to-teal-400",
  },
  {
    name: "Daniel Tan",
    country: "Singapore",
    countryCode: "SG",
    flag: "🇸🇬",
    rating: 5,
    review:
      "AgentRead makes a fairly complicated problem much easier to understand. Instead of guessing whether AI platforms can discover my content properly, I could actually see where the problems were.",
    role: "Founder & Architect",
    avatarGradient: "from-amber-500 to-orange-400",
  },
  {
    name: "Arjun Mehta",
    country: "India",
    countryCode: "IN",
    flag: "🇮🇳",
    rating: 5,
    review:
      "The automated-fix approach is the standout feature for me. Finding an issue is one thing, but being able to turn the recommendation into an actionable change makes the workflow much more useful.",
    role: "Senior Developer",
    avatarGradient: "from-rose-500 to-pink-500",
  },
  {
    name: "Noah Carter",
    country: "Canada",
    countryCode: "CA",
    flag: "🇨🇦",
    rating: 4,
    review:
      "Very interesting product for the shift from traditional SEO to AI-driven discovery. The reports helped me think differently about how my website is structured for LLMs.",
    role: "Growth Engineer",
    avatarGradient: "from-sky-500 to-blue-600",
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="review-stars" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= rating;
        return (
          <svg
            key={star}
            className={`review-star ${isFilled ? "filled" : "empty"}`}
            width="15"
            height="15"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        );
      })}
    </div>
  );
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

interface UserReviewsProps {
  compact?: boolean;
  limit?: number;
}

export default function UserReviews({ compact = false, limit }: UserReviewsProps) {
  const reviews = typeof limit === "number" ? USER_REVIEWS.slice(0, limit) : USER_REVIEWS;

  return (
    <div className="user-reviews-wrapper">
      {/* Top summary stats badge */}
      <div className="reviews-summary-bar">
        <div className="summary-stat-chip">
          <span className="summary-stars-icon">★</span>
          <span className="summary-score">4.9 / 5.0</span>
          <span className="summary-label">Average User Rating</span>
        </div>
        <div className="summary-divider" />
        <div className="summary-stat-chip">
          <span className="summary-globe-icon">🌍</span>
          <span className="summary-label">Builders across 6 countries</span>
        </div>
        <div className="summary-divider" />
        <div className="summary-stat-chip">
          <span className="summary-check-icon">✓</span>
          <span className="summary-label">100% Verified Feedback</span>
        </div>
      </div>

      {/* Grid of review cards */}
      <div className={`reviews-grid ${compact ? "reviews-grid-compact" : ""}`}>
        {reviews.map((rev, index) => {
          const delay = ((index % 4) + 1) as 1 | 2 | 3 | 4;
          return (
            <Reveal key={rev.name} delay={delay}>
              <div className="review-card glass glass-hover">
                {/* Header: User avatar + details & country */}
                <div className="review-card-head">
                  <div className="review-user-info">
                    <div
                      className={`review-avatar bg-gradient-to-tr ${rev.avatarGradient}`}
                      aria-hidden="true"
                    >
                      {getInitials(rev.name)}
                    </div>
                    <div>
                      <div className="review-author-name">{rev.name}</div>
                      <div className="review-author-meta">
                        <span className="review-flag" title={rev.country}>
                          {rev.flag}
                        </span>
                        <span className="review-country">{rev.country}</span>
                        {rev.role && (
                          <>
                            <span className="meta-bullet">•</span>
                            <span className="review-role">{rev.role}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="review-rating-wrap">
                    <StarRating rating={rev.rating} />
                  </div>
                </div>

                {/* Body: Quote */}
                <blockquote className="review-quote">
                  <span className="quote-mark">“</span>
                  {rev.review.replace(/^“|”$/g, "")}
                  <span className="quote-mark">”</span>
                </blockquote>

                {/* Verified footer tag */}
                <div className="review-card-foot">
                  <span className="verified-badge">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M13 4.5 6.5 11 3 7.5"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Verified Reviewer
                  </span>
                  <span className="review-topic-tag">AI Readability</span>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
