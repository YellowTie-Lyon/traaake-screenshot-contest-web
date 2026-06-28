-- Environments
insert into environments (id, name, label, is_active) values
  ('11111111-1111-1111-1111-111111111111', 'test', 'Test', true),
  ('22222222-2222-2222-2222-222222222222', 'production', 'Production', false);

-- Default settings for each environment
insert into contest_settings (environment_id, announcement_message) values
  ('11111111-1111-1111-1111-111111111111', '🏆 [TEST] Le concours screenshot de la semaine est ouvert !'),
  ('22222222-2222-2222-2222-222222222222', '🏆 Le concours screenshot de la semaine est ouvert ! Partagez vos plus belles captures MSFS.');

-- Active season
insert into seasons (id, name, starts_at, ends_at, is_active) values
  ('33333333-3333-3333-3333-333333333333', 'Saison 2026', '2026-01-01T00:00:00Z', '2026-12-31T23:59:59Z', true);

-- Draft contest in test environment
insert into contests (environment_id, season_id, status, title) values
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'draft', 'Concours Semaine 25 · Golden Hour');
