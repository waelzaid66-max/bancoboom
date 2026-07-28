import { BookingStaysApp } from "@/components/search/BookingStaysApp";

/**
 * Booking & Stays — a dedicated Booking.com-style stays experience. It replaces
 * the generic scoped-search body with rental-term tabs as the primary
 * segmentation and Booking.com-style stay cards, while still being driven by the
 * section search engine (real_estate + rent). Term tabs are auto-populated from
 * the selected market's real rental taxonomy (EG: daily / new-law / old-law;
 * Gulf: daily / annual) so the page never invents terms the market's law lacks.
 */
export default function BookingSectionScreen() {
  return <BookingStaysApp />;
}
