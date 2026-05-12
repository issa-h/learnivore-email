-- V2 Foundations: unsubscribes, broadcasts, handoff_rules + send_queue extensions

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

create index on unsubscribes(contact_id, scope);

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

-- Extend send_queue
alter table send_queue add column if not exists error_message text;
alter table send_queue add column if not exists broadcast_id uuid references broadcasts(id) on delete cascade;

-- Make enrollment_id and sequence_step_id nullable (broadcasts don't have them)
alter table send_queue alter column enrollment_id drop not null;
alter table send_queue alter column sequence_step_id drop not null;

-- Index for broadcast sends
create index on send_queue(broadcast_id) where broadcast_id is not null;
