-- Add category to jerseys so shorts and socks can be tracked separately
alter table jerseys
  add column if not exists category text not null default 'jersey'
  check (category in ('jersey', 'shorts', 'socks'));
