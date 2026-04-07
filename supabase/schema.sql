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
  scheduled_for     timestamptz not null,
  sent_at           timestamptz,
  status            text default 'pending',
  ses_message_id    text
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

-- Indexes
create index on send_queue(status, scheduled_for);
create index on email_events(send_queue_id, event_type);
create index on contacts(email);
