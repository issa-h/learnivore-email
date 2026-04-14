export interface Contact {
  id: string
  email: string
  first_name: string | null
  source: string | null
  tags: string[]
  utms: string[]
  created_at: string
}

export interface Sequence {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
}

export interface SequenceStep {
  id: string
  sequence_id: string
  position: number
  delay_days: number
  subject: string
  html_body: string
  created_at: string
}

export interface Enrollment {
  id: string
  contact_id: string
  sequence_id: string
  current_step: number
  enrolled_at: string
  completed_at: string | null
}

export interface SendQueueItem {
  id: string
  contact_id: string
  sequence_step_id: string
  enrollment_id: string
  scheduled_for: string
  sent_at: string | null
  status: 'pending' | 'sent' | 'failed'
  ses_message_id: string | null
}

export interface EmailEvent {
  id: string
  send_queue_id: string
  contact_id: string
  sequence_step_id: string
  event_type: 'open' | 'click'
  url: string | null
  occurred_at: string
  ip: string | null
  user_agent: string | null
}

export interface AiSuggestion {
  id: string
  suggestion_type: 'resend' | 'new_email'
  source_step_id: string | null
  suggested_subject: string | null
  suggested_body: string | null
  reasoning: string | null
  status: 'pending' | 'approved' | 'dismissed'
  created_at: string
}

export interface TagRule {
  id: string
  tag: string
  sequence_id: string
  is_active: boolean
  created_at: string
}
