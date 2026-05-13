// Auto-generated types matching the database schema in 001_initial_schema.sql

export type Role = 'owner' | 'admin' | 'staff' | 'artist'
export type ArtistStatus = 'pending_review' | 'approved' | 'rejected' | 'inactive' | 'flagged'
export type ArtistGender = 'male' | 'female' | 'other'
export type RequirementGender = 'male' | 'female' | 'any'
export type EnergyLevel = 'high' | 'medium' | 'low' | 'uncertain'
export type ArtistType = 'headliner' | 'konferansier' | 'klubbkomiker' | 'open_mic'
export type AiStatus = 'pending' | 'completed' | 'failed'
export type AiConfidence = 'low' | 'medium' | 'high'
export type ShowStatus = 'draft' | 'booking' | 'fullbooked' | 'published' | 'completed' | 'cancelled'
export type RequirementEnergy = 'high' | 'low' | 'any' | 'uncertain'
export type BookingOfferStatus = 'sent' | 'accepted' | 'declined' | 'expired' | 'filled_by_other' | 'cancelled'
export type ConfirmedSpotStatus = 'confirmed' | 'cancelled' | 'completed' | 'paid'
export type OrderStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled'
export type TicketStatus = 'valid' | 'used' | 'refunded' | 'cancelled'
export type PayoutStatus = 'pending' | 'approved' | 'paid' | 'cancelled'
export type InvoiceStatus = 'draft' | 'submitted' | 'approved' | 'paid' | 'rejected'
export type TrackingEventStatus = 'pending' | 'sent' | 'failed'
export type EmailLogStatus = 'pending' | 'sent' | 'failed'
export type MarketingTaskKey =
  | 'publish_event_page'
  | 'activate_ticket_sales'
  | 'upload_poster'
  | 'create_facebook_event'
  | 'share_facebook_groups'
  | 'send_calendar_partners'
  | 'schedule_email'

// ─────────────────────────────────────────────────────────────
// Row types
// ─────────────────────────────────────────────────────────────

export type Profile = {
  id: string
  auth_user_id: string
  email: string
  full_name: string | null
  role: Role
  created_at: string
  updated_at: string
}

export type Artist = {
  id: string
  auth_user_id: string | null
  full_name: string
  stage_name: string | null
  email: string
  phone: string | null
  profile_image_url: string | null
  bio: string | null
  category: string | null
  language: string | null
  social_links: Record<string, string> | null
  consent_ai_research: boolean
  gender: ArtistGender | null
  status: ArtistStatus
  admin_score: number | null
  admin_energy_level: EnergyLevel | null
  admin_type: ArtistType[] | null
  admin_tags: string[] | null
  admin_notes: string | null
  is_flagged: boolean
  flag_reason: string | null
  flagged_at: string | null
  created_at: string
  updated_at: string
}

export type ArtistAiAssessment = {
  id: string
  artist_id: string
  ai_score_suggestion: number | null
  ai_energy_suggestion: EnergyLevel | null
  ai_experience_level: string | null
  ai_confidence: AiConfidence | null
  ai_tags_suggestion: string[] | null
  ai_summary: string | null
  ai_reasoning: string | null
  ai_uncertainties: string | null
  ai_sources: unknown | null
  ai_status: AiStatus
  ai_last_checked_at: string | null
  created_at: string
  updated_at: string
}

export type ArtistAvailability = {
  id: string
  artist_id: string
  available_date: string
  created_at: string
}

export type Show = {
  id: string
  title: string
  slug: string
  description: string | null
  date: string
  start_time: string | null
  end_time: string | null
  venue_name: string | null
  venue_address: string | null
  capacity: number | null
  ticket_price: number | null
  currency: string
  ticket_url: string | null
  poster_url: string | null
  status: ShowStatus
  stripe_product_id: string | null
  stripe_price_id: string | null
  is_template: boolean
  published_at: string | null
  created_at: string
  updated_at: string
}

export type ShowRequirement = {
  id: string
  show_id: string
  role_name: string
  quantity: number
  min_score: number | null
  energy_level: RequirementEnergy
  required_gender: RequirementGender
  required_tags: string[] | null
  created_at: string
  updated_at: string
}

export type BookingOffer = {
  id: string
  show_id: string
  artist_id: string
  show_requirement_id: string
  token: string
  status: BookingOfferStatus
  fee_amount: number | null
  currency: string
  sent_at: string | null
  responded_at: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

export type ConfirmedSpot = {
  id: string
  show_id: string
  artist_id: string
  show_requirement_id: string
  booking_offer_id: string | null
  fee_amount: number | null
  currency: string
  status: ConfirmedSpotStatus
  confirmed_at: string | null
  cancelled_at: string | null
  created_at: string
  updated_at: string
}

export type Customer = {
  id: string
  email: string
  name: string | null
  phone: string | null
  marketing_consent: boolean
  stripe_customer_id: string | null
  created_at: string
  updated_at: string
}

export type Order = {
  id: string
  show_id: string | null
  customer_id: string | null
  stripe_checkout_session_id: string | null
  stripe_payment_intent_id: string | null
  stripe_customer_id: string | null
  amount_total: number | null
  currency: string
  status: OrderStatus
  buyer_email: string | null
  buyer_name: string | null
  created_at: string
  updated_at: string
}

export type Ticket = {
  id: string
  show_id: string
  order_id: string
  customer_id: string | null
  ticket_code: string
  status: TicketStatus
  checked_in_at: string | null
  created_at: string
  updated_at: string
}

export type ArtistPayout = {
  id: string
  artist_id: string
  confirmed_spot_id: string | null
  show_id: string | null
  amount: number
  currency: string
  status: PayoutStatus
  payout_method: string | null
  payout_reference: string | null
  notes: string | null
  created_at: string
  updated_at: string
  paid_at: string | null
}

export type ArtistInvoice = {
  id: string
  artist_id: string
  show_id: string | null
  confirmed_spot_id: string | null
  invoice_number: string | null
  amount: number | null
  currency: string
  status: InvoiceStatus
  file_url: string | null
  created_at: string
  updated_at: string
  submitted_at: string | null
  approved_at: string | null
  paid_at: string | null
}

export type TrackingEvent = {
  id: string
  show_id: string | null
  event_name: string | null
  event_id: string | null
  event_source_url: string | null
  payload: unknown | null
  status: TrackingEventStatus
  created_at: string
  sent_at: string | null
}

export type EmailLog = {
  id: string
  recipient_email: string
  subject: string | null
  template_name: string | null
  resend_email_id: string | null
  status: EmailLogStatus
  error_message: string | null
  payload: unknown | null
  created_at: string
  sent_at: string | null
}

export type MarketingTask = {
  id: string
  show_id: string
  task_key: MarketingTaskKey | null
  label: string | null
  is_completed: boolean
  created_at: string
  updated_at: string
}

// ─────────────────────────────────────────────────────────────
// Supabase Database generic type (supabase-js v2 format)
// Fields with DB defaults are optional in Insert, all optional in Update.
// ─────────────────────────────────────────────────────────────
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: {
          id?: string
          auth_user_id: string
          email: string
          full_name?: string | null
          role?: Role
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Profile>
        Relationships: []
      }
      artists: {
        Row: Artist
        Insert: {
          id?: string
          auth_user_id?: string | null
          full_name: string
          stage_name?: string | null
          email: string
          phone?: string | null
          profile_image_url?: string | null
          bio?: string | null
          category?: string | null
          language?: string | null
          social_links?: Record<string, string> | null
          consent_ai_research?: boolean
          status?: ArtistStatus
          admin_score?: number | null
          admin_energy_level?: EnergyLevel | null
          admin_tags?: string[] | null
          admin_notes?: string | null
          is_flagged?: boolean
          flag_reason?: string | null
          flagged_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Artist>
        Relationships: []
      }
      artist_ai_assessments: {
        Row: ArtistAiAssessment
        Insert: {
          id?: string
          artist_id: string
          ai_score_suggestion?: number | null
          ai_energy_suggestion?: EnergyLevel | null
          ai_experience_level?: string | null
          ai_confidence?: AiConfidence | null
          ai_tags_suggestion?: string[] | null
          ai_summary?: string | null
          ai_reasoning?: string | null
          ai_uncertainties?: string | null
          ai_sources?: unknown | null
          ai_status?: AiStatus
          ai_last_checked_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<ArtistAiAssessment>
        Relationships: []
      }
      artist_availability: {
        Row: ArtistAvailability
        Insert: {
          id?: string
          artist_id: string
          available_date: string
          created_at?: string
        }
        Update: Partial<ArtistAvailability>
        Relationships: []
      }
      shows: {
        Row: Show
        Insert: {
          id?: string
          title: string
          slug: string
          description?: string | null
          date: string
          start_time?: string | null
          end_time?: string | null
          venue_name?: string | null
          venue_address?: string | null
          capacity?: number | null
          ticket_price?: number | null
          currency?: string
          ticket_url?: string | null
          poster_url?: string | null
          status?: ShowStatus
          stripe_product_id?: string | null
          stripe_price_id?: string | null
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Show>
        Relationships: []
      }
      show_requirements: {
        Row: ShowRequirement
        Insert: {
          id?: string
          show_id: string
          role_name: string
          quantity: number
          min_score?: number | null
          energy_level?: RequirementEnergy
          required_gender?: RequirementGender
          required_tags?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<ShowRequirement>
        Relationships: []
      }
      booking_offers: {
        Row: BookingOffer
        Insert: {
          id?: string
          show_id: string
          artist_id: string
          show_requirement_id: string
          token?: string
          status?: BookingOfferStatus
          fee_amount?: number | null
          currency?: string
          sent_at?: string | null
          responded_at?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<BookingOffer>
        Relationships: []
      }
      confirmed_spots: {
        Row: ConfirmedSpot
        Insert: {
          id?: string
          show_id: string
          artist_id: string
          show_requirement_id: string
          booking_offer_id?: string | null
          fee_amount?: number | null
          currency?: string
          status?: ConfirmedSpotStatus
          confirmed_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<ConfirmedSpot>
        Relationships: []
      }
      customers: {
        Row: Customer
        Insert: {
          id?: string
          email: string
          name?: string | null
          phone?: string | null
          marketing_consent?: boolean
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Customer>
        Relationships: []
      }
      orders: {
        Row: Order
        Insert: {
          id?: string
          show_id?: string | null
          customer_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_customer_id?: string | null
          amount_total?: number | null
          currency?: string
          status?: OrderStatus
          buyer_email?: string | null
          buyer_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Order>
        Relationships: []
      }
      tickets: {
        Row: Ticket
        Insert: {
          id?: string
          show_id: string
          order_id: string
          customer_id?: string | null
          ticket_code?: string
          status?: TicketStatus
          checked_in_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Ticket>
        Relationships: []
      }
      artist_payouts: {
        Row: ArtistPayout
        Insert: {
          id?: string
          artist_id: string
          confirmed_spot_id?: string | null
          show_id?: string | null
          amount: number
          currency?: string
          status?: PayoutStatus
          payout_method?: string | null
          payout_reference?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          paid_at?: string | null
        }
        Update: Partial<ArtistPayout>
        Relationships: []
      }
      artist_invoices: {
        Row: ArtistInvoice
        Insert: {
          id?: string
          artist_id: string
          show_id?: string | null
          confirmed_spot_id?: string | null
          invoice_number?: string | null
          amount?: number | null
          currency?: string
          status?: InvoiceStatus
          file_url?: string | null
          created_at?: string
          updated_at?: string
          submitted_at?: string | null
          approved_at?: string | null
          paid_at?: string | null
        }
        Update: Partial<ArtistInvoice>
        Relationships: []
      }
      tracking_events: {
        Row: TrackingEvent
        Insert: {
          id?: string
          show_id?: string | null
          event_name?: string | null
          event_id?: string | null
          event_source_url?: string | null
          payload?: unknown | null
          status?: TrackingEventStatus
          created_at?: string
          sent_at?: string | null
        }
        Update: Partial<TrackingEvent>
        Relationships: []
      }
      email_logs: {
        Row: EmailLog
        Insert: {
          id?: string
          recipient_email: string
          subject?: string | null
          template_name?: string | null
          resend_email_id?: string | null
          status?: EmailLogStatus
          error_message?: string | null
          payload?: unknown | null
          created_at?: string
          sent_at?: string | null
        }
        Update: Partial<EmailLog>
        Relationships: []
      }
      marketing_tasks: {
        Row: MarketingTask
        Insert: {
          id?: string
          show_id: string
          task_key?: MarketingTaskKey | null
          label?: string | null
          is_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<MarketingTask>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      accept_booking_offer: {
        Args: { p_token: string }
        Returns: {
          result: 'accepted' | 'filled_by_other' | 'already_booked' | 'declined' | 'expired' | 'cancelled'
          offer_id: string
          show_id: string
          artist_id: string
          show_requirement_id: string
          confirmed_spot_id: string | null
          should_notify: boolean
        }[]
      }
      complete_checkout_order: {
        Args: {
          p_show_id: string
          p_session_id: string
          p_payment_intent_id?: string | null
          p_stripe_customer_id?: string | null
          p_amount_total?: number | null
          p_currency?: string | null
          p_buyer_email?: string | null
          p_buyer_name?: string | null
        }
        Returns: {
          result: 'created' | 'duplicate' | 'sold_out' | 'invalid_show'
          order_id: string
          ticket_code: string | null
          duplicate: boolean
        }[]
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
