-- Contacts
create table contacts (
  id           uuid primary key default gen_random_uuid(),
  email        text not null unique,
  first_name   text,
  source       text,
  tags         text[] default '{}',
  created_at   timestamptz default now()
);

-- Sequences
create table sequences (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  is_active    boolean default true,
  created_at   timestamptz default now()
);

-- Steps
create table sequence_steps (
  id            uuid primary key default gen_random_uuid(),
  sequence_id   uuid references sequences(id) on delete cascade,
  position      integer not null,
  delay_days    integer not null default 0,
  subject       text not null,
  html_body     text not null,
  created_at    timestamptz default now()
);

-- Enrollments
create table enrollments (
  id               uuid primary key default gen_random_uuid(),
  contact_id       uuid references contacts(id) on delete cascade,
  sequence_id      uuid references sequences(id) on delete cascade,
  current_step     integer default 1,
  enrolled_at      timestamptz default now(),
  completed_at     timestamptz,
  unique(contact_id, sequence_id)
);

-- Send queue
create table send_queue (
  id                uuid primary key default gen_random_uuid(),
  contact_id        uuid references contacts(id) on delete cascade,
  sequence_step_id  uuid references sequence_steps(id) on delete cascade,
  enrollment_id     uuid references enrollments(id) on delete cascade,
  broadcast_id      uuid references broadcasts(id) on delete cascade,
  scheduled_for     timestamptz not null,
  sent_at           timestamptz,
  status            text default 'pending',
  ses_message_id    text,
  error_message     text
);

-- Email events
create table email_events (
  id                uuid primary key default gen_random_uuid(),
  send_queue_id     uuid references send_queue(id) on delete cascade,
  contact_id        uuid references contacts(id) on delete cascade,
  sequence_step_id  uuid references sequence_steps(id),
  event_type        text not null,
  url               text,
  ip                text,
  user_agent        text,
  occurred_at       timestamptz default now()
);

-- AI suggestions
create table ai_suggestions (
  id                uuid primary key default gen_random_uuid(),
  suggestion_type   text not null,
  source_step_id    uuid references sequence_steps(id),
  suggested_subject text,
  suggested_body    text,
  reasoning         text,
  status            text default 'pending',
  created_at        timestamptz default now()
);

-- Tag rules (automation: tag → sequence enrollment)
create table tag_rules (
  id           uuid primary key default gen_random_uuid(),
  tag          text not null,
  sequence_id  uuid not null references sequences(id) on delete cascade,
  is_active    boolean default true,
  created_at   timestamptz default now()
);

-- Unsubscribes (global or per-sequence)
create table unsubscribes (
  id           uuid primary key default gen_random_uuid(),
  contact_id   uuid not null references contacts(id) on delete cascade,
  scope        text not null check (scope in ('global', 'sequence')),
  sequence_id  uuid references sequences(id) on delete cascade,
  created_at   timestamptz default now(),
  constraint unsubscribes_sequence_check check (
    (scope = 'global' and sequence_id is null) or
    (scope = 'sequence' and sequence_id is not null)
  ),
  unique(contact_id, scope, sequence_id)
);

-- Broadcasts (one-shot emails to a segment)
create table broadcasts (
  id                    uuid primary key default gen_random_uuid(),
  subject               text not null,
  html_body             text not null,
  segment_tags_include  text[] default '{}',
  segment_tags_exclude  text[] default '{}',
  status                text default 'draft' check (status in ('draft', 'scheduled', 'sending', 'sent')),
  scheduled_for         timestamptz,
  sent_at               timestamptz,
  total_recipients      integer default 0,
  created_at            timestamptz default now()
);

-- Handoff rules (funnel tool → email tool)
create table handoff_rules (
  id                uuid primary key default gen_random_uuid(),
  tunnel_slug       text not null unique,
  tags_to_apply     text[] default '{}',
  sequence_id       uuid references sequences(id) on delete set null,
  source_tag_prefix text,
  is_active         boolean default true,
  created_at        timestamptz default now()
);

-- Indexes
create index on send_queue(status, scheduled_for);
create index on send_queue(broadcast_id) where broadcast_id is not null;
create index on email_events(send_queue_id, event_type);
create index on contacts(email);
create index on tag_rules(tag, is_active);
create index on unsubscribes(contact_id, scope);
